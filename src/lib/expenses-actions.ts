"use server";

import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expense, expenseSplit, groupMember, user } from "@/lib/schema";
import {
	createExpenseInputSchema,
	createSettlementInputSchema,
	updateExpenseInputSchema,
} from "@/lib/expenses-schema";
import { isGroupMember } from "@/lib/groups";
import { and } from "drizzle-orm";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		throw new Error("Not authenticated");
	}
	return session;
}

/**
 * Returns true if every user id is a member of the given group.
 */
async function allUsersInGroup(
	groupId: string,
	userIds: string[],
): Promise<boolean> {
	if (userIds.length === 0) return true;
	const rows = await db
		.select({ userId: groupMember.userId })
		.from(groupMember)
		.where(
			and(
				eq(groupMember.groupId, groupId),
				inArray(groupMember.userId, userIds),
			),
		);
	return rows.length === userIds.length;
}

export async function createExpenseAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = createExpenseInputSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Invalid input",
		};
	}
	const data = parsed.data;

	// Caller must be a member of the target group.
	if (!(await isGroupMember(session.user.id, data.groupId))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	// All referenced users (payer + participants) must also be members.
	const userIds = Array.from(
		new Set([data.paidByUserId, ...data.splits.map((s) => s.userId)]),
	);
	const existingUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.id, userIds));
	if (existingUsers.length !== userIds.length) {
		return { ok: false, error: "One or more selected users do not exist" };
	}
	if (!(await allUsersInGroup(data.groupId, userIds))) {
		return {
			ok: false,
			error: "Payer and participants must all be members of the group",
		};
	}

	const now = new Date();
	const expenseId = crypto.randomUUID();

	const inserts = [
		db.insert(expense).values({
			id: expenseId,
			kind: "expense",
			groupId: data.groupId,
			description: data.description,
			amountCents: data.amountCents,
			paidByUserId: data.paidByUserId,
			createdAt: data.transactionDate,
			updatedAt: now,
		}),
		...data.splits.map((s) =>
			db.insert(expenseSplit).values({
				id: crypto.randomUUID(),
				expenseId,
				userId: s.userId,
				amountCents: s.amountCents,
			}),
		),
	];

	await db.batch(inserts as [(typeof inserts)[0], ...typeof inserts]);

	revalidatePath("/");
	return { ok: true };
}

export async function updateExpenseAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = updateExpenseInputSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Invalid input",
		};
	}
	const data = parsed.data;

	const target = await db
		.select({ id: expense.id, groupId: expense.groupId })
		.from(expense)
		.where(and(eq(expense.id, data.id), eq(expense.kind, "expense")))
		.limit(1);
	if (target.length === 0) {
		return { ok: false, error: "Expense not found" };
	}
	const groupId = target[0].groupId;
	if (!groupId) {
		return { ok: false, error: "Expense is not attached to a group" };
	}
	if (groupId !== data.groupId) {
		return { ok: false, error: "Expense does not belong to this group" };
	}
	if (!(await isGroupMember(session.user.id, groupId))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	const userIds = Array.from(
		new Set([data.paidByUserId, ...data.splits.map((s) => s.userId)]),
	);
	const existingUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.id, userIds));
	if (existingUsers.length !== userIds.length) {
		return { ok: false, error: "One or more selected users do not exist" };
	}
	if (!(await allUsersInGroup(groupId, userIds))) {
		return {
			ok: false,
			error: "Payer and participants must all be members of the group",
		};
	}

	const now = new Date();
	const updates = [
		db
			.update(expense)
			.set({
				description: data.description,
				amountCents: data.amountCents,
				paidByUserId: data.paidByUserId,
				createdAt: data.transactionDate,
				updatedAt: now,
			})
			.where(eq(expense.id, data.id)),
		db.delete(expenseSplit).where(eq(expenseSplit.expenseId, data.id)),
		...data.splits.map((s) =>
			db.insert(expenseSplit).values({
				id: crypto.randomUUID(),
				expenseId: data.id,
				userId: s.userId,
				amountCents: s.amountCents,
			}),
		),
	];

	await db.batch(updates as [(typeof updates)[0], ...typeof updates]);

	revalidatePath("/");
	return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	if (!id || typeof id !== "string") {
		return { ok: false, error: "Invalid expense id" };
	}

	// Authorization: must be a member of the group the expense belongs to.
	const target = await db
		.select({ id: expense.id, groupId: expense.groupId })
		.from(expense)
		.where(eq(expense.id, id))
		.limit(1);
	if (target.length === 0) {
		return { ok: false, error: "Expense not found" };
	}
	const groupId = target[0].groupId;
	if (groupId && !(await isGroupMember(session.user.id, groupId))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	await db.delete(expense).where(eq(expense.id, id));
	revalidatePath("/");
	return { ok: true };
}

export async function createSettlementAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = createSettlementInputSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Invalid input",
		};
	}
	const data = parsed.data;

	if (!(await isGroupMember(session.user.id, data.groupId))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	const userIds = [data.fromUserId, data.toUserId];
	const existingUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.id, userIds));
	if (existingUsers.length !== userIds.length) {
		return { ok: false, error: "One or more selected users do not exist" };
	}
	if (!(await allUsersInGroup(data.groupId, userIds))) {
		return {
			ok: false,
			error: "Both users must be members of the group",
		};
	}

	const now = new Date();
	const expenseId = crypto.randomUUID();

	await db.batch([
		db.insert(expense).values({
			id: expenseId,
			kind: "settlement",
			groupId: data.groupId,
			description: "settle up",
			amountCents: data.amountCents,
			paidByUserId: data.fromUserId,
			createdAt: now,
			updatedAt: now,
		}),
		db.insert(expenseSplit).values({
			id: crypto.randomUUID(),
			expenseId,
			userId: data.toUserId,
			amountCents: data.amountCents,
		}),
	]);

	revalidatePath("/");
	return { ok: true };
}

export async function deleteSettlementAction(
	id: string,
): Promise<ActionResult> {
	return deleteExpenseAction(id);
}

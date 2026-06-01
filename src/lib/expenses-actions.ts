"use server";

import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expense, expenseSplit, user } from "@/lib/schema";
import {
	createExpenseInputSchema,
	createSettlementInputSchema,
} from "@/lib/expenses-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		throw new Error("Not authenticated");
	}
	return session;
}

export async function createExpenseAction(
	input: unknown,
): Promise<ActionResult> {
	try {
		await requireSession();
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

	// Verify all referenced users exist.
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

	const now = new Date();
	const expenseId = crypto.randomUUID();

	const inserts = [
		db.insert(expense).values({
			id: expenseId,
			kind: "expense",
			description: data.description,
			amountCents: data.amountCents,
			paidByUserId: data.paidByUserId,
			createdAt: now,
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

	// D1 batch: atomic multi-statement.
	await db.batch(inserts as [(typeof inserts)[0], ...typeof inserts]);

	revalidatePath("/");
	return { ok: true };
}

export async function createSettlementAction(
	input: unknown,
): Promise<ActionResult> {
	try {
		await requireSession();
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

	// Verify both users exist.
	const userIds = [data.fromUserId, data.toUserId];
	const existingUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.id, userIds));
	if (existingUsers.length !== userIds.length) {
		return { ok: false, error: "One or more selected users do not exist" };
	}

	const now = new Date();
	const expenseId = crypto.randomUUID();

	// Settlement is modeled as: expense with kind="settlement", paid_by=from,
	// and a single expense_split row with user=to and amount=full. The balance
	// calculation then nets it against any standing debt automatically.
	await db.batch([
		db.insert(expense).values({
			id: expenseId,
			kind: "settlement",
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
	// Settlements are stored in the expense table; reuse delete logic.
	return deleteExpenseAction(id);
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
	try {
		await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	if (!id || typeof id !== "string") {
		return { ok: false, error: "Invalid expense id" };
	}

	await db.delete(expense).where(eq(expense.id, id));
	revalidatePath("/");
	return { ok: true };
}

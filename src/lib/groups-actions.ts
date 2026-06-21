"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Effect } from "effect";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { group, groupMember, user } from "@/lib/schema";
import { ACTIVE_GROUP_COOKIE, isGroupMember } from "@/lib/groups";

export type ActionResult<T = undefined> =
	| { ok: true; data?: T }
	| { ok: false; error: string };

async function requireSession() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) throw new Error("Not authenticated");
	return session;
}

const createGroupSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(80),
	memberUserIds: z.array(z.string()).default([]),
});

export async function createGroupAction(
	input: unknown,
): Promise<ActionResult<{ groupId: string }>> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = createGroupSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Invalid input",
		};
	}
	const { name, memberUserIds } = parsed.data;

	const groupId = crypto.randomUUID();
	const now = new Date();

	// The creator is always a member. Dedupe in case they were also passed in
	// the explicit member list.
	const membershipUserIds = Array.from(
		new Set([session.user.id, ...memberUserIds]),
	);

	await db.batch([
		db.insert(group).values({
			id: groupId,
			name,
			createdByUserId: session.user.id,
			createdAt: now,
			updatedAt: now,
		}),
		...membershipUserIds.map((userId) =>
			db.insert(groupMember).values({
				id: crypto.randomUUID(),
				groupId,
				userId,
				joinedAt: now,
			}),
		),
	] as never);

	// Auto-switch to the just-created group.
	const cookieStore = await cookies();
	cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		// 1 year
		maxAge: 60 * 60 * 24 * 365,
	});

	revalidatePath("/");
	return { ok: true, data: { groupId } };
}

const memberMutationSchema = z.object({
	groupId: z.string().min(1),
	userId: z.string().min(1),
});

export async function addGroupMemberAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = memberMutationSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "Invalid input" };
	}
	const { groupId, userId } = parsed.data;

	// Authorization: the caller must already be a member of the group.
	if (!(await Effect.runPromise(isGroupMember(session.user.id, groupId)))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	// Confirm the target user actually exists.
	const targetExists = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (targetExists.length === 0) {
		return { ok: false, error: "User does not exist" };
	}

	// Idempotent: if already a member, nothing to do.
	if (await Effect.runPromise(isGroupMember(userId, groupId))) {
		return { ok: true };
	}

	await db.insert(groupMember).values({
		id: crypto.randomUUID(),
		groupId,
		userId,
		joinedAt: new Date(),
	});

	revalidatePath("/");
	return { ok: true };
}

export async function removeGroupMemberAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = memberMutationSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "Invalid input" };
	}
	const { groupId, userId } = parsed.data;

	if (!(await Effect.runPromise(isGroupMember(session.user.id, groupId)))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	// Don't let the last member leave — that would orphan the group's expenses.
	const memberCountRows = await db
		.select({ id: groupMember.id })
		.from(groupMember)
		.where(eq(groupMember.groupId, groupId));
	if (memberCountRows.length <= 1) {
		return {
			ok: false,
			error: "Cannot remove the last member of a group",
		};
	}

	await db
		.delete(groupMember)
		.where(
			and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)),
		);

	revalidatePath("/");
	return { ok: true };
}

const setActiveSchema = z.object({ groupId: z.string().min(1) });

export async function setActiveGroupAction(
	input: unknown,
): Promise<ActionResult> {
	let session;
	try {
		session = await requireSession();
	} catch {
		return { ok: false, error: "Not authenticated" };
	}

	const parsed = setActiveSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "Invalid input" };
	}
	const { groupId } = parsed.data;

	if (!(await Effect.runPromise(isGroupMember(session.user.id, groupId)))) {
		return { ok: false, error: "You are not a member of this group" };
	}

	const cookieStore = await cookies();
	cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});

	revalidatePath("/");
	return { ok: true };
}

import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { group, groupMember, user } from "@/lib/schema";
import type { UserSummary } from "@/lib/expenses";

export const ACTIVE_GROUP_COOKIE = "split.active_group";

export type GroupSummary = {
	id: string;
	name: string;
	createdByUserId: string;
};

/**
 * List groups the user is a member of, ordered by name.
 */
export async function listUserGroups(userId: string): Promise<GroupSummary[]> {
	const rows = await db
		.select({
			id: group.id,
			name: group.name,
			createdByUserId: group.createdByUserId,
		})
		.from(group)
		.innerJoin(groupMember, eq(groupMember.groupId, group.id))
		.where(eq(groupMember.userId, userId))
		.orderBy(asc(group.name));
	return rows;
}

/**
 * Returns true if the user is a member of the given group.
 */
export async function isGroupMember(
	userId: string,
	groupId: string,
): Promise<boolean> {
	const rows = await db
		.select({ id: groupMember.id })
		.from(groupMember)
		.where(
			and(
				eq(groupMember.groupId, groupId),
				eq(groupMember.userId, userId),
			),
		)
		.limit(1);
	return rows.length > 0;
}

/**
 * List all members of a group, sorted by name.
 */
export async function listGroupMembers(
	groupId: string,
): Promise<UserSummary[]> {
	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
		})
		.from(groupMember)
		.innerJoin(user, eq(user.id, groupMember.userId))
		.where(eq(groupMember.groupId, groupId))
		.orderBy(asc(user.name));
	return rows;
}

/**
 * List all users in the system. Used to populate "add member" pickers.
 */
export async function listAllUsers(): Promise<UserSummary[]> {
	const rows = await db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user)
		.orderBy(asc(user.name));
	return rows;
}

/**
 * Resolve the active group for the user.
 *
 * Priority:
 * 1. Cookie value, if it points to a group the user is a member of.
 * 2. The first group (alphabetical) the user belongs to.
 * 3. null, if the user has no groups.
 */
export async function resolveActiveGroup(
	userId: string,
): Promise<GroupSummary | null> {
	const userGroups = await listUserGroups(userId);
	if (userGroups.length === 0) return null;

	const cookieStore = await cookies();
	const cookieGroupId = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
	if (cookieGroupId) {
		const match = userGroups.find((g) => g.id === cookieGroupId);
		if (match) return match;
	}

	return userGroups[0];
}

import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { group, groupMember, user } from "@/lib/schema";
import { Data, Effect } from "effect";

export const ACTIVE_GROUP_COOKIE = "split.active_group";

export type GroupSummary = {
	id: string;
	name: string;
	createdByUserId: string;
};

export class ListAllUsersError extends Data.TaggedError("ListAllUsersError")<{
    readonly cause: unknown;
}> {}

export class ListGroupMembersError extends Data.TaggedError("ListGroupMembersError")<{
    readonly cause: unknown;
}> {}

export class IsGroupMemberError extends Data.TaggedError("IsGroupMemberError")<{
    readonly cause: unknown;
}> {}

export class ListUserGroupsError extends Data.TaggedError("ListUserGroupsError")<{
    readonly cause: unknown;
}> {}

export class ResolveActiveGroupError extends Data.TaggedError("ResolveActiveGroupError")<{
    readonly cause: unknown;
}> {}

/**
 * List groups the user is a member of, ordered by name.
 */
export function listUserGroups(userId: string) {
    return Effect.tryPromise({
        try: () => db
            .select({
                id: group.id,
                name: group.name,
                createdByUserId: group.createdByUserId,
            })
            .from(group)
            .innerJoin(groupMember, eq(groupMember.groupId, group.id))
            .where(eq(groupMember.userId, userId))
            .orderBy(asc(group.name)),
        catch: (cause) => new ListUserGroupsError({ cause }),
    });
}

/**
 * Returns true if the user is a member of the given group.
 */
export function isGroupMember(userId: string, groupId: string) {
    return Effect.gen(function*() {
        const rows = yield* Effect.tryPromise({
            try: () => db
                .select({ id: groupMember.id })
                .from(groupMember)
                .where(
                    and(
                        eq(groupMember.groupId, groupId),
                        eq(groupMember.userId, userId),
                    ),
                )
                .limit(1),
            catch: (cause) => new IsGroupMemberError({ cause }),
        });
        return rows.length > 0;
    });
}

/**
 * List all members of a group, sorted by name.
 */
export function listGroupMembers(groupId: string) {
    return Effect.tryPromise({
        try: () => db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
            })
            .from(groupMember)
            .innerJoin(user, eq(user.id, groupMember.userId))
            .where(eq(groupMember.groupId, groupId))
            .orderBy(asc(user.name)),
        catch: (cause) => new ListGroupMembersError({ cause }),
    });
}

/**
 * List all users in the system. Used to populate "add member" pickers.
 */
export function listAllUsers() {
    return Effect.tryPromise({
        try: () => db
            .select({ id: user.id, name: user.name, email: user.email })
            .from(user)
            .orderBy(asc(user.name)),
        catch: (cause) => new ListAllUsersError({ cause }),
    });
}

/**
 * Resolve the active group for the user.
 *
 * Priority:
 * 1. Cookie value, if it points to a group the user is a member of.
 * 2. The first group (alphabetical) the user belongs to.
 * 3. null, if the user has no groups.
 */
export function resolveActiveGroup(userId: string, groups?: GroupSummary[]) {
    return Effect.gen(function*() {
        const userGroups = groups ? groups : yield* listUserGroups(userId);
        if (userGroups.length === 0) return null;

        const cookieStore = yield* Effect.tryPromise({
            try: () => cookies(),
            catch: (cause) => new ResolveActiveGroupError({ cause }),
        });
        const cookieGroupId = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
        if (cookieGroupId) {
            const match = userGroups.find((g) => g.id === cookieGroupId);
            if (match) return match;
        }

        return userGroups[0];
    });
}

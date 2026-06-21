import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
	computeBalances,
	listExpenses,
	listSettlements,
	type UserSummary,
} from "@/lib/expenses";
import {
	listAllUsers,
	listGroupMembers,
	listUserGroups,
	resolveActiveGroup,
} from "@/lib/groups";
import { Dashboard } from "@/components/dashboard";
import { NoGroupEmptyState } from "@/components/no-group-empty-state";
import { Effect } from "effect";

export default async function Home() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/signin");
	}

	const currentUser: UserSummary = {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
	};

	const { activeGroup, groups, allUsers } = await Effect.runPromise(
        Effect.gen(function* () {
            const { groups, allUsers } = yield* Effect.all({
                groups: listUserGroups(currentUser.id),
                allUsers: listAllUsers(),
            }, { concurrency: "unbounded" });
            const activeGroup = yield* resolveActiveGroup(currentUser.id, groups);
            return { activeGroup, groups, allUsers };
        })
    );

	if (!activeGroup) {
		return (
			<NoGroupEmptyState currentUser={currentUser} allUsers={allUsers} />
		);
	}

	const { groupMembers, expenses, settlements, balances } = await Effect.runPromise(
        Effect.all({
            groupMembers: listGroupMembers(activeGroup.id),
            expenses: listExpenses(activeGroup.id),
            settlements: listSettlements(activeGroup.id),
            balances: computeBalances(activeGroup.id),
        }, { concurrency: "unbounded" })
	);

	return (
		<Dashboard
			currentUser={currentUser}
			allUsers={allUsers}
			groups={groups}
			activeGroup={activeGroup}
			groupMembers={groupMembers}
			expenses={expenses}
			balances={balances}
			settlements={settlements}
		/>
	);
}

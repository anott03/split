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

	const [activeGroup, groups, allUsers] = await Promise.all([
		resolveActiveGroup(currentUser.id),
		listUserGroups(currentUser.id),
		listAllUsers(),
	]);

	if (!activeGroup) {
		return (
			<NoGroupEmptyState currentUser={currentUser} allUsers={allUsers} />
		);
	}

	const [groupMembers, expenses, settlements, balances] = await Promise.all([
		listGroupMembers(activeGroup.id),
		listExpenses(activeGroup.id),
		listSettlements(activeGroup.id),
		computeBalances(activeGroup.id),
	]);

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

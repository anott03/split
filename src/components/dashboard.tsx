import type {
	Balance,
	ExpenseRow,
	SettlementRow,
	UserSummary,
} from "@/lib/expenses";
import type { GroupSummary } from "@/lib/groups";
import { BalancesPanel } from "@/components/balances-panel";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { ExpenseList } from "@/components/expense-list";
import { GroupSwitcher } from "@/components/group-switcher";
import { ManageMembersDialog } from "@/components/manage-members-dialog";
import { SettlementsList } from "@/components/settlements-list";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
	currentUser: UserSummary;
	allUsers: UserSummary[];
	groups: GroupSummary[];
	activeGroup: GroupSummary;
	groupMembers: UserSummary[];
	expenses: ExpenseRow[];
	balances: Balance[];
	settlements: SettlementRow[];
};

export function Dashboard({
	currentUser,
	allUsers,
	groups,
	activeGroup,
	groupMembers,
	expenses,
	balances,
	settlements,
}: Props) {
	return (
		<main className="min-h-screen bg-stone-200 font-mono text-stone-900 dark:bg-background dark:text-foreground">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8">
				<header className="flex items-center justify-between gap-4">
					<h1 className="text-2xl font-semibold">
						<i>SPLIT.</i>
					</h1>
					<div className="flex items-center gap-3">
						<ThemeToggle />
						<span className="text-xs text-stone-700 dark:text-stone-300">
							signed in as <strong>{currentUser.name}</strong>
						</span>
						<SignOutButton />
					</div>
				</header>

				<div className="flex flex-wrap items-center gap-2">
					<GroupSwitcher
						groups={groups}
						activeGroupId={activeGroup.id}
					/>
					<ManageMembersDialog
						group={activeGroup}
						members={groupMembers}
						allUsers={allUsers}
					/>
					<CreateGroupDialog
						allUsers={allUsers}
						currentUserId={currentUser.id}
					/>
				</div>

				<BalancesPanel
					balances={balances}
					users={groupMembers}
					groupId={activeGroup.id}
				/>

				<SettlementsList settlements={settlements} />

				<ExpenseList
					expenses={expenses}
					users={groupMembers}
					groupId={activeGroup.id}
					currentUserId={currentUser.id}
				/>
			</div>
		</main>
	);
}

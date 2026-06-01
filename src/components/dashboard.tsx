import type { Balance, ExpenseRow, UserSummary } from "@/lib/expenses";
import { BalancesPanel } from "@/components/balances-panel";
import { ExpenseTable } from "@/components/expense-table";
import { NewExpenseDialog } from "@/components/new-expense-dialog";
import { SignOutButton } from "@/components/sign-out-button";

type Props = {
	currentUser: UserSummary;
	users: UserSummary[];
	expenses: ExpenseRow[];
	balances: Balance[];
};

export function Dashboard({ currentUser, users, expenses, balances }: Props) {
	return (
		<main className="min-h-screen bg-stone-200 font-mono text-stone-900">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8">
				<header className="flex items-center justify-between gap-4">
					<h1 className="text-2xl font-semibold">
						<i>SPLIT.</i>
					</h1>
					<div className="flex items-center gap-3">
						<span className="text-xs text-stone-700">
							signed in as <strong>{currentUser.name}</strong>
						</span>
						<SignOutButton />
					</div>
				</header>

				<div className="flex items-center justify-between">
					<h2 className="text-sm uppercase tracking-widest text-stone-700">
						expenses
					</h2>
					<NewExpenseDialog users={users} currentUserId={currentUser.id} />
				</div>

				<BalancesPanel balances={balances} />

				<ExpenseTable expenses={expenses} />
			</div>
		</main>
	);
}

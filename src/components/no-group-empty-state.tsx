import type { UserSummary } from "@/lib/expenses";
import { Card, CardContent } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { SignOutButton } from "@/components/sign-out-button";

type Props = {
	currentUser: UserSummary;
	allUsers: UserSummary[];
};

export function NoGroupEmptyState({ currentUser, allUsers }: Props) {
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

				<Card>
					<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
						<h2 className="text-lg font-mono">no groups yet</h2>
						<p className="max-w-sm text-sm text-muted-foreground">
							Groups scope your expenses, balances, and the members you can
							split with. Create one to get started.
						</p>
						<CreateGroupDialog
							allUsers={allUsers}
							currentUserId={currentUser.id}
						/>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

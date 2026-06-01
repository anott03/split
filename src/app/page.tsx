import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
	computeBalances,
	listExpenses,
	listUsers,
	type UserSummary,
} from "@/lib/expenses";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/signin");
	}

	const [users, expenses, balances] = await Promise.all([
		listUsers(),
		listExpenses(),
		computeBalances(),
	]);

	const currentUser: UserSummary = {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
	};

	return (
		<Dashboard
			currentUser={currentUser}
			users={users}
			expenses={expenses}
			balances={balances}
		/>
	);
}

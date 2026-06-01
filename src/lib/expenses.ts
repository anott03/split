import { and, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import { expense, expenseSplit, user } from "@/lib/schema";

export type UserSummary = {
	id: string;
	name: string;
	email: string;
};

export type ExpenseSplitRow = {
	user: UserSummary;
	amountCents: number;
};

export type ExpenseRow = {
	id: string;
	description: string;
	amountCents: number;
	createdAt: Date;
	paidBy: UserSummary;
	splits: ExpenseSplitRow[];
};

export type SettlementRow = {
	id: string;
	amountCents: number;
	createdAt: Date;
	from: UserSummary;
	to: UserSummary;
};

export type Balance = {
	creditor: UserSummary;
	debtor: UserSummary;
	amountCents: number;
};

export async function listExpenses(groupId: string): Promise<ExpenseRow[]> {
	const expenseRows = await db
		.select({
			id: expense.id,
			description: expense.description,
			amountCents: expense.amountCents,
			createdAt: expense.createdAt,
			paidById: expense.paidByUserId,
			paidByName: user.name,
			paidByEmail: user.email,
		})
		.from(expense)
		.innerJoin(user, eq(user.id, expense.paidByUserId))
		.where(and(eq(expense.kind, "expense"), eq(expense.groupId, groupId)))
		.orderBy(desc(expense.createdAt));

	if (expenseRows.length === 0) return [];

	const splitRows = await db
		.select({
			expenseId: expenseSplit.expenseId,
			amountCents: expenseSplit.amountCents,
			userId: user.id,
			userName: user.name,
			userEmail: user.email,
		})
		.from(expenseSplit)
		.innerJoin(user, eq(user.id, expenseSplit.userId))
		.innerJoin(expense, eq(expense.id, expenseSplit.expenseId))
		.where(and(eq(expense.kind, "expense"), eq(expense.groupId, groupId)));

	const splitsByExpense = new Map<string, ExpenseSplitRow[]>();
	for (const row of splitRows) {
		const list = splitsByExpense.get(row.expenseId) ?? [];
		list.push({
			user: { id: row.userId, name: row.userName, email: row.userEmail },
			amountCents: row.amountCents,
		});
		splitsByExpense.set(row.expenseId, list);
	}

	return expenseRows.map((row) => ({
		id: row.id,
		description: row.description,
		amountCents: row.amountCents,
		createdAt: row.createdAt,
		paidBy: {
			id: row.paidById,
			name: row.paidByName,
			email: row.paidByEmail,
		},
		splits: (splitsByExpense.get(row.id) ?? []).sort((a, b) =>
			a.user.name.localeCompare(b.user.name),
		),
	}));
}

/**
 * List settlements (kind === "settlement"). Each settlement is an expense
 * with a single split row: the payer paid the recipient (split row's user).
 */
export async function listSettlements(
	groupId: string,
): Promise<SettlementRow[]> {
	const fromUser = alias(user, "from_user");
	const toUser = alias(user, "to_user");

	const rows = await db
		.select({
			id: expense.id,
			amountCents: expense.amountCents,
			createdAt: expense.createdAt,
			fromId: fromUser.id,
			fromName: fromUser.name,
			fromEmail: fromUser.email,
			toId: toUser.id,
			toName: toUser.name,
			toEmail: toUser.email,
		})
		.from(expense)
		.innerJoin(fromUser, eq(fromUser.id, expense.paidByUserId))
		.innerJoin(expenseSplit, eq(expenseSplit.expenseId, expense.id))
		.innerJoin(toUser, eq(toUser.id, expenseSplit.userId))
		.where(
			and(eq(expense.kind, "settlement"), eq(expense.groupId, groupId)),
		)
		.orderBy(desc(expense.createdAt));

	return rows.map((row) => ({
		id: row.id,
		amountCents: row.amountCents,
		createdAt: row.createdAt,
		from: { id: row.fromId, name: row.fromName, email: row.fromEmail },
		to: { id: row.toId, name: row.toName, email: row.toEmail },
	}));
}

/**
 * Compute net pairwise debts within a single group. For every (creditor,
 * debtor) pair we sum the debtor's split amounts across all expenses the
 * creditor paid in this group, then net against the reverse direction so
 * each pair shows up at most once in the positive-owing direction.
 */
export async function computeBalances(groupId: string): Promise<Balance[]> {
	const rows = await db
		.select({
			creditorId: expense.paidByUserId,
			creditorName: user.name,
			creditorEmail: user.email,
			debtorId: expenseSplit.userId,
			totalCents: sql<number>`SUM(${expenseSplit.amountCents})`,
		})
		.from(expenseSplit)
		.innerJoin(expense, eq(expense.id, expenseSplit.expenseId))
		.innerJoin(user, eq(user.id, expense.paidByUserId))
		.where(
			and(
				ne(expenseSplit.userId, expense.paidByUserId),
				eq(expense.groupId, groupId),
			),
		)
		.groupBy(expense.paidByUserId, expenseSplit.userId);

	// We need names for the debtors too. Pull every referenced user in one go.
	const debtorIds = Array.from(new Set(rows.map((r) => r.debtorId)));
	const creditorIds = Array.from(new Set(rows.map((r) => r.creditorId)));
	const allIds = Array.from(new Set([...debtorIds, ...creditorIds]));
	const userMap = new Map<string, UserSummary>();
	if (allIds.length > 0) {
		const userRows = await db
			.select({ id: user.id, name: user.name, email: user.email })
			.from(user);
		for (const u of userRows) userMap.set(u.id, u);
	}

	// gross[creditorId][debtorId] = cents owed to creditor by debtor
	const gross = new Map<string, Map<string, number>>();
	for (const row of rows) {
		const inner = gross.get(row.creditorId) ?? new Map<string, number>();
		inner.set(row.debtorId, Number(row.totalCents));
		gross.set(row.creditorId, inner);
	}

	// Net each unordered pair. Iterate over sorted (a, b) where a < b once.
	const seen = new Set<string>();
	const balances: Balance[] = [];
	for (const [creditorId, debtorMap] of gross) {
		for (const [debtorId, amount] of debtorMap) {
			const key = [creditorId, debtorId].sort().join("|");
			if (seen.has(key)) continue;
			seen.add(key);

			const reverse = gross.get(debtorId)?.get(creditorId) ?? 0;
			const net = amount - reverse;
			if (net === 0) continue;

			const [from, to] =
				net > 0 ? [debtorId, creditorId] : [creditorId, debtorId];
			const debtor = userMap.get(from);
			const creditor = userMap.get(to);
			if (!debtor || !creditor) continue;
			balances.push({
				creditor,
				debtor,
				amountCents: Math.abs(net),
			});
		}
	}

	return balances.sort((a, b) => b.amountCents - a.amountCents);
}

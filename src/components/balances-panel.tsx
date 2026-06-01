"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";

import type { Balance, UserSummary } from "@/lib/expenses";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	SettleUpDialog,
	type SettleUpPrefill,
} from "@/components/settle-up-dialog";

type Props = {
	balances: Balance[];
	users: UserSummary[];
	groupId: string;
};

export function BalancesPanel({ balances, users, groupId }: Props) {
	const [open, setOpen] = useState(false);
	const [prefill, setPrefill] = useState<SettleUpPrefill | undefined>(
		undefined,
	);

	function openWithPrefill(b: Balance) {
		setPrefill({
			fromUserId: b.debtor.id,
			toUserId: b.creditor.id,
			amount: (b.amountCents / 100).toFixed(2),
		});
		setOpen(true);
	}

	function openBlank() {
		setPrefill(undefined);
		setOpen(true);
	}

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row justify-between items-center">
					<CardTitle className="font-mono lowercase tracking-tight">
						balances
					</CardTitle>
					<Button variant="outline" size="sm" onClick={openBlank}>
						<HandCoins />
						settle up
					</Button>
				</CardHeader>
				<CardContent>
					{balances.length === 0 ? (
						<p className="text-sm text-muted-foreground font-mono">
							all settled.
						</p>
					) : (
						<ul className="flex flex-col gap-1.5 font-mono text-sm">
							{balances.map((b) => (
								<li
									key={`${b.creditor.id}-${b.debtor.id}`}
									className="flex items-baseline justify-between gap-3"
								>
									<span>
										<span className="font-semibold">{b.debtor.name}</span>
										<span className="text-muted-foreground"> owes </span>
										<span className="font-semibold">{b.creditor.name}</span>
									</span>
									<div className="flex items-center gap-2">
										<span className="tabular-nums">
											{formatCents(b.amountCents)}
										</span>
										<Button
											variant="ghost"
											size="xs"
											onClick={() => openWithPrefill(b)}
										>
											settle
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<SettleUpDialog
				open={open}
				onOpenChange={setOpen}
				users={users}
				groupId={groupId}
				prefill={prefill}
			/>
		</>
	);
}

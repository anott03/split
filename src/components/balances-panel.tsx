import type { Balance } from "@/lib/expenses";
import { formatCents } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
	balances: Balance[];
};

export function BalancesPanel({ balances }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono lowercase tracking-tight">
					balances
				</CardTitle>
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
								<span className="tabular-nums">
									{formatCents(b.amountCents)}
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteSettlementAction } from "@/lib/expenses-actions";
import type { SettlementRow } from "@/lib/expenses";
import { formatCents, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
	settlements: SettlementRow[];
};

export function SettlementsList({ settlements }: Props) {
	const router = useRouter();
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	// Collapsed by default to keep expenses above the fold.
	const [open, setOpen] = useState(false);

	async function handleDelete(id: string) {
		setPendingDeleteId(id);
		const result = await deleteSettlementAction(id);
		setPendingDeleteId(null);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		toast.success("Settlement deleted");
		router.refresh();
	}

	const contentId = "settlements-content";

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-mono lowercase tracking-tight">
					settlements
					<span className="ml-2 text-xs text-muted-foreground tabular-nums">
						({settlements.length})
					</span>
				</CardTitle>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setOpen((prev) => !prev)}
					aria-expanded={open}
					aria-controls={contentId}
				>
					<ChevronDown
						className={cn(
							"transition-transform duration-150",
							open ? "rotate-180" : "rotate-0",
						)}
					/>
					<span className="sr-only">
						{open ? "collapse settlements" : "expand settlements"}
					</span>
				</Button>
			</CardHeader>
			{open ? (
				<CardContent id={contentId}>
					{settlements.length === 0 ? (
						<p className="text-sm text-muted-foreground font-mono">
							no settlements yet.
						</p>
					) : (
						<ul className="flex flex-col gap-2 font-mono text-sm">
							{settlements.map((s) => (
								<li
									key={s.id}
									className="flex items-center justify-between gap-3"
								>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground tabular-nums w-20 shrink-0">
											{formatRelativeDate(s.createdAt)}
										</span>
										<span className="font-semibold">{s.from.name}</span>
										<ArrowRight className="size-3 text-muted-foreground" />
										<span className="font-semibold">{s.to.name}</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="tabular-nums">
											{formatCents(s.amountCents)}
										</span>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleDelete(s.id)}
											disabled={pendingDeleteId === s.id}
											aria-label="delete settlement"
										>
											<Trash2 />
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			) : null}
		</Card>
	);
}

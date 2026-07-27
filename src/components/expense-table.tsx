"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EditExpenseDialog } from "@/components/new-expense-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ExpenseRow, UserSummary } from "@/lib/expenses";
import { deleteExpenseAction } from "@/lib/expenses-actions";
import { formatCents, formatRelativeDate } from "@/lib/format";

type Props = {
	expenses: ExpenseRow[];
	users: UserSummary[];
	groupId: string;
	emptyMessage?: string;
};

export function ExpenseTable({
	expenses,
	users,
	groupId,
	emptyMessage,
}: Props) {
	const router = useRouter();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "createdAt", desc: true },
	]);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	async function handleDelete(id: string) {
		setPendingDeleteId(id);
		const result = await deleteExpenseAction(id);
		setPendingDeleteId(null);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		toast.success("Expense deleted");
		router.refresh();
	}

	const columns: ColumnDef<ExpenseRow>[] = [
		{
			id: "createdAt",
			accessorFn: (row) => row.createdAt.getTime(),
			header: ({ column }) => (
				<button
					type="button"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="inline-flex items-center gap-1 font-mono lowercase"
				>
					date <ArrowUpDown className="size-3" />
				</button>
			),
			cell: ({ row }) => (
				<span className="font-mono text-muted-foreground">
					{formatRelativeDate(row.original.createdAt)}
				</span>
			),
			sortingFn: "basic",
		},
		{
			id: "description",
			accessorKey: "description",
			header: () => (
				<span className="font-mono lowercase">description</span>
			),
			cell: ({ row }) => <span>{row.original.description}</span>,
		},
		{
			id: "amount",
			accessorFn: (row) => row.amountCents,
			header: ({ column }) => (
				<button
					type="button"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="inline-flex items-center gap-1 font-mono lowercase"
				>
					amount <ArrowUpDown className="size-3" />
				</button>
			),
			cell: ({ row }) => (
				<span className="font-mono tabular-nums">
					{formatCents(row.original.amountCents)}
				</span>
			),
			sortingFn: "basic",
		},
		{
			id: "paidBy",
			accessorFn: (row) => row.paidBy.name,
			header: () => <span className="font-mono lowercase">paid by</span>,
			cell: ({ row }) => (
				<span className="font-medium">{row.original.paidBy.name}</span>
			),
		},
		{
			id: "splits",
			header: () => (
				<span className="font-mono lowercase">shared with</span>
			),
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
					{row.original.splits.map((s) => (
						<span key={s.user.id} className="text-muted-foreground">
							{s.user.name}{" "}
							<span className="font-mono tabular-nums">
								{formatCents(s.amountCents)}
							</span>
						</span>
					))}
				</div>
			),
			enableSorting: false,
		},
		{
			id: "actions",
			header: () => <span className="sr-only">actions</span>,
			cell: ({ row }) => (
				<div className="flex items-center justify-end gap-1">
					<EditExpenseDialog
						users={users}
						groupId={groupId}
						expense={row.original}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => handleDelete(row.original.id)}
						disabled={pendingDeleteId === row.original.id}
						aria-label="delete expense"
					>
						<Trash2 />
					</Button>
				</div>
			),
			enableSorting: false,
		},
	];

	const table = useReactTable({
		data: expenses,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="rounded-lg border border-border overflow-hidden">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-sm text-muted-foreground font-mono"
							>
								{emptyMessage ??
									"no expenses yet — add your first one."}
							</TableCell>
						</TableRow>
					) : (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										)}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

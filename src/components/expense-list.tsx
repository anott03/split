"use client";

import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ExpenseTable } from "@/components/expense-table";
import { NewExpenseDialog } from "@/components/new-expense-dialog";
import type { ExpenseRow, UserSummary } from "@/lib/expenses";

type Props = {
	expenses: ExpenseRow[];
	users: UserSummary[];
	groupId: string;
	currentUserId: string;
};

export function ExpenseList({
	expenses,
	users,
	groupId,
	currentUserId,
}: Props) {
	const [open, setOpen] = useState(false);
	const [paidByFilter, setPaidByFilter] = useState<string>("all");
	const [sharedWithFilter, setSharedWithFilter] = useState<string[]>([]);
	const [descriptionFilter, setDescriptionFilter] = useState("");

	const activeFilters =
		paidByFilter !== "all" ||
		sharedWithFilter.length > 0 ||
		descriptionFilter.trim().length > 0;

	const filteredExpenses = useMemo(() => {
		const query = descriptionFilter.trim().toLowerCase();
		return expenses.filter((expense) => {
			if (paidByFilter !== "all" && expense.paidBy.id !== paidByFilter) {
				return false;
			}
			if (sharedWithFilter.length > 0) {
				const splitUserIds = new Set(
					expense.splits.map((s) => s.user.id),
				);
				if (!sharedWithFilter.every((id) => splitUserIds.has(id))) {
					return false;
				}
			}
			if (
				query &&
				!expense.description.toLowerCase().includes(query)
			) {
				return false;
			}
			return true;
		});
	}, [expenses, paidByFilter, sharedWithFilter, descriptionFilter]);

	function clearFilters() {
		setPaidByFilter("all");
		setSharedWithFilter([]);
		setDescriptionFilter("");
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm uppercase tracking-widest text-stone-700">
					expenses
				</h2>
				<div className="flex items-center gap-2">
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger
							render={
								<Button
									variant="outline"
									size="sm"
									data-active={activeFilters}
								/>
							}
						>
							<Filter className="size-4" />
							filter
							{activeFilters ? (
								<span className="ml-1 inline-flex size-2 rounded-full bg-stone-900" />
							) : null}
						</PopoverTrigger>
						<PopoverContent className="w-72" align="end">
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-1">
									<Label className="font-mono lowercase text-muted-foreground">
										paid by
									</Label>
									<Select
										value={paidByFilter}
										onValueChange={(value) =>
											setPaidByFilter(value as string)
										}
										items={Object.fromEntries([
											["all", "anyone"],
											...users.map(
												(u) => [u.id, u.name] as const,
											),
										])}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="anyone" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												anyone
											</SelectItem>
											{users.map((u) => (
												<SelectItem key={u.id} value={u.id}>
													{u.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex flex-col gap-1">
									<Label className="font-mono lowercase text-muted-foreground">
										shared with
									</Label>
									<div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
										{users.map((u) => {
											const checked = sharedWithFilter.includes(
												u.id,
											);
											return (
												<label
													key={u.id}
													className="flex items-center gap-2 text-sm"
												>
													<Checkbox
														checked={checked}
														onCheckedChange={(
															isChecked,
														) => {
															setSharedWithFilter(
																(prev) =>
																	isChecked
																		? [...prev, u.id]
																		: prev.filter(
																				(id) =>
																					id !== u.id,
																		),
														);
													}}
													/>
													<span>{u.name}</span>
												</label>
											);
										})}
									</div>
								</div>

								<div className="flex flex-col gap-1">
									<Label
										htmlFor="description-filter"
										className="font-mono lowercase text-muted-foreground"
									>
										description
									</Label>
									<Input
										id="description-filter"
										placeholder="search"
										value={descriptionFilter}
										onChange={(e) =>
											setDescriptionFilter(e.target.value)
										}
									/>
								</div>

								{activeFilters ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={clearFilters}
										className="self-start"
									>
										<X className="size-4" />
										clear filters
									</Button>
								) : null}
							</div>
						</PopoverContent>
					</Popover>
					<NewExpenseDialog
						users={users}
						currentUserId={currentUserId}
						groupId={groupId}
					/>
				</div>
			</div>

			<ExpenseTable
				expenses={filteredExpenses}
				users={users}
				groupId={groupId}
				emptyMessage={
					activeFilters
						? "no expenses match the filters"
						: undefined
				}
			/>
		</div>
	);
}

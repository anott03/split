"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createExpenseAction } from "@/lib/expenses-actions";
import type { UserSummary } from "@/lib/expenses";
import {
	distributeEqually,
	formatCents,
	parseDollarsToCents,
} from "@/lib/format";

// Client-side form schema. The participants field is the source of truth
// for who is included in the split; the manualSplits map carries the
// user-entered cent values only when mode === "manual".
const formSchema = z
	.object({
		description: z.string().trim().min(1, "Description is required").max(200),
		amount: z
			.string()
			.min(1, "Amount is required")
			.refine(
				(v) => {
					const cents = parseDollarsToCents(v);
					return cents !== null && cents > 0;
				},
				{ message: "Enter a positive dollar amount" },
			),
		paidByUserId: z.string().min(1, "Select who paid"),
		participantIds: z
			.array(z.string())
			.min(1, "Select at least one participant"),
		mode: z.enum(["equal", "manual"]),
		manualSplits: z.record(z.string(), z.string()),
	})
	.superRefine((value, ctx) => {
		const totalCents = parseDollarsToCents(value.amount);
		if (totalCents === null) return;

		if (value.mode !== "manual") return;

		// Validate each manual entry parses and is positive.
		let sum = 0;
		for (const userId of value.participantIds) {
			const raw = value.manualSplits[userId] ?? "";
			const cents = parseDollarsToCents(raw);
			if (cents === null || cents <= 0) {
				ctx.addIssue({
					code: "custom",
					path: ["manualSplits", userId],
					message: "Enter a positive amount",
				});
				return;
			}
			sum += cents;
		}
		if (sum !== totalCents) {
			ctx.addIssue({
				code: "custom",
				path: ["manualSplits"],
				message: `Splits sum to ${formatCents(sum)} but total is ${formatCents(totalCents)}`,
			});
		}
	});

type FormValues = z.infer<typeof formSchema>;

type Props = {
	users: UserSummary[];
	currentUserId: string;
};

export function NewExpenseDialog({ users, currentUserId }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	const defaultValues = useMemo<FormValues>(
		() => ({
			description: "",
			amount: "",
			paidByUserId: currentUserId,
			participantIds: [],
			mode: "equal",
			manualSplits: {},
		}),
		[currentUserId],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		control,
		handleSubmit,
		register,
		reset,
		setValue,
		formState: { errors, isSubmitting },
	} = form;

	const amount = useWatch({ control, name: "amount" });
	const participantIds = useWatch({ control, name: "participantIds" });
	const mode = useWatch({ control, name: "mode" });
	const manualSplits = useWatch({ control, name: "manualSplits" });

	const totalCents = parseDollarsToCents(amount ?? "") ?? 0;

	// Compute equal split for participants (deterministic by sort of user IDs
	// so the cent remainder lands on the same participant across renders).
	const equalSplitMap = useMemo(() => {
		const sorted = [...participantIds].sort();
		const cents = distributeEqually(totalCents, sorted.length);
		const map: Record<string, number> = {};
		sorted.forEach((id, idx) => {
			map[id] = cents[idx] ?? 0;
		});
		return map;
	}, [participantIds, totalCents]);

	// When switching to manual mode (or the participant set changes while in
	// manual mode), seed the manual fields from the equal split so the user
	// has a starting point.
	useEffect(() => {
		if (mode !== "manual") return;
		const current = manualSplits ?? {};
		const next: Record<string, string> = {};
		let changed = false;
		for (const id of participantIds) {
			const existing = current[id];
			if (existing && existing.length > 0) {
				next[id] = existing;
			} else {
				const cents = equalSplitMap[id] ?? 0;
				next[id] = (cents / 100).toFixed(2);
				changed = true;
			}
		}
		// Drop entries for users no longer participating.
		const droppedKeys = Object.keys(current).filter(
			(k) => !participantIds.includes(k),
		);
		if (droppedKeys.length > 0) changed = true;

		if (changed) {
			setValue("manualSplits", next, { shouldValidate: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, participantIds, equalSplitMap]);

	const runningSumCents = useMemo(() => {
		if (mode === "equal") {
			return Object.values(equalSplitMap).reduce((a, b) => a + b, 0);
		}
		return participantIds.reduce((acc, id) => {
			const cents = parseDollarsToCents(manualSplits?.[id] ?? "");
			return acc + (cents ?? 0);
		}, 0);
	}, [mode, equalSplitMap, manualSplits, participantIds]);

	const sumMatches = runningSumCents === totalCents && totalCents > 0;

	async function onSubmit(values: FormValues) {
		const amountCents = parseDollarsToCents(values.amount);
		if (amountCents === null || amountCents <= 0) {
			toast.error("Invalid amount");
			return;
		}

		const splits =
			values.mode === "equal"
				? values.participantIds.map((userId) => ({
						userId,
						amountCents: equalSplitMap[userId] ?? 0,
					}))
				: values.participantIds.map((userId) => ({
						userId,
						amountCents: parseDollarsToCents(values.manualSplits[userId] ?? "") ?? 0,
					}));

		const result = await createExpenseAction({
			description: values.description,
			amountCents,
			paidByUserId: values.paidByUserId,
			splits,
		});

		if (!result.ok) {
			toast.error(result.error);
			return;
		}

		toast.success("Expense added");
		reset(defaultValues);
		setOpen(false);
		router.refresh();
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) reset(defaultValues);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button size="sm">
						<Plus />
						new expense
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>new expense</DialogTitle>
					<DialogDescription>
						Record a shared cost. Payer is independent from participants.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="description">description</Label>
						<Input
							id="description"
							placeholder="groceries at safeway"
							{...register("description")}
							aria-invalid={!!errors.description}
						/>
						{errors.description ? (
							<p className="text-xs text-destructive">
								{errors.description.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="amount">total amount</Label>
						<div className="relative">
							<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
								$
							</span>
							<Input
								id="amount"
								inputMode="decimal"
								placeholder="0.00"
								className="pl-6"
								{...register("amount")}
								aria-invalid={!!errors.amount}
							/>
						</div>
						{errors.amount ? (
							<p className="text-xs text-destructive">
								{errors.amount.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>paid by</Label>
						<Controller
							control={control}
							name="paidByUserId"
							render={({ field }) => (
								<Select
									items={Object.fromEntries(
										users.map((u) => [u.id, u.name]),
									)}
									value={field.value}
									onValueChange={(value) =>
										field.onChange(value as string)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select payer" />
									</SelectTrigger>
									<SelectContent>
										{users.map((u) => (
											<SelectItem key={u.id} value={u.id}>
												{u.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label>shared with</Label>
						<Controller
							control={control}
							name="participantIds"
							render={({ field }) => (
								<div className="flex flex-col gap-2">
									{users.map((u) => {
										const checked = field.value.includes(u.id);
										return (
											<label
												key={u.id}
												className="flex items-center gap-2 text-sm"
											>
												<Checkbox
													checked={checked}
													onCheckedChange={(isChecked) => {
														if (isChecked) {
															field.onChange([
																...field.value,
																u.id,
															]);
														} else {
															field.onChange(
																field.value.filter(
																	(id) => id !== u.id,
																),
															);
														}
													}}
												/>
												<span>{u.name}</span>
											</label>
										);
									})}
								</div>
							)}
						/>
						{errors.participantIds ? (
							<p className="text-xs text-destructive">
								{errors.participantIds.message}
							</p>
						) : null}
					</div>

					{participantIds.length > 0 ? (
						<div className="flex flex-col gap-2">
							<Label>split</Label>
							<Controller
								control={control}
								name="mode"
								render={({ field }) => (
									<RadioGroup
										value={field.value}
										onValueChange={(value) =>
											field.onChange(value as "equal" | "manual")
										}
										className="flex flex-row gap-4"
									>
										<label className="flex items-center gap-2 text-sm">
											<RadioGroupItem value="equal" />
											<span>equal</span>
										</label>
										<label className="flex items-center gap-2 text-sm">
											<RadioGroupItem value="manual" />
											<span>manual</span>
										</label>
									</RadioGroup>
								)}
							/>

							<div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
								{participantIds.map((id) => {
									const u = users.find((x) => x.id === id);
									if (!u) return null;
									return (
										<div
											key={id}
											className="flex items-center justify-between gap-2 text-sm"
										>
											<span className="text-muted-foreground">
												{u.name}
											</span>
											{mode === "equal" ? (
												<span className="font-mono tabular-nums">
													{formatCents(equalSplitMap[id] ?? 0)}
												</span>
											) : (
												<div className="relative w-28">
													<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
														$
													</span>
													<Input
														inputMode="decimal"
														className="pl-5 h-7 text-right"
														value={manualSplits?.[id] ?? ""}
														onChange={(e) =>
															setValue(
																`manualSplits.${id}`,
																e.target.value,
																{ shouldValidate: true },
															)
														}
													/>
												</div>
											)}
										</div>
									);
								})}

								<div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
									<span className="text-muted-foreground">running total</span>
									<span
										className={
											sumMatches
												? "font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
												: "font-mono tabular-nums text-destructive"
										}
									>
										{formatCents(runningSumCents)} / {formatCents(totalCents)}
									</span>
								</div>
							</div>
							{errors.manualSplits &&
							typeof errors.manualSplits.message === "string" ? (
								<p className="text-xs text-destructive">
									{errors.manualSplits.message}
								</p>
							) : null}
						</div>
					) : null}

					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting || !sumMatches}>
							{isSubmitting ? "saving..." : "add expense"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

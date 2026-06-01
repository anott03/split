"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createSettlementAction } from "@/lib/expenses-actions";
import type { UserSummary } from "@/lib/expenses";
import { parseDollarsToCents } from "@/lib/format";

const formSchema = z
	.object({
		fromUserId: z.string().min(1, "Select who is paying"),
		toUserId: z.string().min(1, "Select who is being paid"),
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
	})
	.refine((v) => v.fromUserId !== v.toUserId, {
		message: "From and to must be different users",
		path: ["toUserId"],
	});

type FormValues = z.infer<typeof formSchema>;

export type SettleUpPrefill = {
	fromUserId?: string;
	toUserId?: string;
	amount?: string;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	users: UserSummary[];
	prefill?: SettleUpPrefill;
};

export function SettleUpDialog({ open, onOpenChange, users, prefill }: Props) {
	const router = useRouter();

	const {
		control,
		handleSubmit,
		register,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			fromUserId: prefill?.fromUserId ?? "",
			toUserId: prefill?.toUserId ?? "",
			amount: prefill?.amount ?? "",
		},
		mode: "onChange",
	});

	// Reset the form whenever the dialog opens with a new prefill.
	useEffect(() => {
		if (open) {
			reset({
				fromUserId: prefill?.fromUserId ?? "",
				toUserId: prefill?.toUserId ?? "",
				amount: prefill?.amount ?? "",
			});
		}
	}, [open, prefill, reset]);

	async function onSubmit(values: FormValues) {
		const amountCents = parseDollarsToCents(values.amount);
		if (amountCents === null || amountCents <= 0) {
			toast.error("Invalid amount");
			return;
		}

		const result = await createSettlementAction({
			fromUserId: values.fromUserId,
			toUserId: values.toUserId,
			amountCents,
		});

		if (!result.ok) {
			toast.error(result.error);
			return;
		}

		toast.success("Settlement recorded");
		onOpenChange(false);
		router.refresh();
	}

	const userItems = Object.fromEntries(users.map((u) => [u.id, u.name]));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>settle up</DialogTitle>
					<DialogDescription>
						Record a payment from one user to another.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<div className="flex flex-col gap-1.5">
						<Label>from</Label>
						<Controller
							control={control}
							name="fromUserId"
							render={({ field }) => (
								<Select
									items={userItems}
									value={field.value}
									onValueChange={(value) =>
										field.onChange(value as string)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Who is paying" />
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
						{errors.fromUserId ? (
							<p className="text-xs text-destructive">
								{errors.fromUserId.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>to</Label>
						<Controller
							control={control}
							name="toUserId"
							render={({ field }) => (
								<Select
									items={userItems}
									value={field.value}
									onValueChange={(value) =>
										field.onChange(value as string)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Who is being paid" />
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
						{errors.toUserId ? (
							<p className="text-xs text-destructive">
								{errors.toUserId.message}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="settle-amount">amount</Label>
						<div className="relative">
							<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
								$
							</span>
							<Input
								id="settle-amount"
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

					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "saving..." : "record settlement"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

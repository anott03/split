import { z } from "zod";

export const splitInputSchema = z.object({
	userId: z.string().min(1),
	amountCents: z.number().int().positive(),
});

export const createExpenseInputSchema = z
	.object({
		groupId: z.string().min(1, "Missing group"),
		description: z.string().trim().min(1, "Description is required").max(200),
		amountCents: z
			.number()
			.int("Amount must be a whole number of cents")
			.positive("Amount must be greater than zero"),
		paidByUserId: z.string().min(1, "Select who paid"),
		splits: z.array(splitInputSchema).min(1, "Add at least one participant"),
	})
	.refine(
		(value) =>
			value.splits.reduce((sum, s) => sum + s.amountCents, 0) ===
			value.amountCents,
		{ message: "Split amounts must sum to the total", path: ["splits"] },
	)
	.refine(
		(value) =>
			new Set(value.splits.map((s) => s.userId)).size === value.splits.length,
		{ message: "Each participant may only appear once", path: ["splits"] },
	);

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const createSettlementInputSchema = z
	.object({
		groupId: z.string().min(1, "Missing group"),
		fromUserId: z.string().min(1, "Select who is paying"),
		toUserId: z.string().min(1, "Select who is being paid"),
		amountCents: z
			.number()
			.int("Amount must be a whole number of cents")
			.positive("Amount must be greater than zero"),
	})
	.refine((v) => v.fromUserId !== v.toUserId, {
		message: "From and to must be different users",
		path: ["toUserId"],
	});

export type CreateSettlementInput = z.infer<typeof createSettlementInputSchema>;

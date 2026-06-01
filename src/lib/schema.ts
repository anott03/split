import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
		() => new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
		() => new Date(),
	),
});

// Groups: a named container for expenses, settlements, and the membership
// roster that scopes who can be selected as a payer/participant. Stored as
// `app_group` because GROUP is a SQL reserved word.
export const group = sqliteTable("app_group", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const groupMember = sqliteTable(
	"group_member",
	{
		id: text("id").primaryKey(),
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		joinedAt: integer("joined_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("group_member_group_user_unique").on(
			table.groupId,
			table.userId,
		),
	],
);

// `groupId` is nullable so a schema push doesn't fail on pre-existing
// expense rows. Reads always filter by an explicit groupId, so any orphans
// are simply invisible until manually cleaned up.
export const expense = sqliteTable("expense", {
	id: text("id").primaryKey(),
	kind: text("kind", { enum: ["expense", "settlement"] })
		.$defaultFn(() => "expense")
		.notNull(),
	groupId: text("group_id").references(() => group.id, {
		onDelete: "cascade",
	}),
	description: text("description").notNull(),
	amountCents: integer("amount_cents").notNull(),
	paidByUserId: text("paid_by_user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const expenseSplit = sqliteTable(
	"expense_split",
	{
		id: text("id").primaryKey(),
		expenseId: text("expense_id")
			.notNull()
			.references(() => expense.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		amountCents: integer("amount_cents").notNull(),
	},
	(table) => [
		uniqueIndex("expense_split_expense_user_unique").on(
			table.expenseId,
			table.userId,
		),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	expensesPaid: many(expense),
	splits: many(expenseSplit),
	memberships: many(groupMember),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
	createdBy: one(user, {
		fields: [group.createdByUserId],
		references: [user.id],
	}),
	members: many(groupMember),
	expenses: many(expense),
}));

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
	group: one(group, {
		fields: [groupMember.groupId],
		references: [group.id],
	}),
	user: one(user, {
		fields: [groupMember.userId],
		references: [user.id],
	}),
}));

export const expenseRelations = relations(expense, ({ one, many }) => ({
	paidBy: one(user, {
		fields: [expense.paidByUserId],
		references: [user.id],
	}),
	group: one(group, {
		fields: [expense.groupId],
		references: [group.id],
	}),
	splits: many(expenseSplit),
}));

export const expenseSplitRelations = relations(expenseSplit, ({ one }) => ({
	expense: one(expense, {
		fields: [expenseSplit.expenseId],
		references: [expense.id],
	}),
	user: one(user, {
		fields: [expenseSplit.userId],
		references: [user.id],
	}),
}));

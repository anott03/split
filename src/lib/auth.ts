import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
	}),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					if (!user) return;
					await db
						.insert(schema.userData)
						.values({ userId: user.id })
						.onConflictDoNothing();
				},
			},
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: ["http://localhost:3000", "https://split.twdl.us"],
});

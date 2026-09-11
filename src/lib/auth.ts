import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { isSignUpEnabled } from "@/lib/flags";
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
	hooks: {
		// Gate account creation behind the `sign-up-enabled` Flagship flag
		// (see src/lib/flags.ts). Enforcing it here means the API rejects
		// sign-up requests even if the client UI is bypassed.
		before: createAuthMiddleware(async (ctx) => {
			if (!ctx.path.startsWith("/sign-up")) return;

			const enabled = await isSignUpEnabled(
				typeof ctx.body?.email === "string" ? ctx.body.email : undefined,
			);
			if (!enabled) {
				throw new APIError("FORBIDDEN", {
					message: "Account creation is currently disabled.",
				});
			}
		}),
	},
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:8787",
        "https://split.twdl.us"
    ],
});

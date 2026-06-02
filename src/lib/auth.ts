import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const { env } = getCloudflareContext();
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
	}),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        "http://localhost:3000",
        env.BETTER_AUTH_URL,
    ],
});

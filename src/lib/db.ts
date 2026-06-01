import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/lib/schema";

// `wrangler.jsonc` declares a D1 binding called `DB`. Run `pnpm cf-typegen`
// to regenerate `cloudflare-env.d.ts` so `CloudflareEnv` picks it up; this
// augmentation makes the binding known to TS until that happens.
declare global {
	interface CloudflareEnv {
		DB: D1Database;
	}
}

type Database = DrizzleD1Database<typeof schema>;

let cached: Database | undefined;

function getDb(): Database {
	if (cached) return cached;
	const { env } = getCloudflareContext();
	cached = drizzle(env.DB, { schema });
	return cached;
}

// better-auth's drizzleAdapter expects a Drizzle instance synchronously at
// import time, but D1 bindings are only available inside a request scope on
// Cloudflare Workers. Proxy method/property access so the underlying Drizzle
// instance is constructed lazily on first use.
export const db = new Proxy({} as Database, {
	get(_target, prop, receiver) {
		const target = getDb();
		const value = Reflect.get(target, prop, receiver);
		return typeof value === "function" ? value.bind(target) : value;
	},
});

import { getCloudflareContext } from "@opennextjs/cloudflare";

// `wrangler.jsonc` declares a Flagship binding called `FLAGS`. Run
// `pnpm cf-typegen` to regenerate `cloudflare-env.d.ts` so `CloudflareEnv`
// picks it up; this augmentation makes the binding known to TS until that
// happens. (Same pattern as the D1 `DB` augmentation in `src/lib/db.ts`.)
declare global {
	interface CloudflareEnv {
		FLAGS: Flagship;
	}
}

// Boolean flag managed in the Flagship dashboard (Compute → Flagship).
const SIGN_UP_ENABLED_FLAG = "sign-up-enabled";

/**
 * Whether visitors may create new accounts.
 *
 * Evaluated server-side through the Cloudflare Flagship binding. The
 * attempted email is passed as the `userId` targeting attribute, so
 * allowlist / percentage-rollout targeting rules can be applied to the
 * flag in the dashboard.
 *
 * Defaults to open (`true`) when the binding is unavailable (e.g. local
 * dev before the Flagship app is configured) or evaluation fails, so
 * account creation is only restricted when the flag explicitly returns
 * `false`. Flag changes in the dashboard propagate within seconds.
 */
export async function isSignUpEnabled(email?: string): Promise<boolean> {
	try {
		const { env } = getCloudflareContext();
		const flags = env.FLAGS;
		if (!flags) return true;

		const context = email ? { userId: email } : undefined;
		return await flags.getBooleanValue(SIGN_UP_ENABLED_FLAG, true, context);
	} catch {
		// Flagship unreachable or misconfigured: fall back to open sign-up
		// rather than taking down the sign-in page or auth routes.
		return true;
	}
}

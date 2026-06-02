import { createAuthClient } from "better-auth/react"
import { getCloudflareContext } from "@opennextjs/cloudflare";

const { env } = getCloudflareContext();
export const authClient = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
})

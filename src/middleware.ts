import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// NOTE: This is intentionally `middleware.ts` (not `proxy.ts`).
//
// Next.js 16 renamed the convention to `proxy.ts` and made it default
// (and currently *force*) the Node.js runtime — Next's SWC even rejects
// `export const config = { runtime: 'edge' }` inside `proxy.ts`. OpenNext
// for Cloudflare Workers, however, requires the edge runtime. The supported
// workaround (see opennextjs/opennextjs-cloudflare#1213) is to keep the
// legacy `middleware.ts` filename and opt into `experimental-edge`. Once
// OpenNext supports Next 16's Node.js proxy, this can be migrated.
export function middleware(request: NextRequest) {
	// Optimistic check: presence of the session cookie only. This is fast
	// (no DB call) but NOT a security boundary — server components and
	// route handlers must still call `auth.api.getSession` to validate.
	const sessionCookie = getSessionCookie(request);

	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/signin", request.url));
	}

	return NextResponse.next();
}

export const config = {
	runtime: "experimental-edge",
	// Run on every path except:
	// - /signin                  (the only public page)
	// - /api/auth/*              (better-auth handlers themselves)
	// - /_next/static, /_next/image, and public files with extensions
	//   (PWA manifest/service worker/icons, favicon, robots.txt, etc.)
	matcher: [
		"/((?!signin|api/auth|_next/static|_next/image|.*\\..*).*)",
	],
};

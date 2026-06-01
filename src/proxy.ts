import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
	// Run on every path except:
	// - /signin                  (the only public page)
	// - /api/auth/*              (better-auth handlers themselves)
	// - /_next/static, /_next/image, favicon.ico, etc. (Next internals + assets)
	matcher: [
		"/((?!signin|api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
	],
};

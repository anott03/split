import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isSignUpEnabled } from "@/lib/flags";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session) {
		redirect("/");
	}

	// Mirror the `sign-up-enabled` flag in the UI; the Better Auth before
	// hook enforces it server-side as well.
	const signUpEnabled = await isSignUpEnabled();

	return (
		<main className="flex min-h-screen items-center justify-center bg-background font-mono text-foreground">
			<div className="flex flex-col w-full h-screen max-w-250 p-5 border-x border-border">
				<h1 className="mb-4 text-2xl font-semibold font-mono">
					<i>SPLIT.</i>
				</h1>
                <div className="flex-1 w-full flex flex-col justify-center items-center">
				    <SignInForm signUpEnabled={signUpEnabled} />
                </div>
			</div>
		</main>
	);
}

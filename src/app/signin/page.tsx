import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session) {
		redirect("/");
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-stone-200 font-mono">
			<div className="flex flex-col w-full h-screen max-w-250 p-5 text-stone-900 border-x border-stone-900">
				<h1 className="mb-4 text-2xl font-semibold font-mono">
					<i>SPLIT.</i>
				</h1>
                <div className="flex-1 w-full flex flex-col justify-center items-center">
				    <SignInForm />
                </div>
			</div>
		</main>
	);
}

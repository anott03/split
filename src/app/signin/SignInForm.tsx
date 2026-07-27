"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function SignInForm() {
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isSignUp = mode === "signup";

	function toggleMode() {
		setMode((prev) => (prev === "signin" ? "signup" : "signin"));
		setError(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const { error: authError } = isSignUp
			? await authClient.signUp.email({ name, email, password })
			: await authClient.signIn.email({ email, password });

		if (authError) {
			setError(
				authError.message ??
					(isSignUp ? "Unable to create account." : "Unable to sign in."),
			);
			setIsSubmitting(false);
			return;
		}

		// Refresh server components and navigate home. The proxy will now
		// see the session cookie and allow access.
		router.replace("/");
		router.refresh();
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 w-full max-w-sm font-mono text-foreground"
		>
			{isSignUp ? (
				<label className="flex flex-col gap-1 text-sm">
					<span>name</span>
					<input
						type="text"
						autoComplete="name"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={isSubmitting}
						className="border-b border-foreground bg-transparent px-1 py-1 outline-none focus:border-b-2 disabled:opacity-60"
					/>
				</label>
			) : null}

			<label className="flex flex-col gap-1 text-sm">
				<span>email</span>
				<input
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					disabled={isSubmitting}
					className="border-b border-foreground bg-transparent px-1 py-1 outline-none focus:border-b-2 disabled:opacity-60"
				/>
			</label>

			<label className="flex flex-col gap-1 text-sm">
				<span>password</span>
				<input
					type="password"
					autoComplete={isSignUp ? "new-password" : "current-password"}
					required
					minLength={8}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					disabled={isSubmitting}
					className="border-b border-foreground bg-transparent px-1 py-1 outline-none focus:border-b-2 disabled:opacity-60"
				/>
			</label>

			{error ? (
				<p role="alert" className="text-sm text-red-700 dark:text-red-400">
					{error}
				</p>
			) : null}

			<button
				type="submit"
				disabled={isSubmitting}
				className="mt-2 self-start border border-foreground bg-foreground px-4 py-2 text-sm text-background hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isSubmitting
					? isSignUp
						? "creating account..."
						: "signing in..."
					: isSignUp
						? "create account"
						: "sign in"}
			</button>

			<button
				type="button"
				onClick={toggleMode}
				disabled={isSubmitting}
				className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
			>
				{isSignUp
					? "have an account? sign in"
					: "need an account? create one"}
			</button>
		</form>
	);
}

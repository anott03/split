"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);

	async function handleSignOut() {
		setIsSigningOut(true);
		await authClient.signOut();
		router.replace("/signin");
		router.refresh();
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleSignOut}
			disabled={isSigningOut}
		>
			<LogOut />
			{isSigningOut ? "signing out..." : "sign out"}
		</Button>
	);
}

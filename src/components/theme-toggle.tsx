"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const [mounted, setMounted] = useState(false);
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		setMounted(true);
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	function toggle() {
		const root = document.documentElement;
		const nextDark = !root.classList.contains("dark");
		if (nextDark) {
			root.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			root.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
		setIsDark(nextDark);
	}

	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon-sm"
				disabled
				aria-hidden
			/>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={toggle}
			aria-label={isDark ? "switch to light mode" : "switch to dark mode"}
		>
			{isDark ? (
				<Sun className="size-4" />
			) : (
				<Moon className="size-4" />
			)}
		</Button>
	);
}

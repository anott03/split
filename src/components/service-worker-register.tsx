"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (!("serviceWorker" in navigator)) return;

		navigator.serviceWorker.register("/sw.js").catch(() => {
			// The app remains usable if registration fails; avoid surfacing noisy errors.
		});
	}, []);

	return null;
}

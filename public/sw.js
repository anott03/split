const CACHE_VERSION = "split-static-v1";
const STATIC_PATHS = new Set([
	"/favicon.svg",
	"/manifest.webmanifest",
	"/apple-touch-icon.png",
	"/icons/icon-192.png",
	"/icons/icon-512.png",
	"/icons/icon-maskable-512.png",
]);

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			.then((cache) => cache.addAll(Array.from(STATIC_PATHS)))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_VERSION)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;

	if (STATIC_PATHS.has(url.pathname) || url.pathname.startsWith("/_next/static/")) {
		event.respondWith(cacheFirst(request));
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(
				() =>
					new Response("Split is offline. Reconnect to load your latest data.", {
						status: 503,
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					}),
			),
		);
	}
});

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	if (response.ok) {
		const cache = await caches.open(CACHE_VERSION);
		cache.put(request, response.clone());
	}

	return response;
}

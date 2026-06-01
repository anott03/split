/**
 * Format an integer number of cents as a USD string, e.g. 1234 -> "$12.34".
 */
export function formatCents(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(cents);
	const dollars = Math.floor(abs / 100);
	const remainder = abs % 100;
	return `${sign}$${dollars}.${remainder.toString().padStart(2, "0")}`;
}

/**
 * Parse a user-entered dollar string ("12", "12.3", "12.34") into integer
 * cents. Returns null if the string can't be parsed or has more than 2
 * decimal places.
 */
export function parseDollarsToCents(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
	const [whole, fraction = ""] = trimmed.split(".");
	const paddedFraction = (fraction + "00").slice(0, 2);
	const sign = whole.startsWith("-") ? -1 : 1;
	const wholeAbs = whole.replace("-", "");
	const cents =
		sign * (Number(wholeAbs) * 100 + Number(paddedFraction || "0"));
	if (!Number.isFinite(cents)) return null;
	return cents;
}

/**
 * Distribute `totalCents` across `n` participants as evenly as possible.
 * Any remainder cent(s) are added to the first participants in order.
 * Result always sums to `totalCents` exactly.
 */
export function distributeEqually(totalCents: number, n: number): number[] {
	if (n <= 0) return [];
	const base = Math.floor(totalCents / n);
	const remainder = totalCents - base * n;
	const result = new Array<number>(n).fill(base);
	for (let i = 0; i < remainder; i++) result[i] += 1;
	return result;
}

/**
 * Format a Date relative to now ("just now", "5m ago", "2h ago", "yesterday",
 * or an absolute "MMM D" for older items).
 */
export function formatRelativeDate(date: Date): string {
	const now = Date.now();
	const diffMs = now - date.getTime();
	const minutes = Math.floor(diffMs / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "yesterday";
	if (days < 7) return `${days}d ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

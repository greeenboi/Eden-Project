import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null) {
	if (!seconds) return "--:--";
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Generate gradient colors based on user ID or email
export function generateGradientColors(seed: string): [string, string, string] {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	const hue1 = Math.abs(hash % 360);
	const hue2 = (hue1 + 45) % 360;
	const hue3 = (hue1 + 90) % 360;

	return [
		`hsl(${hue1}, 70%, 50%)`,
		`hsl(${hue2}, 65%, 45%)`,
		`hsl(${hue3}, 60%, 40%)`,
	];
}

export function getInitials(name: string | undefined): string {
	if (name === undefined){
		return "null"
	}
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}
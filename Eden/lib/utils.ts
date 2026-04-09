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
	if (name === undefined) {
		return "null";
	}
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const RGB_LIKE = /^rgba?\(/i;
const HSL_LIKE = /^hsla?\(/i;

function parseHexColor(hex: string): { r: number; g: number; b: number; a: number } | null {
	const value = hex.trim().replace("#", "");

	if (value.length === 3) {
		const r = Number.parseInt(`${value[0]}${value[0]}`, 16);
		const g = Number.parseInt(`${value[1]}${value[1]}`, 16);
		const b = Number.parseInt(`${value[2]}${value[2]}`, 16);
		return { r, g, b, a: 1 };
	}

	if (value.length === 4) {
		const r = Number.parseInt(`${value[0]}${value[0]}`, 16);
		const g = Number.parseInt(`${value[1]}${value[1]}`, 16);
		const b = Number.parseInt(`${value[2]}${value[2]}`, 16);
		const a = Number.parseInt(`${value[3]}${value[3]}`, 16) / 255;
		return { r, g, b, a };
	}

	if (value.length === 6) {
		const r = Number.parseInt(value.slice(0, 2), 16);
		const g = Number.parseInt(value.slice(2, 4), 16);
		const b = Number.parseInt(value.slice(4, 6), 16);
		return { r, g, b, a: 1 };
	}

	if (value.length === 8) {
		const r = Number.parseInt(value.slice(0, 2), 16);
		const g = Number.parseInt(value.slice(2, 4), 16);
		const b = Number.parseInt(value.slice(4, 6), 16);
		const a = Number.parseInt(value.slice(6, 8), 16) / 255;
		return { r, g, b, a };
	}

	return null;
}

function formatAlpha(alpha: number): string {
	const clamped = Math.max(0, Math.min(1, alpha));
	return Number(clamped.toFixed(3)).toString();
}

export function toComposeColor(color: string): string {
	const value = color.trim();
	if (RGB_LIKE.test(value) || HSL_LIKE.test(value)) {
		return value;
	}

	const parsed = parseHexColor(value);
	if (parsed) {
		if (parsed.a >= 1) {
			return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
		}
		return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${formatAlpha(parsed.a)})`;
	}

	return "rgb(0, 0, 0)";
}

export function withComposeAlpha(color: string, alpha: number): string {
	const base = toComposeColor(color);
	const rgbMatch =
		base.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i) ??
		base.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);

	if (!rgbMatch) {
		return base;
	}

	const r = Number.parseInt(rgbMatch[1], 10);
	const g = Number.parseInt(rgbMatch[2], 10);
	const b = Number.parseInt(rgbMatch[3], 10);
	const a = formatAlpha(alpha);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

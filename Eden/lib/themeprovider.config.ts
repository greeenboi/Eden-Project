import { Platform } from "react-native";
import "../global.css";

// Custom theme based on global.css color variables
const WEB_FONT_STACK =
	'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

// HSL to RGB conversion helper
const hslToRgb = (h: number, s: number, l: number): string => {
	const sNorm = s / 100;
	const lNorm = l / 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = sNorm * Math.min(lNorm, 1 - lNorm);
	const f = (n: number) =>
		lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return `rgb(${Math.round(255 * f(0))}, ${Math.round(255 * f(8))}, ${Math.round(255 * f(4))})`;
};

export const LightTheme = {
	dark: false,
	colors: {
		primary: hslToRgb(72.3077, 33.0508, 46.2745), // --primary
		background: hslToRgb(44.5161, 48.4375, 74.902), // --secondary
		card: hslToRgb(42.0, 45.4545, 82.7451), // --card
		text: hslToRgb(26.0, 19.4805, 30.1961), // --foreground
		border: hslToRgb(26.25, 23.5294, 60), // --border
		notification: hslToRgb(8.5714, 54.491, 67.2549), // --destructive
	},
	fonts: Platform.select({
		web: {
			regular: {
				fontFamily: WEB_FONT_STACK,
				fontWeight: "400" as const,
			},
			medium: {
				fontFamily: WEB_FONT_STACK,
				fontWeight: "500" as const,
			},
			bold: {
				fontFamily: WEB_FONT_STACK,
				fontWeight: "600" as const,
			},
			heavy: {
				fontFamily: WEB_FONT_STACK,
				fontWeight: "700" as const,
			},
		},
		ios: {
			regular: {
				fontFamily: "System",
				fontWeight: "400" as const,
			},
			medium: {
				fontFamily: "System",
				fontWeight: "500" as const,
			},
			bold: {
				fontFamily: "System",
				fontWeight: "600" as const,
			},
			heavy: {
				fontFamily: "System",
				fontWeight: "700" as const,
			},
		},
		default: {
			regular: {
				fontFamily: "sans-serif",
				fontWeight: "normal" as const,
			},
			medium: {
				fontFamily: "sans-serif-medium",
				fontWeight: "normal" as const,
			},
			bold: {
				fontFamily: "sans-serif",
				fontWeight: "600" as const,
			},
			heavy: {
				fontFamily: "sans-serif",
				fontWeight: "700" as const,
			},
		},
	}),
};

export const DarkThemeCustom = {
	dark: true,
	colors: {
		primary: hslToRgb(95.0, 15.7895, 55.2941), // --primary (dark)
		background: hslToRgb(40, 13.2075, 31.1765), // --secondary (dark)
		card: hslToRgb(38.5714, 12.069, 22.7451), // --card (dark)
		text: hslToRgb(38.4, 40.9836, 88.0392), // --foreground (dark)
		border: hslToRgb(40, 13.2075, 31.1765), // --border (dark)
		notification: hslToRgb(9.6, 33.6323, 56.2745), // --destructive (dark)
	},
	fonts: LightTheme.fonts,
};

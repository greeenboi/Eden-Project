import { Platform } from "react-native";
import "../global.css";
import { THEME } from "./theme";

// Custom theme based on global.css color variables via theme.ts (single source of truth)
const WEB_FONT_STACK =
	'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

export const LightTheme = {
	dark: false,
	colors: {
		primary: THEME.light.primary,
		background: THEME.light.background,
		card: THEME.light.card,
		text: THEME.light.foreground,
		border: THEME.light.border,
		notification: THEME.light.destructive,
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
		primary: THEME.dark.primary,
		background: THEME.dark.background,
		card: THEME.dark.card,
		text: THEME.dark.foreground,
		border: THEME.dark.border,
		notification: THEME.dark.destructive,
	},
	fonts: LightTheme.fonts,
};

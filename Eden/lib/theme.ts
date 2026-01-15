import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

/**
 * Theme constants that match the CSS variables in global.css
 * This serves as the single source of truth for colors in the app
 * All values here must stay in sync with global.css
 */
export const THEME = {
	light: {
		background: "#fff0f8",
		foreground: "#91185c",
		card: "#fff7fc",
		cardForeground: "#91185c",
		popover: "#fff7fc",
		popoverForeground: "#91185c",
		primary: "#e6067a",
		primaryForeground: "#ffffff",
		secondary: "#ffd6ff",
		secondaryForeground: "#91185c",
		muted: "#ffe3f2",
		mutedForeground: "#c04283",
		accent: "#ffc1e3",
		accentForeground: "#91185c",
		destructive: "#d13869",
		destructiveForeground: "#ffffff",
		border: "#ffc7e6",
		input: "#ffd6ff",
		ring: "#e6067a",
		radius: "0.5rem",
		chart1: "#e6067a",
		chart2: "#c44b97",
		chart3: "#9969b6",
		chart4: "#7371bf",
		chart5: "#5e84ff",
		// Additional semantic colors
		success: "#22c55e",
		successForeground: "#ffffff",
	},
	dark: {
		background: "#1a0922",
		foreground: "#ffb3ff",
		card: "#2a1435",
		cardForeground: "#ffb3ff",
		popover: "#2a1435",
		popoverForeground: "#ffb3ff",
		primary: "#ff6bef",
		primaryForeground: "#180518",
		secondary: "#46204f",
		secondaryForeground: "#ffb3ff",
		muted: "#331941",
		mutedForeground: "#d67ad6",
		accent: "#5a1f5d",
		accentForeground: "#ffb3ff",
		destructive: "#ff2876",
		destructiveForeground: "#f9f9f9",
		border: "#4a1b5f",
		input: "#46204f",
		ring: "#ff6bef",
		radius: "0.5rem",
		chart1: "#ff6bef",
		chart2: "#c359e3",
		chart3: "#9161ff",
		chart4: "#6f73e2",
		chart5: "#547aff",
		// Additional semantic colors
		success: "#22c55e",
		successForeground: "#ffffff",
	},
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
	light: {
		...DefaultTheme,
		colors: {
			background: THEME.light.background,
			border: THEME.light.border,
			card: THEME.light.card,
			notification: THEME.light.destructive,
			primary: THEME.light.primary,
			text: THEME.light.foreground,
		},
	},
	dark: {
		...DarkTheme,
		colors: {
			background: THEME.dark.background,
			border: THEME.dark.border,
			card: THEME.dark.card,
			notification: THEME.dark.destructive,
			primary: THEME.dark.primary,
			text: THEME.dark.foreground,
		},
	},
};

/**
 * Helper to get theme-aware colors based on color scheme
 */
export function getThemeColors(isDark: boolean) {
	return isDark ? THEME.dark : THEME.light;
}

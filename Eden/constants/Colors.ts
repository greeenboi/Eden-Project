/**
 * Color palette that matches the CSS variables in global.css
 * This is the single source of truth for colors throughout the app
 * All values here must stay in sync with global.css
 */
const palette = {
	light: {
		text: "#91185c",
		background: "#fff0f8",
		tint: "#e6067a",
		tabIconDefault: "#c04283",
		tabIconSelected: "#e6067a",
		primary: "#e6067a",
		primaryForeground: "#ffffff",
		secondary: "#ffd6ff",
		secondaryForeground: "#91185c",
		accent: "#ffc1e3",
		muted: "#ffe3f2",
		mutedForeground: "#c04283",
		border: "#ffc7e6",
		card: "#fff7fc",
		cardForeground: "#91185c",
		destructive: "#d13869",
		destructiveForeground: "#ffffff",
		success: "#22c55e",
		successForeground: "#ffffff",
	},
	dark: {
		text: "#ffb3ff",
		background: "#1a0922",
		tint: "#ff6bef",
		tabIconDefault: "#d67ad6",
		tabIconSelected: "#ff6bef",
		primary: "#ff6bef",
		primaryForeground: "#180518",
		secondary: "#46204f",
		secondaryForeground: "#ffb3ff",
		accent: "#5a1f5d",
		muted: "#331941",
		mutedForeground: "#d67ad6",
		border: "#4a1b5f",
		card: "#2a1435",
		cardForeground: "#ffb3ff",
		destructive: "#ff2876",
		destructiveForeground: "#f9f9f9",
		success: "#22c55e",
		successForeground: "#ffffff",
	},
} as const;

export default palette;

/**
 * Helper type for accessing color keys
 */
export type ColorKey = keyof typeof palette.light;

/**
 * Helper to get theme-aware colors based on color scheme
 * @param isDark - Whether dark mode is enabled
 * @returns The appropriate color palette
 */
export function getColors(isDark: boolean) {
	return isDark ? palette.dark : palette.light;
}

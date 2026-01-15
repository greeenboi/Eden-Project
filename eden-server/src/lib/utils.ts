/**
 * Utility functions for the Eden server
 */

/**
 * Safely serialize a date value to ISO string
 * D1 returns dates as strings, not Date objects, so this handles both cases
 *
 * @param date - Date object, ISO string, null, or undefined
 * @returns ISO date string or empty string if null/undefined
 */
export function serializeDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	if (typeof date === "string") return date;
	if (date instanceof Date) return date.toISOString();
	return "";
}

/**
 * Safely serialize a date value to ISO string, returning null for null/undefined
 * Use this when the field is nullable and should remain null in the response
 *
 * @param date - Date object, ISO string, null, or undefined
 * @returns ISO date string or null
 */
export function serializeDateOrNull(
	date: Date | string | null | undefined,
): string | null {
	if (!date) return null;
	if (typeof date === "string") return date;
	if (date instanceof Date) return date.toISOString();
	return null;
}

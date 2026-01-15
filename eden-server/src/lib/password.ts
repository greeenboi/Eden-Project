/**
 * Password hashing utilities using Web Crypto API
 * Uses PBKDF2 with SHA-256 for secure password storage
 */

const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt,
			iterations: ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		KEY_LENGTH * 8,
	);

	const hashArray = new Uint8Array(derivedBits);

	// Combine salt + hash and encode as base64
	const combined = new Uint8Array(salt.length + hashArray.length);
	combined.set(salt);
	combined.set(hashArray, salt.length);

	return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	try {
		const encoder = new TextEncoder();
		const combined = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));

		const salt = combined.slice(0, SALT_LENGTH);
		const storedHash = combined.slice(SALT_LENGTH);

		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			encoder.encode(password),
			"PBKDF2",
			false,
			["deriveBits"],
		);

		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: "PBKDF2",
				salt,
				iterations: ITERATIONS,
				hash: "SHA-256",
			},
			keyMaterial,
			KEY_LENGTH * 8,
		);

		const computedHash = new Uint8Array(derivedBits);

		// Constant-time comparison
		if (computedHash.length !== storedHash.length) return false;

		let diff = 0;
		for (let i = 0; i < computedHash.length; i++) {
			diff |= computedHash[i] ^ storedHash[i];
		}

		return diff === 0;
	} catch {
		return false;
	}
}

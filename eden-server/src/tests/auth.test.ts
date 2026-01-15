import { describe, it, expect, beforeEach } from "vitest";
import {
	extractBearerToken,
	generateJWT,
	verifyJWT,
	AuthenticationError,
} from "../lib/auth";

describe("Authentication", () => {
	const TEST_SECRET = "test-secret-key-for-jwt";

	describe("extractBearerToken", () => {
		it("should extract token from valid Bearer header", () => {
			const token = extractBearerToken("Bearer abc123");
			expect(token).toBe("abc123");
		});

		it("should return null for missing header", () => {
			const token = extractBearerToken(undefined);
			expect(token).toBeNull();
		});

		it("should return null for invalid format", () => {
			expect(extractBearerToken("abc123")).toBeNull();
			expect(extractBearerToken("Basic abc123")).toBeNull();
			expect(extractBearerToken("Bearer")).toBeNull();
		});
	});

	describe("JWT generation and verification", () => {
		it("should generate and verify valid JWT", async () => {
			const payload = {
				sub: "user-123",
				role: "artist" as const,
			};

			const token = await generateJWT(payload, TEST_SECRET, 3600);
			expect(token).toBeDefined();
			expect(token.split(".")).toHaveLength(3);

			const verified = await verifyJWT(token, TEST_SECRET);
			expect(verified.sub).toBe("user-123");
			expect(verified.role).toBe("artist");
			expect(verified.iat).toBeDefined();
			expect(verified.exp).toBeDefined();
		});

		it("should reject token with invalid signature", async () => {
			const payload = { sub: "user-123", role: "user" as const };
			const token = await generateJWT(payload, TEST_SECRET, 3600);

			await expect(verifyJWT(token, "wrong-secret")).rejects.toThrow(
				AuthenticationError,
			);
		});

		it("should reject expired token", async () => {
			const payload = { sub: "user-123", role: "user" as const };
			const token = await generateJWT(payload, TEST_SECRET, -1); // expired 1 second ago

			await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow(
				"Token expired",
			);
		});

		it("should reject malformed token", async () => {
			await expect(verifyJWT("not.a.valid.jwt", TEST_SECRET)).rejects.toThrow(
				AuthenticationError,
			);
		});

		it("should include custom claims", async () => {
			const payload = {
				sub: "artist-456",
				role: "artist" as const,
				artistName: "Test Artist",
				verified: true,
			};

			const token = await generateJWT(payload, TEST_SECRET, 3600);
			const verified = await verifyJWT(token, TEST_SECRET);

			expect(verified.artistName).toBe("Test Artist");
			expect(verified.verified).toBe(true);
		});
	});
});

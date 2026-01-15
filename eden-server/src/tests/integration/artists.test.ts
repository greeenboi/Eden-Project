import { describe, it, expect } from "vitest";
import { env, SELF } from "cloudflare:test";

describe("Artist API", () => {
	describe("POST /api/artists", () => {
		it("should create a new artist", async () => {
			const response = await SELF.fetch("http://localhost/api/artists", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "Test Artist",
					email: "testartist@example.com",
					bio: "A test artist bio",
				}),
			});

			expect(response.status).toBe(201);
			const data = (await response.json()) as {
				id: string;
				name: string;
				email: string;
				bio: string | null;
			};
			expect(data.id).toBeDefined();
			expect(data.name).toBe("Test Artist");
			expect(data.email).toBe("testartist@example.com");
			expect(data.bio).toBe("A test artist bio");
		});

		it("should reject invalid artist data", async () => {
			const response = await app.request("/api/artists", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					// missing required name and email fields
					bio: "A bio without a name",
				}),
			});

			expect(response.status).toBe(400);
		});
	});

	describe("GET /api/artists/:id", () => {
		it("should return 404 for non-existent artist", async () => {
			const response = await app.request("/api/artists/nonexistent-id");
			expect(response.status).toBe(404);
		});
	});
});

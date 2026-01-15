import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { Env } from "../lib/db";
import { AdminView } from "../views/admin";
import { IndexView } from "../views/index";

/**
 * Register home, health, and admin routes
 */
export function registerHomeRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
	// ============================================================================
	// Health & Status Routes
	// ============================================================================

	const HealthResponseSchema = z
		.object({
			status: z.string().openapi({ example: "ok" }),
			timestamp: z.string().openapi({ example: "2025-11-20T12:00:00Z" }),
			version: z.string().openapi({ example: "1.0.0" }),
			database: z.string().openapi({ example: "connected" }),
		})
		.openapi("Health");

	const healthRoute = createRoute({
		method: "get",
		path: "/health",
		tags: ["System"],
		summary: "Health check",
		description: "Check API health and database connectivity",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: HealthResponseSchema,
					},
				},
				description: "Service is healthy",
			},
		},
	});

	app.openapi(healthRoute, async (c) => {
		// Check database connection
		let dbStatus = "unknown";
		try {
			const result = await c.env.eden_db_main.prepare("SELECT 1").first();
			dbStatus = result ? "connected" : "error";
		} catch (error) {
			dbStatus = "error";
			console.error("Database health check failed:", error);
		}

		return c.json({
			status: dbStatus === "connected" ? "ok" : "degraded",
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			database: dbStatus,
		});
	});

	// Root endpoint
	const rootRoute = createRoute({
		method: "get",
		path: "/",
		tags: ["System"],
		summary: "API information",
		description: "Get basic API information and available endpoints",
		responses: {
			200: {
				content: {
					"application/json": {
						schema: z.object({
							name: z.string(),
							version: z.string(),
							documentation: z.string(),
							admin: z.string(),
						}),
					},
				},
				description: "API information",
			},
		},
	});

	app.openapi(rootRoute, (c) => {
		return c.json({
			name: "Eden Server API",
			version: "1.0.0",
			documentation: "/scalar",
			admin: "/admin",
		});
	});

	// Home page with UI
	app.get("/home", (c) => {
		return c.render(<IndexView />);
	});

	// Admin UI page
	app.get("/admin", (c) => {
		return c.render(
			<>
				<AdminView />
				<script type="module" src="/src/admin.ts" />
			</>,
		);
	});
}

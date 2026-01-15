/**
 * Track Routes
 *
 * Registers track-related endpoints to the Hono app.
 * Handles track metadata CRUD, listing, searching, and streaming URL generation.
 */

import type { OpenAPIHono } from "@hono/zod-openapi";
import {
	createTrackHandler,
	createTrackRoute,
	deleteTrackHandler,
	deleteTrackRoute,
	getPublishedTracksHandler,
	getPublishedTracksRoute,
	getTrackHandler,
	getTrackRoute,
	getTrackStreamHandler,
	getTrackStreamRoute,
	listTracksHandler,
	listTracksRoute,
	searchTracksHandler,
	searchTracksRoute,
	updateTrackHandler,
	updateTrackRoute,
	updateTrackStatusHandler,
	updateTrackStatusRoute,
} from "../controllers/track.controller";
import type { Env } from "../lib/db";

/**
 * Register track routes to the provided Hono app instance
 */
export function registerTrackRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
	// Register static/non-param routes first to avoid /:id shadowing
	// GET /api/tracks/search - Search tracks by title, artist, or album
	app.openapi(searchTracksRoute, searchTracksHandler as never);

	// GET /api/tracks/published - Get published tracks only (streaming-ready)
	app.openapi(getPublishedTracksRoute, getPublishedTracksHandler as never);

	// GET /api/tracks - List tracks (with optional filtering and pagination)
	app.openapi(listTracksRoute, listTracksHandler as never);

	// POST /api/tracks - Create a new track (used internally after upload completion)
	app.openapi(createTrackRoute, createTrackHandler as never);

	// GET /api/tracks/:id - Get track metadata by ID
	app.openapi(getTrackRoute, getTrackHandler as never);

	// PATCH /api/tracks/:id - Update track metadata
	app.openapi(updateTrackRoute, updateTrackHandler as never);

	// PATCH /api/tracks/:id/status - Update track status
	app.openapi(updateTrackStatusRoute, updateTrackStatusHandler as never);

	// DELETE /api/tracks/:id - Delete track and associated R2 objects
	app.openapi(deleteTrackRoute, deleteTrackHandler as never);

	// GET /api/tracks/:id/stream - Get streaming URL for track
	app.openapi(getTrackStreamRoute, getTrackStreamHandler as never);
}

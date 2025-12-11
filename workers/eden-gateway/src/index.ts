import { fromHono } from "chanfana";
import { Hono } from "hono";
import { DownloaderJobCreate } from "./endpoints/downloaderJobCreate";
import { JobStatus } from "./endpoints/jobStatus";
import { getDownloaderWorker } from "./queue";

// Start a Hono app
const app = new Hono<{ Bindings: import("./types").GatewayEnv }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.post("/api/jobs/downloader", DownloaderJobCreate);
openapi.get("/api/jobs/:jobId", JobStatus);

// Start worker to process jobs and forward to downloader service
try {
	getDownloaderWorker({ REDIS_URL: process.env.REDIS_URL, DOWNLOADER_SERVICE_URL: process.env.DOWNLOADER_SERVICE_URL });
} catch (err) {
	console.error("Failed to start downloader worker", err);
}

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;

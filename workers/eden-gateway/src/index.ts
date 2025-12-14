import { fromHono } from "chanfana";
import { Hono } from "hono";
import { DownloaderQueueDO } from "./downloaderQueueDO";
import { DownloaderJobCreate } from "./endpoints/downloaderJobCreate";
import { JobStatus } from "./endpoints/jobStatus";

// Start a Hono app
const app = new Hono<{ Bindings: import("./types").GatewayEnv }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.post("/api/jobs/downloader", DownloaderJobCreate);
openapi.get("/api/jobs/:jobId", JobStatus);

// Export Durable Object class for binding
export { DownloaderQueueDO };

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;

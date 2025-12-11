import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { downloaderJobName, getDownloaderQueue } from "../queue";
import { type AppContext, DownloaderJobPayload } from "../types";

export class DownloaderJobCreate extends OpenAPIRoute {
	schema = {
		tags: ["Downloader"],
		summary: "Enqueue a YouTube-to-OGG downloader job",
		request: {
			body: {
				content: {
					"application/json": {
						schema: DownloaderJobPayload,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Job enqueued",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							jobId: z.string(),
							queue: z.string(),
						}),
					},
				},
			},
			"503": {
				description: "Queue unavailable",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							error: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const payload = data.body;

		console.log("[eden-gateway] enqueue request", {
			url: payload.url,
			artist: payload.artist?.name,
			track: payload.track?.title,
		});

		try {
			const queue = getDownloaderQueue(c.env);
			const job = await queue.add(downloaderJobName, payload, {
				removeOnComplete: 100,
				removeOnFail: 100,
			});

			return {
				success: true,
				jobId: job.id,
				queue: queue.name,
			};
		} catch (error) {
			console.error("queue enqueue failed", error);
			const message = error instanceof Error ? error.message : "Queue unavailable. Check Redis configuration.";
			return Response.json(
				{
					success: false,
					error: message,
				},
				{ status: 503 },
			);
		}
	}
}
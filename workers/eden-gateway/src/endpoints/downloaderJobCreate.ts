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
			return Response.json(
				{
					success: false,
					error: "Queue unavailable. Check Redis configuration.",
				},
				{ status: 503 },
			);
		}
	}
}
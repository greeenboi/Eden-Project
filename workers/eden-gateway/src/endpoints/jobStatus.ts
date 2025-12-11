import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { getDownloaderQueue } from "../queue";
import type { AppContext } from "../types";

export class JobStatus extends OpenAPIRoute {
	schema = {
		tags: ["Downloader"],
		summary: "Fetch downloader job status",
		request: {
			params: z.object({
				jobId: Str({ description: "BullMQ job id" }),
			}),
		},
		responses: {
			"200": {
				description: "Job status",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							state: Str(),
							progress: z.union([z.number(), z.object({}).passthrough()]).optional(),
							attemptsMade: z.number(),
							failedReason: Str({ required: false }),
							returnValue: z.any().optional(),
						}),
					},
				},
			},
			"404": {
				description: "Job not found",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							error: Str(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const { params } = await this.getValidatedData<typeof this.schema>();
		const { jobId } = params;

		try {
			const queue = getDownloaderQueue(c.env);
			const job = await queue.getJob(jobId);
			if (!job) {
				return Response.json(
					{ success: false, error: "Job not found" },
					{ status: 404 },
				);
			}

			const state = await job.getState();
			return {
				success: true,
				state,
				progress: job.progress,
				attemptsMade: job.attemptsMade,
				failedReason: job.failedReason ?? undefined,
				returnValue: job.returnvalue,
			};
		} catch (error) {
			console.error("job status lookup failed", error);
			return Response.json(
				{ success: false, error: "Queue unavailable. Check Redis configuration." },
				{ status: 503 },
			);
		}
	}
}
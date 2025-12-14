import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { fetchDownloaderJobStatus } from "../queue";
import type { AppContext } from "../types";

export class JobStatus extends OpenAPIRoute {
	schema = {
		tags: ["Downloader"],
		summary: "Fetch downloader job status",
		request: {
			params: z.object({
				jobId: Str({ description: "Downloader job id" }),
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
			const job = await fetchDownloaderJobStatus(c.env, jobId);
			if (!job) {
				return Response.json(
					{ success: false, error: "Job not found" },
					{ status: 404 },
				);
			}

			return {
				success: true,
				state: job.state,
				progress: undefined,
				attemptsMade: job.attempts,
				failedReason: job.error,
				returnValue: job.result,
			};
		} catch (error) {
			console.error("job status lookup failed", error);
			return Response.json(
				{ success: false, error: "Queue unavailable." },
				{ status: 503 },
			);
		}
	}
}
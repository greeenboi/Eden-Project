import type { DownloaderJobPayloadType, GatewayEnv } from "./types";

type JobState = "queued" | "processing" | "completed" | "failed";

type JobRecord = {
	id: string;
	payload: DownloaderJobPayloadType;
	state: JobState;
	attempts: number;
	result?: unknown;
	error?: string;
	enqueuedAt: number;
	updatedAt: number;
};

const QUEUE_KEY = "queue";

const DOWNLOADER_PATH = "/youtube-to-ogg";

export class DownloaderQueueDO {
	private queue: string[] = [];

	constructor(private state: DurableObjectState, private env: GatewayEnv) {
		this.state.blockConcurrencyWhile(async () => {
			this.queue = (await this.state.storage.get<string[]>(QUEUE_KEY)) ?? [];
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/enqueue") {
			console.log("[do] enqueue hit");
			return this.enqueue(request);
		}
		if (request.method === "GET" && url.pathname.startsWith("/status/")) {
			const jobId = url.pathname.split("/").pop();
			console.log("[do] status hit", { jobId });
			return this.status(jobId ?? "");
		}
		if (request.method === "POST" && url.pathname === "/process") {
			console.log("[do] process hit");
			await this.processLoop();
			return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
		}
		return new Response("not found", { status: 404 });
	}

	async alarm() {
		await this.processLoop();
	}

	private async enqueue(request: Request): Promise<Response> {
		const body = (await request.json()) as { payload: DownloaderJobPayloadType };
		const id = crypto.randomUUID();
		const now = Date.now();
		const record: JobRecord = {
			id,
			payload: body.payload,
			state: "queued",
			attempts: 0,
			enqueuedAt: now,
			updatedAt: now,
		};

		await this.state.storage.put(`job:${id}`, record);
		this.queue.push(id);
		await this.state.storage.put(QUEUE_KEY, this.queue);
		await this.state.storage.setAlarm(Date.now());
		console.log("[do] enqueued", { jobId: id, queueLength: this.queue.length });

		return new Response(JSON.stringify({ success: true, jobId: id }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	private async status(jobId: string): Promise<Response> {
		const record = (await this.state.storage.get<JobRecord>(`job:${jobId}`)) ?? null;
		if (!record) {
			console.warn("[do] status miss", { jobId });
			return new Response(JSON.stringify({ success: false, error: "Job not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}
		console.log("[do] status hit", { jobId, state: record.state });
		return new Response(JSON.stringify({ success: true, job: record }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	private async processLoop(): Promise<void> {
		let processed = 0;
		while (this.queue.length > 0 && processed < 10) {
			const jobId = this.queue.shift();
			if (!jobId) break;

			const record = (await this.state.storage.get<JobRecord>(`job:${jobId}`)) ?? null;
			if (!record) continue;
			console.log("[do] processing", { jobId, remaining: this.queue.length });

			record.state = "processing";
			record.attempts += 1;
			record.updatedAt = Date.now();
			await this.state.storage.put(`job:${jobId}`, record);

			try {
				await this.forwardToDownloader(record.payload);
				record.state = "completed";
				record.result = { status: 200 };
				record.error = undefined;
			} catch (err) {
				record.state = "failed";
				record.error = err instanceof Error ? err.message : String(err);
				console.error("[do] job failed", { jobId, error: record.error });
			}
			record.updatedAt = Date.now();
			await this.state.storage.put(`job:${jobId}`, record);
			processed += 1;
		}

		await this.state.storage.put(QUEUE_KEY, this.queue);
		console.log("[do] process loop complete", { remaining: this.queue.length });

		if (this.queue.length > 0) {
			await this.state.storage.setAlarm(Date.now() + 100);
			console.log("[do] alarm scheduled", { afterMs: 100, remaining: this.queue.length });
		}
	}

	private resolveDownloaderUrl(): string {
		const base = this.env.DOWNLOADER_SERVICE_URL;
		if (!base) {
			throw new Error("DOWNLOADER_SERVICE_URL missing");
		}

		const trimmed = base.replace(/\/+$/, "");
		if (trimmed.endsWith(DOWNLOADER_PATH)) {
			return trimmed;
		}

		return `${trimmed}${DOWNLOADER_PATH}`;
	}

	private async forwardToDownloader(payload: DownloaderJobPayloadType) {
		const targetUrl = this.resolveDownloaderUrl();
		let response: Response;

		try {
			response = await fetch(targetUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Downloader fetch failed (${targetUrl}): ${message}`);
		}

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Downloader service returned ${response.status} from ${targetUrl}: ${text}`);
		}
	}
}

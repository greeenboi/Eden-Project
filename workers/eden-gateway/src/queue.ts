import type { DownloaderJobPayloadType, GatewayEnv } from "./types";

type JobState = "queued" | "processing" | "completed" | "failed";

type JobRecord = {
    id: string;
    state: JobState;
    attempts: number;
    result?: unknown;
    error?: string;
    enqueuedAt: number;
    updatedAt: number;
};

const DO_NAME = "downloader-queue";

const getQueueStub = (env: GatewayEnv) => env.DOWNLOADER_QUEUE.get(env.DOWNLOADER_QUEUE.idFromName(DO_NAME));

export const enqueueDownloaderJob = async (env: GatewayEnv, payload: DownloaderJobPayloadType) => {
    const stub = getQueueStub(env);
    console.log("[do-client] enqueue request", { queue: DO_NAME });
    const response = await stub.fetch("https://do/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
    });
    if (!response.ok) {
        const text = await response.text();
        console.error("[do-client] enqueue failed", { queue: DO_NAME, error: text });
        throw new Error(`Failed to enqueue job: ${text}`);
    }
    const data = (await response.json()) as { success: boolean; jobId: string };
    console.log("[do-client] enqueued", { queue: DO_NAME, jobId: data.jobId });
    return { jobId: data.jobId };
};

export const fetchDownloaderJobStatus = async (env: GatewayEnv, jobId: string) => {
    const stub = getQueueStub(env);
    console.log("[do-client] status request", { queue: DO_NAME, jobId });
    const response = await stub.fetch(`https://do/status/${jobId}`, { method: "GET" });
    if (response.status === 404) {
        console.warn("[do-client] job not found", { queue: DO_NAME, jobId });
        return null;
    }
    if (!response.ok) {
        const text = await response.text();
        console.error("[do-client] status failed", { queue: DO_NAME, jobId, error: text });
        throw new Error(`Failed to fetch job status: ${text}`);
    }
    const data = (await response.json()) as { success: boolean; job: JobRecord };
    console.log("[do-client] status ok", { queue: DO_NAME, jobId, state: data.job.state });
    return data.job;
};

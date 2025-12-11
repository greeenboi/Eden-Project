import { Queue, Worker } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import type { DownloaderJobPayloadType, GatewayEnv } from "./types";

const DEFAULT_QUEUE_NAME = "downloader";
const JOB_NAME = "youtube-to-ogg";

let redisClient: IORedis | null = null;
let downloaderQueue: Queue<DownloaderJobPayloadType> | null = null;
let downloaderWorker: Worker<DownloaderJobPayloadType> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildRedisOptions = (env: GatewayEnv): RedisOptions => {
	const rawUrl = env.REDIS_URL?.trim();
	if (!rawUrl) {
		throw new Error("Redis connection is not configured. Set REDIS_URL (e.g. upstash rediss:// URL).");
	}

	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch (err) {
		throw new Error(`Invalid REDIS_URL: ${rawUrl}`);
	}

	return {
		host: parsed.hostname,
		port: parsed.port ? Number(parsed.port) : 6379,
		username: parsed.username || undefined,
		password: parsed.password || undefined,
		tls: parsed.protocol === "rediss:" ? {} : undefined,
		maxRetriesPerRequest: null,
	};
};

const waitForServiceHealthy = async (serviceUrl: string, timeoutMs = 120000, intervalMs = 3000) => {
	const healthUrl = new URL(serviceUrl);
	healthUrl.pathname = "/";
	healthUrl.search = "";

	const start = Date.now();
	while (true) {
		const resp = await fetch(healthUrl.toString(), { method: "GET" }).catch(() => null);
		if (resp?.ok) return;
		if (Date.now() - start >= timeoutMs) {
			throw new Error(`Downloader service health check timed out after ${timeoutMs}ms`);
		}
		await sleep(intervalMs);
	}
};

const getRedis = (env: GatewayEnv) => {
	if (!redisClient) {
		redisClient = new IORedis(buildRedisOptions(env));
	}
	return redisClient;
};

export const getDownloaderQueue = (env: GatewayEnv) => {
	if (!downloaderQueue) {
		downloaderQueue = new Queue<DownloaderJobPayloadType>(DEFAULT_QUEUE_NAME, {
			connection: getRedis(env),
			defaultJobOptions: {
				removeOnComplete: 100,
				removeOnFail: 100,
				attempts: 2,
				backoff: {
					type: "exponential",
					delay: 1000,
				},
			},
		});
	}
	return downloaderQueue;
};

export const getDownloaderWorker = (env: GatewayEnv) => {
	if (!downloaderWorker) {
		const serviceUrl = env.DOWNLOADER_SERVICE_URL?.trim();
		if (!serviceUrl) {
			throw new Error("DOWNLOADER_SERVICE_URL is not set");
		}

		downloaderWorker = new Worker<DownloaderJobPayloadType>(
			DEFAULT_QUEUE_NAME,
			async (job) => {
				await waitForServiceHealthy(serviceUrl);
				const response = await fetch(serviceUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(job.data),
				});
				if (!response.ok) {
					const text = await response.text();
					throw new Error(`Downloader service returned ${response.status}: ${text}`);
				}
				return response.status;
			},
			{ connection: getRedis(env) },
		);
	}
	return downloaderWorker;
};

export const downloaderJobName = JOB_NAME;
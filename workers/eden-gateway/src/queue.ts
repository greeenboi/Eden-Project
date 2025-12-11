import { Queue } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import type { DownloaderJobPayloadType, GatewayEnv } from "./types";

const DEFAULT_QUEUE_NAME = "downloader";
const JOB_NAME = "youtube-to-ogg";

let redisClient: IORedis | null = null;
let downloaderQueue: Queue<DownloaderJobPayloadType> | null = null;

const redisTlsEnabled = (env: GatewayEnv) => (env.REDIS_TLS || "false").toLowerCase() === "true";

const buildRedisOptions = (env: GatewayEnv): RedisOptions => {
	const url = env.REDIS_URL;
	if (url) {
		const parsed = new URL(url);
		return {
			host: parsed.hostname,
			port: parsed.port ? Number(parsed.port) : 6379,
			username: parsed.username || env.REDIS_USERNAME || undefined,
			password: parsed.password || env.REDIS_PASSWORD || undefined,
			tls: parsed.protocol === "rediss:" || redisTlsEnabled(env) ? {} : undefined,
			maxRetriesPerRequest: null,
		};
	}

	if (!env.REDIS_HOST || !env.REDIS_PORT) {
		throw new Error("Redis connection is not configured. Provide REDIS_URL or REDIS_HOST and REDIS_PORT.");
	}

	return {
		host: env.REDIS_HOST,
		port: Number(env.REDIS_PORT),
		username: env.REDIS_USERNAME ?? undefined,
		password: env.REDIS_PASSWORD ?? undefined,
		tls: redisTlsEnabled(env) ? {} : undefined,
		maxRetriesPerRequest: null,
	};
};

const getRedis = (env: GatewayEnv) => {
	if (!redisClient) {
		redisClient = new IORedis(buildRedisOptions(env));
	}
	return redisClient;
};

export const getDownloaderQueue = (env: GatewayEnv) => {
	if (!downloaderQueue) {
		const queueName = env.DOWNLOADER_QUEUE_NAME || DEFAULT_QUEUE_NAME;
		downloaderQueue = new Queue<DownloaderJobPayloadType>(queueName, {
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

export const downloaderJobName = JOB_NAME;
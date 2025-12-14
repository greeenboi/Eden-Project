import { Bool, Num, Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type GatewayEnv = {
	DOWNLOADER_SERVICE_URL?: string;
	DOWNLOADER_QUEUE: DurableObjectNamespace;
};

export type AppContext = Context<{ Bindings: GatewayEnv }>;

export const ArtistInput = z.object({
	name: Str({ description: "Display name for the artist", example: "Fred Again" }),
	bio: Str({ required: false }),
	avatarUrl: Str({ required: false }),
	spotifyUri: Str({ required: false }),
	followers: Num({ required: false }),
	popularity: Num({ required: false }),
});

export const TrackInput = z.object({
	title: Str({ required: false }),
	duration: Num({ required: false }),
	isrc: Str({ required: false }),
	genre: Str({ required: false }),
	explicit: Bool({ required: false }),
	image: Str({ required: false }),
	album: Str({ required: false }),
	spotifyTrackId: Str({ required: false }),
	spotifyUri: Str({ required: false }),
});

export const DownloaderJobPayload = z.object({
	url: z.string().url({ message: "Expected a valid YouTube URL" }),
	source: Str({ required: false, description: "Client identifier for telemetry" }),
	artist: ArtistInput,
	track: TrackInput,
});

export type DownloaderJobPayloadType = z.infer<typeof DownloaderJobPayload>;

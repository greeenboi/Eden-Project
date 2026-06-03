import TrackPlayer, { type MediaItem, PlaybackState } from "@rntp/player";
import { type QueueTrack, useQueueStore } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";

export function queueTrackToMediaItem(
	track: QueueTrack,
	url: string,
): MediaItem {
	return {
		mediaId: track.id,
		url,
		title: track.title,
		artist: track.artistName,
		artworkUrl: track.artworkUrl ?? undefined,
		duration: track.duration ?? undefined,
	};
}

async function fetchUrl(id: string): Promise<string | null> {
	try {
		const { streamUrl } = await useTrackStore.getState().getStreamingUrl(id);
		return streamUrl;
	} catch (err) {
		console.warn("[sync] fetchUrl failed for", id, err);
		return null;
	}
}

async function mapWithLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;
	const workerCount = Math.min(Math.max(1, limit), items.length);
	const workers = Array.from({ length: workerCount }, async () => {
		while (true) {
			const i = cursor++;
			if (i >= items.length) return;
			results[i] = await fn(items[i]);
		}
	});
	await Promise.all(workers);
	return results;
}

// ---------------------------------------------------------------------------
// RNTP ↔ zustand sync, adopting CodeWithGionatha-Labs/music-player's pattern.
//
// • zustand owns the queue (order, content, history, shuffle/repeat state).
// • RNTP owns playback (active item, position, MediaSession, lockscreen).
// • The full zustand queue is pushed to RNTP atomically whenever its identity
//   (the ordered list of track IDs) changes. No sliding window, no surgical
//   neighbour edits, no revision tokens.
// • For cursor-only moves (user-initiated next/prev, taps in queue list), we
//   either call RNTP directly (and let MediaItemTransition write back to
//   zustand) or jump RNTP's cursor via `skipInPlayerTo` if zustand was the
//   one that moved first.
// ---------------------------------------------------------------------------

const URL_FETCH_CONCURRENCY = 8;

/**
 * Push the entire zustand queue to RNTP. Resolves every track's stream URL
 * up front (with concurrency capped) and replaces RNTP's queue in one call.
 */
export async function pushQueueToPlayer(): Promise<void> {
	const z = useQueueStore.getState();
	if (z.queue.length === 0 || z.currentIndex < 0) {
		// Don't wipe the player if it's already playing something we haven't
		// adopted into the store yet — e.g. the app cold-started while the
		// background service kept a track going. hydrateStoreFromPlayer() will
		// pull that track back into the store instead.
		try {
			if (TrackPlayer.getActiveMediaItem()) return;
		} catch {
			// Player not set up yet — nothing to clear.
			return;
		}
		TrackPlayer.clear();
		return;
	}

	const urls = await mapWithLimit(z.queue, URL_FETCH_CONCURRENCY, (t) =>
		fetchUrl(t.id),
	);

	const items: MediaItem[] = [];
	let activeOffset = 0;
	for (let i = 0; i < z.queue.length; i++) {
		const url = urls[i];
		if (!url) {
			if (i < z.currentIndex) activeOffset++;
			continue;
		}
		items.push(queueTrackToMediaItem(z.queue[i], url));
	}
	if (items.length === 0) return;

	const startIdx = Math.max(
		0,
		Math.min(items.length - 1, z.currentIndex - activeOffset),
	);

	// Skip the rebuild when RNTP already holds this exact queue at this index.
	// setMediaItems reloads the active item and restarts playback from position
	// 0, so re-pushing an unchanged queue would interrupt what's playing.
	try {
		const current = TrackPlayer.getQueue();
		const activeIdx = TrackPlayer.getActiveMediaItemIndex();
		if (
			current.length === items.length &&
			activeIdx === startIdx &&
			current.every((it, i) => it.mediaId === items[i]?.mediaId)
		) {
			return;
		}
	} catch {
		// Player not set up yet — fall through and set the queue.
	}

	TrackPlayer.setMediaItems(items, startIdx);
	TrackPlayer.play();
}

/**
 * Move RNTP's cursor to a specific index. No-op if RNTP is already there.
 * Used by the subscription when only zustand's currentIndex moved (e.g. user
 * tapped a track in the upcoming-queue list, calling `skipToIndex` directly).
 */
export function skipInPlayerTo(index: number): void {
	const cur = TrackPlayer.getActiveMediaItemIndex();
	if (cur === index) return;
	TrackPlayer.skip(index);
}

// ---------------------------------------------------------------------------
// Reverse sync: RNTP → zustand (app resume / cold start).
//
// When the app is killed but the background service keeps playing, the store
// comes back empty (queue/currentIndex aren't persisted). hydrateStoreFromPlayer
// reads RNTP's live queue and mirrors it back so the UI can show the now-playing
// track. The `adoptingFromPlayer` flag lets the zustand→RNTP subscription skip
// the echo push that would otherwise re-fetch URLs and restart playback.
// ---------------------------------------------------------------------------

let adoptingFromPlayer = false;

/** True while the store is being populated FROM the player. */
export function isAdoptingFromPlayer(): boolean {
	return adoptingFromPlayer;
}

function mediaUrlToString(url: MediaItem["artworkUrl"]): string | null {
	if (typeof url === "string") return url;
	if (
		url &&
		typeof url === "object" &&
		typeof (url as { uri?: unknown }).uri === "string"
	) {
		return (url as { uri: string }).uri;
	}
	return null;
}

function mediaItemToQueueTrack(item: MediaItem): QueueTrack | null {
	const id = item.mediaId ?? (typeof item.url === "string" ? item.url : null);
	if (!id) return null;
	return {
		id,
		title: item.title ?? "Unknown",
		artistName: item.artist ?? "",
		artworkUrl: mediaUrlToString(item.artworkUrl),
		duration: typeof item.duration === "number" ? item.duration : null,
	};
}

/**
 * Mirror RNTP's live queue into zustand if the store doesn't already own one.
 * Returns the active track id (so the caller can surface the player), or null
 * when there's nothing playing to adopt. Never overwrites a non-empty store —
 * zustand stays the source of truth once it has a queue.
 */
export function hydrateStoreFromPlayer(): string | null {
	const z = useQueueStore.getState();

	// Store already owns a queue → it's the source of truth. Just report the
	// current track; don't clobber it with RNTP's (possibly reduced) queue.
	if (
		z.queue.length > 0 &&
		z.currentIndex >= 0 &&
		z.currentIndex < z.queue.length
	) {
		return z.queue[z.currentIndex]?.id ?? null;
	}

	let items: MediaItem[];
	let activeIndex: number | null;
	let state: PlaybackState;
	try {
		items = TrackPlayer.getQueue();
		activeIndex = TrackPlayer.getActiveMediaItemIndex();
		state = TrackPlayer.getPlaybackState();
	} catch {
		// Player not set up yet.
		return null;
	}

	if (!items?.length) return null;
	if (state === PlaybackState.Idle || state === PlaybackState.Error) return null;

	const tracks: QueueTrack[] = [];
	for (const item of items) {
		const track = mediaItemToQueueTrack(item);
		if (track) tracks.push(track);
	}
	if (tracks.length === 0) return null;

	const idx =
		activeIndex != null && activeIndex >= 0 && activeIndex < tracks.length
			? activeIndex
			: 0;

	adoptingFromPlayer = true;
	try {
		useQueueStore.setState({
			queue: tracks,
			originalQueue: tracks,
			currentIndex: idx,
			isQueueActive: true,
			queueSource: { type: "custom", name: "Now Playing" },
		});
	} finally {
		adoptingFromPlayer = false;
	}

	return tracks[idx]?.id ?? null;
}

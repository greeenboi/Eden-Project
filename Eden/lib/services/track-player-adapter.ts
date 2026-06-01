import TrackPlayer, { type MediaItem } from "@rntp/player";
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

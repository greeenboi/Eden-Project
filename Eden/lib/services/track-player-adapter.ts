import TrackPlayer, { type MediaItem } from "@rntp/player";
import { useQueueStore } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";
import type { QueueTrack } from "@/lib/actions/queue";

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
		console.warn("[track-player-adapter] fetchUrl failed for", id, err);
		return null;
	}
}

function windowFromQueue(): {
	prev: QueueTrack | null;
	current: QueueTrack | null;
	next: QueueTrack | null;
} {
	const { queue, currentIndex } = useQueueStore.getState();
	if (currentIndex < 0 || currentIndex >= queue.length) {
		return { prev: null, current: null, next: null };
	}
	return {
		prev: currentIndex > 0 ? queue[currentIndex - 1] : null,
		current: queue[currentIndex],
		next: currentIndex < queue.length - 1 ? queue[currentIndex + 1] : null,
	};
}

/**
 * Full rebuild of the RNTP queue from zustand's current window.
 * Resets playback position; use for "play this track" actions, never for
 * passive sync after a transition (use shiftWindowToActive for that).
 */
export async function rebuildRntpQueueWindow(): Promise<void> {
	const { prev, current, next } = windowFromQueue();
	if (!current) {
		TrackPlayer.clear();
		return;
	}

	const [prevUrl, curUrl, nextUrl] = await Promise.all([
		prev ? fetchUrl(prev.id) : Promise.resolve(null),
		fetchUrl(current.id),
		next ? fetchUrl(next.id) : Promise.resolve(null),
	]);
	if (!curUrl) return;

	const items: MediaItem[] = [];
	if (prev && prevUrl) items.push(queueTrackToMediaItem(prev, prevUrl));
	const startIndex = items.length;
	items.push(queueTrackToMediaItem(current, curUrl));
	if (next && nextUrl) items.push(queueTrackToMediaItem(next, nextUrl));

	TrackPlayer.setMediaItems(items, startIndex);
	TrackPlayer.play();
}

/**
 * After Media3's native auto-advance / skipToNext / skipToPrevious has fired
 * MediaItemTransition, reshape the RNTP queue so the new active item sits in
 * the middle slot — *without* resetting playback. Drops the now-orphan edge
 * and appends a fresh neighbour from zustand if one exists.
 */
export async function shiftWindowToActive(activeIndex: number): Promise<void> {
	const rntpQueue = TrackPlayer.getQueue();
	const active = rntpQueue[activeIndex];
	if (!active?.mediaId) return;

	// Sync zustand's currentIndex to whatever RNTP now considers active.
	const z = useQueueStore.getState();
	const newZustandIndex = z.queue.findIndex((t) => t.id === active.mediaId);
	if (newZustandIndex < 0) return;
	if (newZustandIndex !== z.currentIndex) {
		z.skipToIndex(newZustandIndex);
	}

	const { prev, next } = windowFromQueue();

	// Drop everything before the active item.
	for (let i = activeIndex - 1; i >= 0; i--) {
		TrackPlayer.removeMediaItem(i);
	}
	// Drop everything after the active item.
	const queueAfter = TrackPlayer.getQueue();
	const activeIndexAfterShrink = 0;
	for (let i = queueAfter.length - 1; i > activeIndexAfterShrink; i--) {
		TrackPlayer.removeMediaItem(i);
	}

	// Now RNTP queue has exactly the active item at index 0. Refill the edges.
	if (prev) {
		const prevUrl = await fetchUrl(prev.id);
		if (prevUrl) {
			TrackPlayer.insertMediaItem(0, queueTrackToMediaItem(prev, prevUrl));
		}
	}
	if (next) {
		const nextUrl = await fetchUrl(next.id);
		if (nextUrl) {
			TrackPlayer.addMediaItem(queueTrackToMediaItem(next, nextUrl));
		}
	}
}

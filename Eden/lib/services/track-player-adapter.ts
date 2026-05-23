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

// ---------------------------------------------------------------------------
// Locked, revision-tracked RNTP ↔ zustand sync.
//
// Mental model:
//   • zustand is the source of truth for what *should* be playing.
//   • RNTP's queue is a downstream [prev?, current, next?] window of zustand.
//   • Every reconciliation goes through `syncRntpToZustand`.
//   • At most one sync runs at a time. Concurrent requests collapse into a
//     single follow-up run after the in-flight one finishes.
//   • A revision counter lets an in-flight sync abort early (after the next
//     `await`) when a newer sync request has arrived, so we never commit
//     stale data to RNTP.
//
// Drivers of sync (where it gets called from):
//   1. Subscription on `useQueueStore` — any change to the
//      [prev, current, next] window triggers a sync.
//   2. Initial mount of the provider.
//
// Direction of dataflow:
//   • zustand → RNTP via this function.
//   • RNTP → zustand happens in GlobalPlayerProvider's
//     `MediaItemTransition` listener (writes new active index to zustand);
//     the subscription above then triggers a sync to refresh neighbours.
// ---------------------------------------------------------------------------

let inFlight = false;
let pendingRevision = 0;
let revisionInFlight = -1;
let queued = false;

function isStale(): boolean {
	return revisionInFlight !== pendingRevision;
}

/**
 * Request a reconciliation of RNTP's queue with zustand's current window.
 * Safe to call from anywhere, any number of times — calls coalesce and the
 * latest revision always wins.
 */
export function syncRntpToZustand(): void {
	pendingRevision++;
	if (inFlight) {
		queued = true;
		return;
	}
	void runSyncLoop();
}

async function runSyncLoop(): Promise<void> {
	if (inFlight) return;
	inFlight = true;
	try {
		// Loop until pendingRevision is stable (no new request during run).
		while (true) {
			revisionInFlight = pendingRevision;
			queued = false;
			try {
				await doSync();
			} catch (err) {
				console.warn("[sync] doSync threw", err);
			}
			if (!queued) break;
		}
	} finally {
		inFlight = false;
		revisionInFlight = -1;
	}
}

async function doSync(): Promise<void> {
	const z = useQueueStore.getState();
	if (z.queue.length === 0 || z.currentIndex < 0) {
		TrackPlayer.clear();
		return;
	}

	const cur = z.queue[z.currentIndex];
	if (!cur) return;
	const prev = z.currentIndex > 0 ? z.queue[z.currentIndex - 1] : null;
	const next =
		z.currentIndex < z.queue.length - 1 ? z.queue[z.currentIndex + 1] : null;

	const active = TrackPlayer.getActiveMediaItem();

	if (active?.mediaId !== cur.id) {
		// Current track changed — full rebuild.
		const [pU, cU, nU] = await Promise.all([
			prev ? fetchUrl(prev.id) : Promise.resolve(null),
			fetchUrl(cur.id),
			next ? fetchUrl(next.id) : Promise.resolve(null),
		]);
		if (isStale() || !cU) return;

		const items: MediaItem[] = [];
		if (prev && pU) items.push(queueTrackToMediaItem(prev, pU));
		const startIdx = items.length;
		items.push(queueTrackToMediaItem(cur, cU));
		if (next && nU) items.push(queueTrackToMediaItem(next, nU));

		TrackPlayer.setMediaItems(items, startIdx);
		TrackPlayer.play();
		return;
	}

	// Same current track — reconcile neighbour slots without resetting position.
	await reconcileNeighbours(prev, next);
}

async function reconcileNeighbours(
	wantPrev: QueueTrack | null,
	wantNext: QueueTrack | null,
): Promise<void> {
	// Normalize first: RNTP queue should be exactly [prev?, current, next?]
	// before we start surgical edits.
	let activeIdx = TrackPlayer.getActiveMediaItemIndex();
	if (activeIdx === null) return;
	let queue = TrackPlayer.getQueue();

	// Drop trailing items past activeIdx + 1.
	for (let i = queue.length - 1; i > activeIdx + 1; i--) {
		TrackPlayer.removeMediaItem(i);
	}
	// Drop leading items before activeIdx - 1.
	for (let i = activeIdx - 2; i >= 0; i--) {
		TrackPlayer.removeMediaItem(i);
		activeIdx -= 1;
	}
	queue = TrackPlayer.getQueue();

	// Fix the prev slot.
	const havePrev = activeIdx > 0 ? queue[activeIdx - 1] : null;
	if ((havePrev?.mediaId ?? null) !== (wantPrev?.id ?? null)) {
		if (havePrev) {
			TrackPlayer.removeMediaItem(activeIdx - 1);
			activeIdx -= 1;
		}
		if (wantPrev) {
			const url = await fetchUrl(wantPrev.id);
			if (isStale()) return;
			if (url) {
				const idx = TrackPlayer.getActiveMediaItemIndex();
				if (idx !== null) {
					TrackPlayer.insertMediaItem(
						idx,
						queueTrackToMediaItem(wantPrev, url),
					);
					activeIdx = idx + 1;
				}
			}
		}
	}

	// Fix the next slot.
	queue = TrackPlayer.getQueue();
	activeIdx = TrackPlayer.getActiveMediaItemIndex() ?? activeIdx;
	if (activeIdx === null) return;
	const haveNext = activeIdx < queue.length - 1 ? queue[activeIdx + 1] : null;
	if ((haveNext?.mediaId ?? null) !== (wantNext?.id ?? null)) {
		if (haveNext) {
			TrackPlayer.removeMediaItem(activeIdx + 1);
		}
		if (wantNext) {
			const url = await fetchUrl(wantNext.id);
			if (isStale()) return;
			if (url) {
				TrackPlayer.addMediaItem(queueTrackToMediaItem(wantNext, url));
			}
		}
	}
}

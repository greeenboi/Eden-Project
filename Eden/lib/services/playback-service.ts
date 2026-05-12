import { type BackgroundEvent, Event } from "@rntp/player";

const log = (...args: unknown[]) => console.log("[RNTP-service]", ...args);

/**
 * Background event handler. With `handling: 'native'` set in setupPlayer,
 * RNTP processes Play/Pause/Seek/Next/Previous natively (Media3 auto-advances
 * the queue, so lockscreen Next/Prev and end-of-track auto-advance work
 * without JS). This handler exists so the headless JS task is registered
 * (required for some RNTP internals on Android) and to surface PlaybackError
 * logs for backgrounded sessions.
 */
export default async function playbackService(event: BackgroundEvent) {
	switch (event.type) {
		case Event.PlaybackError:
			log("playback error", event);
			return;
		default:
			return;
	}
}

import TrackPlayer, {
	Event,
	type MediaItem,
	PlaybackState,
	RepeatMode,
	useActiveMediaItem,
	useIsPlaying,
	usePlaybackState,
	useProgress,
} from "@rntp/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueueStore } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";

type FetchStream = (trackId: string) => Promise<{ streamUrl: string }>;

type UseTrackAudioPlayerOptions = {
	trackId?: string;
	fetchStream: FetchStream;
	enabled?: boolean;
	skipSeconds?: number;
	updateInterval?: number;
	onError?: (error: unknown) => void;
	onTrackEnd?: () => void;
};

type AudioStatusSnapshot = {
	currentTime: number;
	duration: number;
	isBuffering: boolean;
	isLoaded: boolean;
	playing: boolean;
	didJustFinish: boolean;
};

type PlayerFacade = {
	play: () => void;
	pause: () => void;
	seekTo: (position: number) => void;
	/** Replace the currently loaded media (clears queue, sets single item, plays). */
	replace: (url: string, item?: { title?: string; artist?: string; artworkUrl?: string; duration?: number; mediaId?: string }) => void;
	loop: boolean;
};

export function useTrackAudioPlayer({
	trackId,
	fetchStream,
	enabled = true,
	skipSeconds = 10,
	updateInterval = 250,
	onError,
	onTrackEnd,
}: UseTrackAudioPlayerOptions) {
	const playbackState = usePlaybackState();
	const isPlayingNow = useIsPlaying();
	// updateInterval comes in as milliseconds (preserved from legacy expo-audio API);
	// useProgress wants seconds, so divide. Clamp to a sane floor.
	const intervalSeconds = Math.max(0.05, updateInterval / 1000);
	const progress = useProgress(intervalSeconds);
	const activeItem = useActiveMediaItem();
	const activeItemMatchesTrack =
		!trackId || activeItem?.mediaId === trackId;

	const status: AudioStatusSnapshot = useMemo(
		() => ({
			currentTime: activeItemMatchesTrack ? progress.position : 0,
			duration: activeItemMatchesTrack ? progress.duration : 0,
			isBuffering: playbackState === PlaybackState.Buffering,
			isLoaded:
				activeItemMatchesTrack &&
				(playbackState === PlaybackState.Ready ||
					playbackState === PlaybackState.Ended),
			playing: activeItemMatchesTrack && isPlayingNow,
			didJustFinish:
				activeItemMatchesTrack && playbackState === PlaybackState.Ended,
		}),
		[
			progress.position,
			progress.duration,
			playbackState,
			isPlayingNow,
			activeItemMatchesTrack,
		],
	);

	const fetchStreamRef = useRef(fetchStream);
	const onErrorRef = useRef(onError);
	const onTrackEndRef = useRef(onTrackEnd);

	useEffect(() => {
		fetchStreamRef.current = fetchStream;
	}, [fetchStream]);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	useEffect(() => {
		onTrackEndRef.current = onTrackEnd;
	}, [onTrackEnd]);

	const [loadingStream, setLoadingStream] = useState(false);
	const [streamError, setStreamError] = useState<unknown>(null);
	const [volume, setVolumeState] = useState(1);
	const [loop, setLoopState] = useState(false);

	useEffect(() => {
		TrackPlayer.setVolume(volume);
	}, [volume]);

	useEffect(() => {
		TrackPlayer.setRepeatMode(loop ? RepeatMode.One : RepeatMode.Off);
	}, [loop]);

	// Load the active trackId by fetching its stream URL and pushing into RNTP.
	// Only handles the single-track playTrack(trackId) path — when zustand's
	// queue owns the track, GlobalPlayerProvider's window-mirror loads it.
	useEffect(() => {
		if (!trackId || !enabled) {
			return;
		}

		// Skip the round-trip if RNTP is already playing this track
		// (e.g. background service drove the change while we were unmounted).
		if (TrackPlayer.getActiveMediaItem()?.mediaId === trackId) {
			return;
		}

		// If the track is in zustand's queue, the window-mirror in
		// GlobalPlayerProvider handles loading and Next/Prev navigation.
		if (useQueueStore.getState().queue.some((t) => t.id === trackId)) {
			return;
		}

		let cancelled = false;
		setLoadingStream(true);
		setStreamError(null);

		fetchStreamRef
			.current(trackId)
			.then((response) => {
				if (cancelled) return;
				const { streamUrl } = response;
				const responseTrack = (response as { track?: { title?: string; artworkUrl?: string | null; duration?: number | null } }).track;
				const queueTrack = useQueueStore
					.getState()
					.queue.find((t) => t.id === trackId);
				const detailedTrack = useTrackStore.getState().currentTrack;
				const detailedMatchesTrack =
					detailedTrack && detailedTrack.id === trackId;
				const detailedArtistName = detailedMatchesTrack
					? detailedTrack?.artist?.name
					: undefined;
				const detailedAlbumTitle = detailedMatchesTrack
					? detailedTrack?.album?.title
					: undefined;

				const item: MediaItem = {
					mediaId: trackId,
					url: streamUrl,
					title: queueTrack?.title ?? responseTrack?.title,
					artist: queueTrack?.artistName ?? detailedArtistName,
					albumTitle: detailedAlbumTitle,
					artworkUrl:
						queueTrack?.artworkUrl ??
						responseTrack?.artworkUrl ??
						undefined,
					duration:
						queueTrack?.duration ??
						responseTrack?.duration ??
						undefined,
				};
				TrackPlayer.setMediaItem(item);
				TrackPlayer.play();
			})
			.catch((err) => {
				if (cancelled) return;
				setStreamError(err);
				onErrorRef.current?.(err);
			})
			.finally(() => {
				if (!cancelled) setLoadingStream(false);
			});

		return () => {
			cancelled = true;
		};
	}, [trackId, enabled]);

	// Once detailed track info (artist name, album title) arrives, push it
	// into RNTP's active media item so the notification subtitle fills in
	// instead of staying "loading".
	const currentDetailedTrack = useTrackStore((s) => s.currentTrack);
	useEffect(() => {
		if (!trackId) return;
		if (!currentDetailedTrack || currentDetailedTrack.id !== trackId) return;
		const active = TrackPlayer.getActiveMediaItem();
		if (active?.mediaId !== trackId) return;

		const patch: {
			title?: string;
			artist?: string;
			albumTitle?: string;
		} = {};
		const artistName = currentDetailedTrack.artist?.name;
		const albumTitle = currentDetailedTrack.album?.title;
		if (artistName && active.artist !== artistName) {
			patch.artist = artistName;
		}
		if (albumTitle && active.albumTitle !== albumTitle) {
			patch.albumTitle = albumTitle;
		}
		if (currentDetailedTrack.title && active.title !== currentDetailedTrack.title) {
			patch.title = currentDetailedTrack.title;
		}
		if (Object.keys(patch).length === 0) return;

		const index = TrackPlayer.getActiveMediaItemIndex();
		if (index === null) return;
		TrackPlayer.updateMetadata(index, patch);
	}, [trackId, currentDetailedTrack]);

	// Fire onTrackEnd when playback naturally finishes.
	const lastEndedRef = useRef<string | null>(null);
	useEffect(() => {
		if (playbackState !== PlaybackState.Ended) return;
		if (loop) return;
		if (lastEndedRef.current === trackId) return;
		lastEndedRef.current = trackId ?? null;
		onTrackEndRef.current?.();
	}, [playbackState, loop, trackId]);

	useEffect(() => {
		// Reset the ended-flag whenever the active track changes.
		lastEndedRef.current = null;
	}, [trackId]);

	// Also catch PlaybackError from the native side.
	useEffect(() => {
		const sub = TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
			setStreamError(e);
			onErrorRef.current?.(e);
		});
		return () => sub.remove();
	}, []);

	const player: PlayerFacade = useMemo(
		() => ({
			play: () => TrackPlayer.play(),
			pause: () => TrackPlayer.pause(),
			seekTo: (position: number) => TrackPlayer.seekTo(position),
			replace: (url, item) => {
				TrackPlayer.setMediaItem({
					mediaId: item?.mediaId ?? url,
					url,
					title: item?.title,
					artist: item?.artist,
					artworkUrl: item?.artworkUrl,
					duration: item?.duration,
				});
				TrackPlayer.play();
			},
			get loop() {
				return loop;
			},
			set loop(value: boolean) {
				setLoopState(value);
			},
		}),
		[loop],
	);

	const togglePlayback = useCallback(() => {
		if (!status.isLoaded) return;
		if (status.playing) {
			TrackPlayer.pause();
		} else {
			TrackPlayer.play();
		}
	}, [status.isLoaded, status.playing]);

	const seekForward = useCallback(
		(seconds = skipSeconds) => {
			TrackPlayer.seekBy(seconds);
		},
		[skipSeconds],
	);

	const seekBackward = useCallback(
		(seconds = skipSeconds) => {
			TrackPlayer.seekBy(-seconds);
		},
		[skipSeconds],
	);

	const toggleMute = useCallback(() => {
		setVolumeState((prev) => (prev > 0 ? 0 : 1));
	}, []);

	const setVolume = useCallback((value: number) => {
		setVolumeState(Math.max(0, Math.min(1, value)));
	}, []);

	return {
		player,
		status,
		streamError,
		loadingStream,
		progress:
			status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0,
		ready: status.isLoaded,
		seekForward,
		seekBackward,
		togglePlayback,
		toggleMute,
		setVolume,
		isMuted: volume === 0,
	};
}

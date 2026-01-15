import type { AudioMode } from "expo-audio";
import {
	setAudioModeAsync,
	setIsAudioActiveAsync,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FetchStream = (trackId: string) => Promise<{ streamUrl: string }>;

type UseTrackAudioPlayerOptions = {
	trackId?: string;
	fetchStream: FetchStream;
	enabled?: boolean;
	skipSeconds?: number;
	updateInterval?: number;
	onError?: (error: unknown) => void;
	onTrackEnd?: () => void;
	audioMode?: Partial<AudioMode>;
};

type AudioStatusSnapshot = {
	currentTime: number;
	duration: number;
	isBuffering: boolean;
	isLoaded: boolean;
	playing: boolean;
};

const fallbackStatus: AudioStatusSnapshot = {
	currentTime: 0,
	duration: 0,
	isBuffering: false,
	isLoaded: false,
	playing: false,
};

const defaultBackgroundAudioMode: Partial<AudioMode> = {
	playsInSilentMode: true,
	shouldPlayInBackground: true,
	interruptionModeAndroid: "duckOthers",
	interruptionMode: "mixWithOthers",
};

export function formatDuration(seconds?: number) {
	if (!Number.isFinite(seconds)) return "0:00";
	const value = Math.max(0, Math.floor(seconds ?? 0));
	const mins = Math.floor(value / 60);
	const secs = value % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function useTrackAudioPlayer({
	trackId,
	fetchStream,
	enabled = true,
	skipSeconds = 10,
	updateInterval = 100,
	onError,
	onTrackEnd,
	audioMode,
}: UseTrackAudioPlayerOptions) {
	const playerOptions = useMemo(() => ({ updateInterval }), [updateInterval]);
	const player = useAudioPlayer(null, playerOptions);
	const rawStatus = useAudioPlayerStatus(player) as AudioStatusSnapshot | null;
	const status = rawStatus ?? fallbackStatus;
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

	const safePause = useCallback(() => {
		try {
			player.pause();
		} catch (err) {
			// `useAudioPlayer` releases the native object on unmount; ignore pauses after release
			console.warn("[useTrackAudioPlayer] pause failed", err);
		}
	}, [player]);

	const safePauseRef = useRef(safePause);

	useEffect(() => {
		safePauseRef.current = safePause;
	}, [safePause]);

	const [streamUrl, setStreamUrl] = useState<string | null>(null);
	const [loadingStream, setLoadingStream] = useState(false);
	const [streamError, setStreamError] = useState<unknown>(null);
	const [audioSessionReady, setAudioSessionReady] = useState(false);
	// Track whether we've actually loaded audio to avoid pausing an unused player
	const hasLoadedAudio = useRef(false);

	useEffect(() => {
		if (!enabled || audioSessionReady) return;

		let cancelled = false;
		(async () => {
			try {
				await setAudioModeAsync(audioMode ?? defaultBackgroundAudioMode);
				if (cancelled) return;
				await setIsAudioActiveAsync(true);
				if (!cancelled) setAudioSessionReady(true);
			} catch (err) {
				if (cancelled) return;
				setStreamError(err);
				onErrorRef.current?.(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [audioMode, audioSessionReady, enabled]);

	useEffect(() => {
		if (!trackId || !enabled) {
			setStreamUrl(null);
			setStreamError(null);
			setLoadingStream(false);
			// Only pause if we've actually loaded audio before
			if (hasLoadedAudio.current) {
				safePauseRef.current();
				hasLoadedAudio.current = false;
			}
			return;
		}

		// Reset the flag when starting to load a new track
		hasLoadedAudio.current = false;

		let cancelled = false;
		setLoadingStream(true);
		setStreamError(null);

		fetchStreamRef
			.current(trackId)
			.then((response) => {
				if (!cancelled) setStreamUrl(response.streamUrl);
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
			// Only pause on cleanup if we've loaded audio
			if (hasLoadedAudio.current) {
				safePauseRef.current();
			}
		};
	}, [trackId, enabled]);

	// Track if autoplay is pending (should play when loaded)
	const autoplayPendingRef = useRef(false);

	useEffect(() => {
		if (!enabled) return;
		if (!streamUrl) return;
		// Mark autoplay as pending when we replace with a new stream
		autoplayPendingRef.current = true;
		player.replace(streamUrl);
		// Mark that we've loaded audio so cleanup knows to pause
		hasLoadedAudio.current = true;
	}, [enabled, streamUrl, player]);

	// Autoplay after buffering completes
	useEffect(() => {
		if (!autoplayPendingRef.current) return;
		if (!status.isLoaded) return;
		if (loadingStream) return;

		// Audio is loaded and we have pending autoplay - start playback
		autoplayPendingRef.current = false;
		player.play();
	}, [status.isLoaded, loadingStream, player]);

	// Track end detection - fire onTrackEnd when track finishes naturally
	const hasTriggeredEndRef = useRef(false);
	const prevTrackIdRef = useRef(trackId);

	// Reset the end trigger when track changes
	if (prevTrackIdRef.current !== trackId) {
		hasTriggeredEndRef.current = false;
		prevTrackIdRef.current = trackId;
	}

	useEffect(() => {
		if (!status.isLoaded || !status.duration || status.duration <= 0) return;
		if (hasTriggeredEndRef.current) return;
		if (player.loop) return; // Don't trigger if looping

		// Check if we're at the end (within 0.5s of duration) and not playing
		const isAtEnd = status.currentTime >= status.duration - 0.5;
		const hasFinished = isAtEnd && !status.playing && !status.isBuffering;

		if (hasFinished) {
			hasTriggeredEndRef.current = true;
			onTrackEndRef.current?.();
		}
	}, [
		status.isLoaded,
		status.duration,
		status.currentTime,
		status.playing,
		status.isBuffering,
		player.loop,
	]);

	const progress = useMemo(() => {
		if (!status.duration || status.duration <= 0) return 0;
		return (status.currentTime / status.duration) * 100;
	}, [status.currentTime, status.duration]);

	const togglePlayback = useCallback(() => {
		if (!status.isLoaded) return;
		if (status.playing) {
			player.pause();
		} else {
			player.play();
		}
	}, [status.isLoaded, status.playing, player]);

	const toggleLoop = useCallback(() => {
		player.loop = !player.loop;
	}, [player]);

	const seekForward = useCallback(
		(seconds = skipSeconds) => {
			if (!status.duration || status.duration <= 0) return;
			const target = Math.min(status.currentTime + seconds, status.duration);
			player.seekTo(target);
		},
		[status.currentTime, status.duration, player, skipSeconds],
	);

	const seekBackward = useCallback(
		(seconds = skipSeconds) => {
			if (!status.duration || status.duration <= 0) return;
			const target = Math.max(status.currentTime - seconds, 0);
			player.seekTo(target);
		},
		[status.currentTime, status.duration, player, skipSeconds],
	);

	const toggleMute = useCallback(() => {
		player.volume = player.volume > 0 ? 0 : 1;
	}, [player]);

	const setVolume = useCallback(
		(value: number) => {
			const clamped = Math.max(0, Math.min(1, value));
			player.volume = clamped;
		},
		[player],
	);

	return {
		player,
		status,
		streamUrl,
		streamError,
		loadingStream,
		progress,
		ready: status.isLoaded && Boolean(streamUrl),
		seekForward,
		seekBackward,
		togglePlayback,
		toggleLoop,
		toggleMute,
		setVolume,
		isMuted: player.volume === 0,
	};
}

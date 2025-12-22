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
	audioMode,
}: UseTrackAudioPlayerOptions) {
	const playerOptions = useMemo(() => ({ updateInterval }), [updateInterval]);
	const player = useAudioPlayer(null, playerOptions);
	const rawStatus = useAudioPlayerStatus(player) as AudioStatusSnapshot | null;
	const status = rawStatus ?? fallbackStatus;
	const fetchStreamRef = useRef(fetchStream);
	const onErrorRef = useRef(onError);

	useEffect(() => {
		fetchStreamRef.current = fetchStream;
	}, [fetchStream]);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

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
			safePauseRef.current();
			return;
		}

		let cancelled = false;
		setLoadingStream(true);
		setStreamError(null);

		fetchStreamRef.current(trackId)
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
			safePauseRef.current();
		};
	}, [trackId, enabled]);

	useEffect(() => {
		if (!enabled) return;
		if (!streamUrl) return;
		player.replace(streamUrl);
	}, [enabled, streamUrl, player]);

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


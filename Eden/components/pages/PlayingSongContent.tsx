import { View } from "@/components/Themed";
import { SwipeablePlayer } from "@/components/ui/SwipeablePlayer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useTrackAudioPlayer } from "@/lib/AudioPlayer";
import type { RepeatMode } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";
import { usePlaybackStore } from "@/lib/stores/playback";
import { router } from "expo-router";
import { AlertCircle, ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { AnimatedPlayerContent } from "./player/AnimatedPlayerContent";

type PlayingSongContentProps = {
	trackId?: string;
	showHeader?: boolean;
	onClose?: () => void;
	onTrackEnd?: () => void;
	variant?: "full" | "mini";
	/** Skip to next track in queue */
	onSkipNext?: () => void;
	/** Skip to previous track in queue */
	onSkipPrevious?: () => void;
	/** Toggle shuffle mode */
	onToggleShuffle?: () => void;
	/** Toggle repeat mode */
	onToggleRepeat?: () => void;
	/** Expand player to full view (for mini variant) */
	onExpand?: () => void;
	/** Collapse player to mini view */
	onCollapse?: () => void;
	/** Whether there's a next track available */
	hasNext?: boolean;
	/** Whether there's a previous track available */
	hasPrevious?: boolean;
	/** Whether shuffle is enabled */
	isShuffled?: boolean;
	/** Current repeat mode */
	repeatMode?: RepeatMode;
	/** Next track artwork URL for swipe preview */
	nextArtworkUrl?: string | null;
	/** Previous track artwork URL for swipe preview */
	previousArtworkUrl?: string | null;
};

export function PlayingSongContent({
	trackId,
	showHeader = false,
	onClose,
	onTrackEnd,
	variant = "full",
	onSkipNext,
	onSkipPrevious,
	onToggleShuffle,
	onToggleRepeat,
	onExpand,
	onCollapse,
	hasNext = false,
	hasPrevious = false,
	isShuffled = false,
	repeatMode = "off",
	nextArtworkUrl,
	previousArtworkUrl,
}: PlayingSongContentProps) {
	const log = useCallback(
		(...args: unknown[]) => console.log("[Player]", ...args),
		[],
	);
	const {
		currentTrack,
		isLoading,
		error,
		fetchTrackById,
		getStreamingUrl,
		clearCurrentTrack,
	} = useTrackStore();

	const fetchTrackByIdRef = useRef(fetchTrackById);
	const clearCurrentTrackRef = useRef(clearCurrentTrack);
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	const {
		player,
		status,
		loadingStream,
		toggleMute,
		togglePlayback,
		isMuted,
	} = useTrackAudioPlayer({
		trackId,
		fetchStream: getStreamingUrl,
		enabled: Boolean(trackId && currentTrack && currentTrack.id === trackId),
		updateInterval: 100,
		onTrackEnd,
	});

	// Sync playback state to shared store for handle slider
	const {
		updatePlayback,
		registerSeekCallback,
		unregisterSeekCallback,
		reset: resetPlayback,
	} = usePlaybackStore();

	useEffect(() => {
		updatePlayback({
			currentTime: status.currentTime ?? 0,
			duration: status.duration ?? 0,
			isLoaded: status.isLoaded,
			isPlaying: status.playing,
			isLoading: loadingStream,
		});
	}, [
		status.currentTime,
		status.duration,
		status.isLoaded,
		status.playing,
		loadingStream,
		updatePlayback,
	]);

	// Sync player.loop with repeatMode - loop single track when repeatMode is "one"
	// Re-apply after each track loads since player.replace() may reset the loop setting
	useEffect(() => {
		if (!status.isLoaded) return; // Only set loop once track is loaded
		const shouldLoop = repeatMode === "one";
		if (player.loop !== shouldLoop) {
			player.loop = shouldLoop;
		}
	}, [repeatMode, player, status.isLoaded]);

	// Register seek callback so handle slider can control playback
	useEffect(() => {
		const seekCallback = (time: number) => {
			if (status.isLoaded) {
				player.seekTo(time);
			}
		};
		registerSeekCallback(seekCallback);
		return () => {
			unregisterSeekCallback();
			resetPlayback();
		};
	}, [
		player,
		status.isLoaded,
		registerSeekCallback,
		unregisterSeekCallback,
		resetPlayback,
	]);

	const [scrubValue, setScrubValue] = useState(0);
	const [isScrubbing, setIsScrubbing] = useState(false);

	useEffect(() => {
		if (!isScrubbing) {
			setScrubValue(status.currentTime ?? 0);
		}
	}, [status.currentTime, isScrubbing]);

	const sliderValue = useMemo(() => {
		return isScrubbing ? scrubValue : (status.currentTime ?? 0);
	}, [isScrubbing, scrubValue, status.currentTime]);

	const sliderMax = useMemo(() => {
		return status.duration && status.duration > 0 ? status.duration : 1;
	}, [status.duration]);

	const safeSliderMax = useMemo(() => {
		if (!Number.isFinite(sliderMax) || sliderMax <= 0) return 1;
		return sliderMax;
	}, [sliderMax]);

	const safeSliderValue = useMemo(() => {
		if (!Number.isFinite(sliderValue)) return 0;
		return Math.min(safeSliderMax, Math.max(0, sliderValue));
	}, [safeSliderMax, sliderValue]);

	const handleSlidingStart = (value: number) => {
		setIsScrubbing(true);
		setScrubValue(Number.isFinite(value) ? value : 0);
	};

	const handleValueChange = (value: number) => {
		if (!Number.isFinite(value)) return;
		setScrubValue(value);
	};

	const handleSlidingComplete = (value: number) => {
		setIsScrubbing(false);
		if (!status.isLoaded || !Number.isFinite(value)) return;
		player.seekTo(Math.min(safeSliderMax, Math.max(0, value)));
	};

	// Localize loading to this track so list fetches elsewhere don't block the player UI
	const isTrackLoading =
		isLoading && (!currentTrack || currentTrack.id !== trackId);

	const handleClose = () => {
		log("handleClose");
		if (onClose) {
			onClose();
		} else {
			router.back();
		}
	};

	useEffect(() => {
		fetchTrackByIdRef.current = fetchTrackById;
		clearCurrentTrackRef.current = clearCurrentTrack;
	}, [fetchTrackById, clearCurrentTrack]);

	useEffect(() => {
		log("track effect", { trackId });
		if (trackId) {
			fetchTrackByIdRef
				.current(trackId)
				.catch((err) => log("fetchTrackById failed", err));
		} else {
			clearCurrentTrackRef.current();
		}

		return () => {
			log("cleanup track effect", { trackId });
			clearCurrentTrackRef.current();
		};
	}, [log, trackId]);

	if (!trackId) {
		return (
			<View
				style={styles.container}
				className="items-center justify-center px-8 bg-background"
			>
				<Text className="text-center opacity-70">
					Select a track to start playing.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container} className="bg-background flex-1">
			{showHeader && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center justify-between p-4"
				>
					<Button variant="ghost" size="sm" onPress={handleClose}>
						<ArrowLeft size={24} />
					</Button>
					<Text className="text-lg font-semibold">Now Playing</Text>
					<View style={{ backgroundColor: "transparent" }} className="w-10" />
				</View>
			)}

			{error && (
				<View style={{ backgroundColor: "transparent" }} className="px-4 pb-2">
					<Alert variant="destructive" icon={AlertCircle}>
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</View>
			)}

			{isTrackLoading && variant === "full" && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 px-8"
				>
					<Skeleton className="w-full aspect-square max-w-sm mx-auto mb-8" />
					<Skeleton className="h-8 w-3/4 mb-2" />
					<Skeleton className="h-6 w-1/2 mb-4" />
					<Skeleton className="h-4 w-full mb-2" />
					<Skeleton className="h-16 w-full" />
				</View>
			)}

			{isTrackLoading && variant === "mini" && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center px-4 py-3 gap-3"
				>
					<Skeleton className="w-12 h-12 rounded-lg" />
					<View className="flex-1 gap-2 bg-transparent">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</View>
					<Skeleton className="w-10 h-10 rounded-full" />
				</View>
			)}

			{!isTrackLoading && currentTrack && (
				<SwipeablePlayer
					onSwipeRight={onSkipPrevious}
					onSwipeLeft={onSkipNext}
					hasPrevious={hasPrevious}
					hasNext={hasNext}
					iconColor={themeColors.tint}
					nextArtworkUrl={nextArtworkUrl}
					previousArtworkUrl={previousArtworkUrl}
				>
					<AnimatedPlayerContent
						variant={variant}
						trackId={trackId}
						artworkUrl={currentTrack.artworkUrl}
						title={currentTrack.title}
						artistId={currentTrack.artistId}
						artistName={currentTrack.artist.name}
						genre={currentTrack.genre}
						explicit={currentTrack.explicit}
						isPlaying={status.playing}
						isLoaded={status.isLoaded}
						loadingStream={loadingStream}
						sliderValue={safeSliderValue}
						sliderMax={safeSliderMax}
						duration={status.duration ?? 0}
						themeColors={themeColors}
						hasNext={hasNext}
						hasPrevious={hasPrevious}
						isShuffled={isShuffled}
						repeatMode={repeatMode}
						isMuted={isMuted}
						onExpand={onExpand}
						onCollapse={onCollapse}
						onTogglePlayback={togglePlayback}
						onToggleRepeat={onToggleRepeat}
						onToggleShuffle={onToggleShuffle}
						onToggleMute={toggleMute}
						onSkipNext={onSkipNext}
						onSkipPrevious={onSkipPrevious}
						onSlidingStart={handleSlidingStart}
						onValueChange={handleValueChange}
						onSlidingComplete={handleSlidingComplete}
						onQueuePress={() => {
							onCollapse?.();
							router.push("/queue");
						}}
					/>
				</SwipeablePlayer>
			)}

			{!isTrackLoading && !currentTrack && !error && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 items-center justify-center px-8 bg-background"
				>
					<AlertCircle size={64} className="opacity-30 mb-4" />
					<Text className="text-xl font-semibold mb-2">Track Not Found</Text>
					<Text className="text-center opacity-70 mb-6">
						The track you're looking for doesn't exist or has been removed.
					</Text>
					<Button onPress={handleClose}>
						<Text>Go Back</Text>
					</Button>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

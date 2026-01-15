import { View } from "@/components/Themed";
import { SwipeablePlayer } from "@/components/ui/SwipeablePlayer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useTrackAudioPlayer } from "@/lib/AudioPlayer";
import { useTrackStore } from "@/lib/actions/tracks";
import { usePlaybackStore } from "@/lib/stores/playback";
import { router } from "expo-router";
import { AlertCircle, ArrowLeft, ListMusic } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MiniPlayer } from "./player/MiniPlayer";
import { PlayerArtwork } from "./player/PlayerArtwork";
import { PlayerControls } from "./player/PlayerControls";
import { PlayerSlider } from "./player/PlayerSlider";
import { PlayerTrackInfo } from "./player/PlayerTrackInfo";

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
	onExpand,
	onCollapse,
	hasNext = false,
	hasPrevious = false,
	isShuffled = false,
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
		seekForward,
		seekBackward,
		toggleLoop,
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
					{variant === "full" && (
						<View style={{ flex: 1 }} className="px-4 py-4 gap-4">
							{/* Artwork Section */}
							<View className="items-center justify-center px-8 py-2">
								<PlayerArtwork
									artworkUrl={currentTrack.artworkUrl}
									explicit={currentTrack.explicit}
								/>
							</View>

							{/* Track Info */}
							<PlayerTrackInfo
								title={currentTrack.title}
								collapseOnClick={onCollapse}
								artistId={currentTrack.artistId}
								artistName={currentTrack.artist.name}
								genre={currentTrack.genre}
							/>

							{/* Playback Controls */}
							<View
								style={{ backgroundColor: "transparent" }}
								className="px-8 pb-8"
							>
								<PlayerControls
									isLoaded={status.isLoaded}
									isPlaying={status.playing}
									isLooping={player.loop}
									isMuted={isMuted}
									loadingStream={loadingStream}
									themeColors={themeColors}
									hasNext={hasNext}
									hasPrevious={hasPrevious}
									isShuffled={isShuffled}
									onTogglePlayback={togglePlayback}
									onToggleLoop={toggleLoop}
									onToggleMute={toggleMute}
									onToggleShuffle={onToggleShuffle}
									onSkipNext={onSkipNext}
									onSkipPrevious={onSkipPrevious}
								/>
							</View>

							{/* Progress Slider */}
							<PlayerSlider
								trackId={trackId}
								sliderValue={safeSliderValue}
								sliderMax={safeSliderMax}
								duration={status.duration}
								isLoaded={status.isLoaded}
								loadingStream={loadingStream}
								themeColors={themeColors}
								onSlidingStart={handleSlidingStart}
								onValueChange={handleValueChange}
								onSlidingComplete={handleSlidingComplete}
							/>

							{/* Secondary Actions */}
							<View
								style={{ backgroundColor: "transparent" }}
								className="flex-row items-center justify-end px-4"
							>
								<Pressable
									onPress={() => {
										onCollapse?.();
										router.push("/queue");
									}}
									
									style={{ padding: 8 }}
								>
									<ListMusic size={24} color={themeColors.tint} />
								</Pressable>
							</View>

							{/* Album Info
							{currentTrack.album ? (
								<Pressable
									onPress={() =>
										currentTrack.albumId &&
										router.push(`/album-detail?id=${currentTrack.albumId}`)
									}
								>
									<Text className="text-sm opacity-50 underline">
										{currentTrack.album.title}
									</Text>
								</Pressable>
							) : (
								<Text className="text-sm opacity-50">Single</Text>
							)} */}

							{/* Artist Card
							<ArtistCard
								artistName={currentTrack.artist.name}
								verified={currentTrack.artist.verified}
							/> */}
						</View>
					)}

					{variant === "mini" && (
						<MiniPlayer
							trackId={trackId}
							artworkUrl={currentTrack.artworkUrl}
							title={currentTrack.title}
							artistName={currentTrack.artist.name}
							isPlaying={status.playing}
							isLoaded={status.isLoaded}
							loadingStream={loadingStream}
							sliderValue={safeSliderValue}
							sliderMax={safeSliderMax}
							themeColors={themeColors}
							hasNext={hasNext}
							hasPrevious={hasPrevious}
							onExpand={onExpand}
							onTogglePlayback={togglePlayback}
							onSkipNext={onSkipNext}
							onSkipPrevious={onSkipPrevious}
							onSlidingStart={handleSlidingStart}
							onValueChange={handleValueChange}
							onSlidingComplete={handleSlidingComplete}
						/>
					)}
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

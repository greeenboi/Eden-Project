import {
	ListMusic,
	Music,
	Pause,
	Play,
	SkipBack,
	SkipForward,
} from "lucide-react-native";
import { memo, useEffect } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	StyleSheet,
	useWindowDimensions,
} from "react-native";
import Animated, {
	Easing,
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { View } from "@/components/Themed";
import { Card, CardContent } from "@/components/ui/card";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { Text } from "@/components/ui/text";
import type { RepeatMode } from "@/lib/actions/queue";
import { PlayerControls } from "./PlayerControls";
import { PlayerSlider } from "./PlayerSlider";
import { PlayerTrackInfo } from "./PlayerTrackInfo";

const SPRING_CONFIG = {
	damping: 20,
	stiffness: 200,
	mass: 0.8,
};

const TIMING_CONFIG = {
	duration: 280,
	easing: Easing.bezier(0.4, 0, 0.2, 1),
};

interface AnimatedPlayerContentProps {
	variant: "full" | "mini";
	trackId?: string;
	artworkUrl?: string | null;
	title: string;
	artistId?: string;
	artistName: string;
	genre?: string | null;
	explicit?: boolean;
	isPlaying: boolean;
	isLoaded: boolean;
	loadingStream: boolean;
	sliderValue: number;
	sliderMax: number;
	duration: number;
	themeColors: {
		primary: string;
		muted: string;
		tint: string;
	};
	hasNext?: boolean;
	hasPrevious?: boolean;
	isShuffled?: boolean;
	repeatMode?: RepeatMode;
	isMuted?: boolean;
	onExpand?: () => void;
	onCollapse?: () => void;
	onTogglePlayback: () => void;
	onToggleRepeat?: () => void;
	onToggleShuffle?: () => void;
	onToggleMute?: () => void;
	onSkipNext?: () => void;
	onSkipPrevious?: () => void;
	onSlidingStart: (value: number) => void;
	onValueChange: (value: number) => void;
	onSlidingComplete: (value: number) => void;
	onQueuePress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Animated player content that smoothly morphs between mini and full player modes.
 * Uses react-native-reanimated for performant layout animations.
 */
export const AnimatedPlayerContent = memo(function AnimatedPlayerContent({
	variant,
	trackId,
	artworkUrl,
	title,
	artistId,
	artistName,
	genre,
	explicit,
	isPlaying,
	isLoaded,
	loadingStream,
	sliderValue,
	sliderMax,
	duration,
	themeColors,
	hasNext = false,
	hasPrevious = false,
	isShuffled = false,
	repeatMode = "off",
	isMuted = false,
	onExpand,
	onCollapse,
	onTogglePlayback,
	onToggleRepeat,
	onToggleShuffle,
	onToggleMute,
	onSkipNext,
	onSkipPrevious,
	onSlidingStart,
	onValueChange,
	onSlidingComplete,
	onQueuePress,
}: AnimatedPlayerContentProps) {
	const { width: screenWidth } = useWindowDimensions();
	const isFull = variant === "full";

	// Animated value for morph transition (0 = mini, 1 = full)
	const progress = useSharedValue(isFull ? 1 : 0);

	useEffect(() => {
		progress.value = withSpring(isFull ? 1 : 0, SPRING_CONFIG);
	}, [isFull, progress]);

	// Artwork dimensions
	const MINI_ARTWORK_SIZE = 56;
	const FULL_ARTWORK_SIZE = Math.min(screenWidth - 64, 320);

	// Animated styles for artwork container
	const artworkContainerStyle = useAnimatedStyle(() => {
		const size = interpolate(
			progress.value,
			[0, 1],
			[MINI_ARTWORK_SIZE, FULL_ARTWORK_SIZE],
			Extrapolation.CLAMP,
		);

		return {
			width: size,
			height: size,
			borderRadius: interpolate(progress.value, [0, 1], [8, 12]),
		};
	});

	// Mini mode container style (row layout)
	const miniContainerStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(
				progress.value,
				[0, 0.3],
				[1, 0],
				Extrapolation.CLAMP,
			),
			transform: [
				{
					scale: interpolate(
						progress.value,
						[0, 0.3],
						[1, 0.95],
						Extrapolation.CLAMP,
					),
				},
			],
		};
	});

	// Full mode container style (column layout)
	const fullContainerStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(
				progress.value,
				[0.3, 1],
				[0, 1],
				Extrapolation.CLAMP,
			),
			transform: [
				{
					scale: interpolate(
						progress.value,
						[0.3, 1],
						[0.95, 1],
						Extrapolation.CLAMP,
					),
				},
			],
		};
	});

	// Text container style for mini mode
	const textContainerStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(
				progress.value,
				[0, 0.3],
				[1, 0],
				Extrapolation.CLAMP,
			),
			flex: 1,
		};
	});

	// Full mode content opacity
	const fullContentStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(
				progress.value,
				[0.5, 1],
				[0, 1],
				Extrapolation.CLAMP,
			),
		};
	});

	// Mini controls style
	const miniControlsStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(
				progress.value,
				[0, 0.3],
				[1, 0],
				Extrapolation.CLAMP,
			),
		};
	});

	const handlePress = () => {
		if (isFull) {
			onCollapse?.();
		} else {
			onExpand?.();
		}
	};

	return (
		<View style={styles.container}>
			{/* Mini mode layout - row direction */}
			{!isFull && (
				<Animated.View style={[styles.miniContainer, miniContainerStyle]}>
					{/* Artwork */}
					<Pressable onPress={onExpand}>
						<Animated.View
							style={[styles.artworkContainer, artworkContainerStyle]}
						>
							<Card className="w-full h-full p-0 overflow-hidden">
								<CardContent className="p-0 w-full h-full bg-primary/10">
									{artworkUrl ? (
										<Image
											source={{ uri: artworkUrl }}
											style={styles.artworkImage}
											resizeMode="cover"
										/>
									) : (
										<View style={styles.artworkPlaceholder}>
											<Music size={28} color={themeColors.muted} />
										</View>
									)}
								</CardContent>
							</Card>
						</Animated.View>
					</Pressable>

					{/* Title and Artist */}
					<Animated.View style={[styles.miniTextContainer, textContainerStyle]}>
						<Pressable onPress={onExpand} style={{ flex: 1 }}>
							<MarqueeText
								text={title}
								className="font-semibold text-foreground text-lg"
								speed={40}
								delay={2500}
							/>
							<Text className="text-xs opacity-70" numberOfLines={1}>
								{artistName}
							</Text>
						</Pressable>
					</Animated.View>

					{/* Controls */}
					<Animated.View style={[styles.miniControls, miniControlsStyle]}>
						<Pressable
							onPress={onSkipPrevious}
							disabled={!hasPrevious}
							style={{ opacity: hasPrevious ? 1 : 0.4 }}
						>
							<SkipBack color={themeColors.tint} size={22} />
						</Pressable>
						<Pressable
							onPress={onTogglePlayback}
							disabled={!isLoaded || loadingStream}
						>
							<View style={styles.miniPlayButton}>
								{isLoaded ? (
									isPlaying ? (
										<Pause color={themeColors.tint} size={24} />
									) : (
										<Play color={themeColors.tint} size={24} />
									)
								) : (
									<ActivityIndicator size="small" color={themeColors.tint} />
								)}
							</View>
						</Pressable>
						<Pressable
							onPress={onSkipNext}
							disabled={!hasNext}
							style={{ opacity: hasNext ? 1 : 0.4 }}
						>
							<SkipForward color={themeColors.tint} size={22} />
						</Pressable>
					</Animated.View>
				</Animated.View>
			)}

			{/* Full mode layout - column direction */}
			{isFull && (
				<Animated.View style={[styles.fullContainer, fullContainerStyle]}>
					{/* Artwork */}
					<View style={styles.fullArtworkWrapper}>
						<Animated.View
							style={[styles.artworkContainer, artworkContainerStyle]}
						>
							<Card className="w-full h-full p-0 overflow-hidden">
								<CardContent className="p-0 w-full h-full bg-primary/10">
									{artworkUrl ? (
										<Image
											source={{ uri: artworkUrl }}
											style={styles.artworkImage}
											resizeMode="cover"
										/>
									) : (
										<View style={styles.artworkPlaceholder}>
											<Music size={64} color={themeColors.muted} />
										</View>
									)}
								</CardContent>
							</Card>
							{explicit && (
								<View style={styles.explicitBadge}>
									<Text style={styles.explicitText}>E</Text>
								</View>
							)}
						</Animated.View>
					</View>
					{/* Track Info */}
					<PlayerTrackInfo
						title={title}
						collapseOnClick={onCollapse}
						artistId={artistId}
						artistName={artistName}
						genre={genre}
					/>

					{/* Playback Controls */}
					<View style={styles.controlsContainer}>
						<PlayerControls
							isLoaded={isLoaded}
							isPlaying={isPlaying}
							isMuted={isMuted}
							loadingStream={loadingStream}
							themeColors={themeColors}
							hasNext={hasNext}
							hasPrevious={hasPrevious}
							isShuffled={isShuffled}
							repeatMode={repeatMode}
							onTogglePlayback={onTogglePlayback}
							onToggleRepeat={onToggleRepeat}
							onToggleMute={onToggleMute}
							onToggleShuffle={onToggleShuffle}
							onSkipNext={onSkipNext}
							onSkipPrevious={onSkipPrevious}
						/>
					</View>

					{/* Progress Slider */}
					<PlayerSlider
						trackId={trackId}
						sliderValue={sliderValue}
						sliderMax={sliderMax}
						duration={duration}
						isLoaded={isLoaded}
						loadingStream={loadingStream}
						themeColors={themeColors}
						onSlidingStart={onSlidingStart}
						onValueChange={onValueChange}
						onSlidingComplete={onSlidingComplete}
					/>

					{/* Queue button */}
					<View style={styles.secondaryActions}>
						<Pressable onPress={onQueuePress} style={{ padding: 8 }}>
							<ListMusic size={24} color={themeColors.tint} />
						</Pressable>
					</View>
				</Animated.View>
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "transparent",
	},
	miniContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 12,
	},
	fullContainer: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 16,
	},
	fullArtworkWrapper: {
		alignItems: "center",
		paddingVertical: 16,
	},
	artworkContainer: {
		overflow: "hidden",
		alignSelf: "center",
	},
	artworkImage: {
		width: "100%",
		height: "100%",
	},
	artworkPlaceholder: {
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.1)",
	},
	explicitBadge: {
		position: "absolute",
		bottom: 8,
		right: 8,
		backgroundColor: "rgba(0,0,0,0.7)",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	explicitText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "bold",
	},
	miniTextContainer: {
		flex: 1,
		justifyContent: "center",
	},
	miniControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	miniPlayButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "rgba(255,255,255,0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	fullContent: {
		flex: 1,
		gap: 16,
		paddingHorizontal: 16,
	},
	controlsContainer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	secondaryActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		paddingHorizontal: 8,
	},
});

import { SkipBack, SkipForward } from "lucide-react-native";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import Swipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";

interface SwipeablePlayerProps {
	children: ReactNode;
	/** Called when swiping right (skip to previous) */
	onSwipeRight?: () => void;
	/** Called when swiping left (skip to next) */
	onSwipeLeft?: () => void;
	/** Whether there's a previous track (enables right swipe) */
	hasPrevious?: boolean;
	/** Whether there's a next track (enables left swipe) */
	hasNext?: boolean;
	/** Icon color */
	iconColor?: string;
	/** Next track artwork URL for preview */
	nextArtworkUrl?: string | null;
	/** Previous track artwork URL for preview */
	previousArtworkUrl?: string | null;
}

interface ActionProps {
	iconColor: string;
	artworkUrl?: string | null;
	direction: "left" | "right";
	progress: SharedValue<number>;
	drag: SharedValue<number>;
}

function SwipeAction({ iconColor, artworkUrl, direction, drag }: ActionProps) {
	const isLeft = direction === "left";
	const Icon = isLeft ? SkipBack : SkipForward;

	const animatedStyle = useAnimatedStyle(() => {
		const translateX = isLeft
			? interpolate(drag.value, [0, 80], [-80, 0], Extrapolation.CLAMP)
			: interpolate(drag.value, [-80, 0], [0, 80], Extrapolation.CLAMP);

		const opacity = isLeft
			? interpolate(drag.value, [0, 60], [0, 1], Extrapolation.CLAMP)
			: interpolate(drag.value, [-60, 0], [1, 0], Extrapolation.CLAMP);

		const scale = isLeft
			? interpolate(drag.value, [0, 80], [0.6, 1], Extrapolation.CLAMP)
			: interpolate(drag.value, [-80, 0], [1, 0.6], Extrapolation.CLAMP);

		return {
			transform: [{ translateX }, { scale }],
			opacity,
		};
	});

	return (
		<Reanimated.View style={[styles.actionContainer, animatedStyle]}>
			{artworkUrl ? (
				<View style={styles.artworkPreview}>
					<Image
						source={{ uri: artworkUrl }}
						style={styles.artworkImage}
						resizeMode="cover"
					/>
					<View style={styles.artworkOverlay}>
						<Icon size={28} color={iconColor} />
					</View>
				</View>
			) : (
				<View style={styles.actionContent}>
					<Icon size={28} color={iconColor} />
				</View>
			)}
		</Reanimated.View>
	);
}

/**
 * A wrapper component that adds swipe-to-skip functionality to player components.
 * Swipe right to go to previous track, swipe left to skip to next track.
 * Shows artwork preview of next/previous track during swipe for native feel.
 */
export function SwipeablePlayer({
	children,
	onSwipeRight,
	onSwipeLeft,
	hasPrevious = false,
	hasNext = false,
	iconColor = "#fff",
	nextArtworkUrl,
	previousArtworkUrl,
}: SwipeablePlayerProps) {
	const swipeableRef = useRef<SwipeableMethods>(null);

	const handleSwipeOpen = (direction: "left" | "right") => {
		// Reset the swipeable immediately
		swipeableRef.current?.close();

		if (direction === "right" && hasPrevious && onSwipeRight) {
			onSwipeRight();
		} else if (direction === "left" && hasNext && onSwipeLeft) {
			onSwipeLeft();
		}
	};

	// Always render Swipeable to maintain consistent hook order
	// Use dragOffset to effectively disable swipe directions
	return (
		<Swipeable
			ref={swipeableRef}
			friction={1}
			leftThreshold={70}
			rightThreshold={70}
			dragOffsetFromLeftEdge={hasPrevious ? 10 : 10000}
			dragOffsetFromRightEdge={hasNext ? 10 : 10000}
			overshootLeft={false}
			overshootRight={false}
			overshootFriction={8}
			onSwipeableOpen={handleSwipeOpen}
			renderLeftActions={
				hasPrevious
					? (progress, drag) => (
							<SwipeAction
								iconColor={iconColor}
								artworkUrl={previousArtworkUrl}
								direction="left"
								progress={progress}
								drag={drag}
							/>
						)
					: undefined
			}
			renderRightActions={
				hasNext
					? (progress, drag) => (
							<SwipeAction
								iconColor={iconColor}
								artworkUrl={nextArtworkUrl}
								direction="right"
								progress={progress}
								drag={drag}
							/>
						)
					: undefined
			}
			containerStyle={styles.container}
			childrenContainerStyle={styles.childrenContainer}
		>
			{children}
		</Swipeable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		overflow: "hidden",
	},
	childrenContainer: {
		flex: 1,
	},
	actionContainer: {
		width: 80,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 8,
	},
	actionContent: {
		width: 56,
		height: 56,
		borderRadius: 12,
		backgroundColor: "rgba(255, 255, 255, 0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	artworkPreview: {
		width: 64,
		height: 64,
		borderRadius: 12,
		overflow: "hidden",
		position: "relative",
	},
	artworkImage: {
		width: "100%",
		height: "100%",
	},
	artworkOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
});

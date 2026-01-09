import { useEffect, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

interface MarqueeTextProps {
	/** The text to display */
	text: string;
	/** Text style class names */
	className?: string;
	/** Custom text styles */
	style?: object;
	/** Speed of the animation in ms per pixel */
	speed?: number;
	/** Delay before animation starts (and at each end) in ms */
	delay?: number;
	/** Maximum width before scrolling is needed (optional, auto-detected if not set) */
	maxWidth?: number;
}

/**
 * A text component that animates scrolling when the text overflows its container.
 * The text scrolls to show the full content, then scrolls back.
 */
export function MarqueeText({
	text,
	className,
	style,
	speed = 30, // ms per pixel
	delay = 2000, // delay at start and end
	maxWidth,
}: MarqueeTextProps) {
	const translateX = useSharedValue(0);
	const [containerWidth, setContainerWidth] = useState(0);
	const [textWidth, setTextWidth] = useState(0);

	const needsScroll = textWidth > containerWidth && containerWidth > 0;
	const overflowAmount = Math.max(0, textWidth - containerWidth);

	const handleContainerLayout = (e: LayoutChangeEvent) => {
		setContainerWidth(e.nativeEvent.layout.width);
	};

	const handleTextLayout = (e: LayoutChangeEvent) => {
		setTextWidth(e.nativeEvent.layout.width);
	};

	useEffect(() => {
		if (!needsScroll) {
			cancelAnimation(translateX);
			translateX.value = 0;
			return;
		}

		const scrollDuration = overflowAmount * speed;

		// Animate: wait -> scroll left -> wait -> scroll right -> repeat
		translateX.value = withDelay(
			delay,
			withRepeat(
				withSequence(
					// Scroll to the left (show end of text)
					withTiming(-overflowAmount, {
						duration: scrollDuration,
						easing: Easing.linear,
					}),
					// Pause at end
					withDelay(
						delay,
						// Scroll back to start
						withTiming(0, {
							duration: scrollDuration,
							easing: Easing.linear,
						})
					),
					// Small delay before repeating
					withDelay(delay / 2, withTiming(0, { duration: 0 }))
				),
				-1, // Infinite repeat
				false // Don't reverse
			)
		);

		return () => {
			cancelAnimation(translateX);
		};
	}, [needsScroll, overflowAmount, speed, delay, translateX]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	return (
		<View
			style={[styles.container, maxWidth ? { maxWidth } : undefined]}
			onLayout={handleContainerLayout}
		>
			<Animated.Text
				style={[style, animatedStyle, styles.text]}
				className={className}
				numberOfLines={1}
				onLayout={handleTextLayout}
			>
				{text}
			</Animated.Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		overflow: "hidden",
		flex: 1,
	},
	text: {
		flexShrink: 0,
	},
});

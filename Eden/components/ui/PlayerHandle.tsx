import Colors from "@/constants/Colors";
import { usePlaybackStore } from "@/lib/stores/playback";
import { Host, Shape, Slider } from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";
import type { BottomSheetHandleProps } from "@gorhom/bottom-sheet";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	type StyleProp,
	StyleSheet,
	type ViewStyle,
	useColorScheme,
} from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";

const toRad = (deg: number) => {
	"worklet";
	return (deg * Math.PI) / 180;
};

const transformOrigin = (
	{ x, y }: { x: number; y: number },
	...transformations: {
		rotate?: string;
		translateX?: number;
		translateY?: number;
		scale?: number;
	}[]
): ViewStyle["transform"] => {
	"worklet";
	return [
		{ translateX: x },
		{ translateY: y },
		...transformations,
		{ translateX: x * -1 },
		{ translateY: y * -1 },
	] as ViewStyle["transform"];
};

interface PlayerHandleProps extends BottomSheetHandleProps {
	style?: StyleProp<ViewStyle>;
}

/**
 * Custom handle component that shows:
 * - Regular animated handle when in full/expanded mode
 * - Progress slider when in mini mode (index 0)
 */
const PlayerHandle: React.FC<PlayerHandleProps> = ({
	style,
	animatedIndex,
}) => {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	// Playback state from shared store
	const { currentTime, duration, isLoaded, isLoading, seekTo } =
		usePlaybackStore();

	// Local scrub state for smooth slider interaction
	const [isScrubbing, setIsScrubbing] = useState(false);
	const [scrubValue, setScrubValue] = useState(0);
	const isEditingRef = useRef(false);
	const lastKnownValueRef = useRef(0);

	// Calculate safe slider values
	const sliderMax = useMemo(() => {
		if (!Number.isFinite(duration) || duration <= 0) return 1;
		return duration;
	}, [duration]);

	const sliderValue = useMemo(() => {
		const value = isScrubbing ? scrubValue : currentTime;
		if (!Number.isFinite(value)) return 0;
		return Math.min(sliderMax, Math.max(0, value));
	}, [isScrubbing, scrubValue, currentTime, sliderMax]);

	const handleSlidingStart = useCallback((value: number) => {
		lastKnownValueRef.current = Number.isFinite(value) ? value : 0;
		setIsScrubbing(true);
		setScrubValue(Number.isFinite(value) ? value : 0);
	}, []);

	const handleValueChange = useCallback((value: number) => {
		if (!Number.isFinite(value)) return;
		lastKnownValueRef.current = value;
		setScrubValue(value);
	}, []);

	const handleSlidingComplete = useCallback(
		(value: number) => {
			setIsScrubbing(false);
			if (!isLoaded || !Number.isFinite(value) || !seekTo) return;
			seekTo(Math.min(sliderMax, Math.max(0, value)));
		},
		[isLoaded, sliderMax, seekTo],
	);

	// Animated styles for the regular handle
	const indicatorTransformOriginY = useDerivedValue(() =>
		interpolate(
			animatedIndex.value,
			[0, 1, 2],
			[-1, 0, 1],
			Extrapolation.CLAMP,
		),
	);

	const containerAnimatedStyle = useAnimatedStyle(() => {
		const borderTopRadius = interpolate(
			animatedIndex.value,
			[0, 1, 2],
			[12, 20, 0],
			Extrapolation.CLAMP,
		);
		return {
			borderTopLeftRadius: borderTopRadius,
			borderTopRightRadius: borderTopRadius,
		};
	});

	// Opacity for slider (visible at index 0) vs handle indicators (visible at index 1+)
	const sliderOpacityStyle = useAnimatedStyle(() => {
		const opacity = interpolate(
			animatedIndex.value,
			[0, 0.3],
			[1, 0],
			Extrapolation.CLAMP,
		);
		return { opacity };
	});

	const indicatorOpacityStyle = useAnimatedStyle(() => {
		const opacity = interpolate(
			animatedIndex.value,
			[0, 0.3],
			[0, 1],
			Extrapolation.CLAMP,
		);
		return { opacity };
	});

	const leftIndicatorAnimatedStyle = useAnimatedStyle(() => {
		const leftIndicatorRotate = interpolate(
			animatedIndex.value,
			[0, 1, 2],
			[toRad(-30), 0, toRad(30)],
			Extrapolation.CLAMP,
		);
		return {
			transform: transformOrigin(
				{ x: 0, y: indicatorTransformOriginY.value },
				{ rotate: `${leftIndicatorRotate}rad` },
				{ translateX: -5 },
			),
		};
	});

	const rightIndicatorAnimatedStyle = useAnimatedStyle(() => {
		const rightIndicatorRotate = interpolate(
			animatedIndex.value,
			[0, 1, 2],
			[toRad(30), 0, toRad(-30)],
			Extrapolation.CLAMP,
		);
		return {
			transform: transformOrigin(
				{ x: 0, y: indicatorTransformOriginY.value },
				{ rotate: `${rightIndicatorRotate}rad` },
				{ translateX: 5 },
			),
		};
	});

	const containerStyle = useMemo(
		() => [
			styles.header,
			{
				backgroundColor: themeColors.card,
				borderBottomColor: themeColors.border,
			},
			style,
		],
		[style, themeColors.card, themeColors.border],
	);

	return (
		<Animated.View
			style={[containerStyle, containerAnimatedStyle]}
			renderToHardwareTextureAndroid={true}
		>
			{/* Slider - visible in mini mode */}
			<Animated.View style={[styles.sliderContainer, sliderOpacityStyle]}>
				<Host matchContents style={styles.sliderHost}>
					<Slider
						value={sliderValue}
						min={0}
						max={sliderMax}
						enabled={isLoaded && !isLoading}
						colors={{
							thumbColor: themeColors.primary,
							activeTickColor: themeColors.primary,
							inactiveTickColor: themeColors.muted,
							activeTrackColor: themeColors.primary,
							inactiveTrackColor: themeColors.muted,
						}}
						onValueChange={(value: number) => {
							if (!isEditingRef.current) {
								isEditingRef.current = true;
								handleSlidingStart(value);
							}
							handleValueChange(value);
						}}
						onValueChangeFinished={() => {
							if (!isEditingRef.current) return;
							isEditingRef.current = false;
							handleSlidingComplete(lastKnownValueRef.current);
						}}
					>
						<Slider.Thumb>
							<Shape.Circle radius={2} color={themeColors.primary} modifiers={[size(12, 12)]} />
						</Slider.Thumb>
					</Slider>
				</Host>
			</Animated.View>

			{/* Regular handle indicators - visible in expanded mode */}
			<Animated.View
				style={[styles.indicatorContainer, indicatorOpacityStyle]}
			/>
		</Animated.View>
	);
};

export default PlayerHandle;

const styles = StyleSheet.create({
	header: {
		alignContent: "center",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderBottomWidth: 1,
		minHeight: 40,
	},
	sliderContainer: {
		position: "absolute",
		left: 16,
		right: 16,
		top: 0,
		bottom: 0,
		justifyContent: "center",
	},
	sliderHost: {
		width: "100%",
		height: 40,
	},
	indicatorContainer: {
		height: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	indicator: {
		width: 10,
		height: 4,
	},
	leftIndicator: {
		borderTopStartRadius: 2,
		borderBottomStartRadius: 2,
	},
	rightIndicator: {
		borderTopEndRadius: 2,
		borderBottomEndRadius: 2,
	},
});

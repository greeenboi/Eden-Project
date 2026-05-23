import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {useWindowDimensions, View} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

import useIsDark from "@/lib/hooks/isdark";

interface ShimmerTileProps {
	height: number | string;
	width?: number | string;
	flex?: number;
}

function ShimmerTile({ height, width = "100%", flex }: ShimmerTileProps) {
	const isDark = useIsDark();
	const progress = useSharedValue(0);
	const { width: screenWidth } = useWindowDimensions();

	useEffect(() => {
		progress.value = withRepeat(
			withTiming(1, { duration: 1300, easing: Easing.linear }),
			-1,
			false,
		);
	}, [progress]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: -screenWidth + progress.value * screenWidth * 2 },
		],
	}));

	const baseColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
	const highlight = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";

	return (
		<View
			style={{
				height: height as number,
				width: width as number,
				flex,
				backgroundColor: baseColor,
				borderRadius: 14,
				borderCurve: "continuous",
				overflow: "hidden",
			}}
		>
			<Animated.View
				style={[
					{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: 0,
						width: "100%",
					},
					animatedStyle,
				]}
			>
				<LinearGradient
					colors={["transparent", highlight, "transparent"]}
					start={{ x: 0, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
					style={{ flex: 1 }}
				/>
			</Animated.View>
		</View>
	);
}

export function LoadingSkeleton() {
	return (
		<View style={{ backgroundColor: "transparent" }} className="flex-1 p-4">
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<ShimmerTile flex={1} height={256} />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<ShimmerTile flex={1} height={176} />
				<ShimmerTile flex={1} height={176} />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<ShimmerTile flex={1} height={256} />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2"
			>
				<ShimmerTile flex={1} height={176} />
				<ShimmerTile flex={1} height={176} />
			</View>
		</View>
	);
}

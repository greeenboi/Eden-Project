import { useEffect } from "react";
import { ActivityIndicator, useColorScheme } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";

export function LoadingMoreTracks() {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;
	const pulse = useSharedValue(0.6);

	useEffect(() => {
		pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
	}, [pulse]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: pulse.value,
	}));

	return (
		<Animated.View
			entering={FadeIn.duration(180)}
			exiting={FadeOut.duration(160)}
		>
			<View
				style={{ backgroundColor: "transparent" }}
				className="py-4 items-center flex-row justify-center gap-2"
			>
				<ActivityIndicator size="small" color={themeColors.primary} />
				<Animated.View style={animatedStyle}>
					<Text className="text-sm opacity-70">Loading more tracks...</Text>
				</Animated.View>
			</View>
		</Animated.View>
	);
}

import { useEffect } from "react";
import { useColorScheme, View} from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

import Colors from "@/constants/Colors";
import WavyLoading from "@/components/ui/wavy-loading";

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
				<WavyLoading color={themeColors.primary} />
			</View>
		</Animated.View>
	);
}

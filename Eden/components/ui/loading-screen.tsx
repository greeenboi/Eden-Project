import WavyLoading from "@/components/ui/wavy-loading";
import Colors from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, View, useColorScheme } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Full-screen themed loading state with the native wavy spinner. Used as the
 * single global loader — shown the moment the splash screen hides and kept up
 * while the session context (and each screen's first data fetch) settles.
 */
export default function LoadingScreen({ dimension = 72 }: { dimension?: number }) {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	return (
		<View style={{ flex: 1, backgroundColor: themeColors.background }}>
			<LinearGradient
				colors={[`${themeColors.primary}22`, "transparent"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.6, y: 0.6 }}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: SCREEN_WIDTH * 1.1,
				}}
				pointerEvents="none"
			/>
			<Animated.View
				entering={FadeIn.duration(200)}
				style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
			>
				<WavyLoading color={themeColors.primary} dimension={dimension} />
			</Animated.View>
		</View>
	);
}

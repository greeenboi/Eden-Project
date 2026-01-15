import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ActivityIndicator } from "react-native";

export function LoadingMoreTracks() {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="py-4 items-center flex-row justify-center gap-2"
		>
			<ActivityIndicator size="small" color={themeColors.primary} />
			<Text className="text-sm opacity-70">Loading more tracks...</Text>
		</View>
	);
}

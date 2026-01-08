import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { ActivityIndicator } from "react-native";

export function LoadingMoreTracks() {
	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="py-4 items-center flex-row justify-center gap-2"
		>
			<ActivityIndicator size="small" color="#8b5cf6" />
			<Text className="text-sm opacity-70">Loading more tracks...</Text>
		</View>
	);
}

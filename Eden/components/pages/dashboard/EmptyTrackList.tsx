import { Music } from "lucide-react-native";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";

export function EmptyTrackList() {
	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="py-8 items-center"
		>
			<Music size={48} className="opacity-30 mb-4" />
			<Text className="text-center opacity-70">No tracks available</Text>
		</View>
	);
}

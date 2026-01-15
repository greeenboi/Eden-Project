import { Users } from "lucide-react-native";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";

export function ArtistsHeader() {
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;
	return (
		<View className="bg-transparent px-4 py-3">
			<View className="bg-transparent flex-row items-center gap-3">
				<Users size={28} className="text-primary" color={foregroundColor} />
				<Text style={{ color: foregroundColor }} className="text-3xl font-bold">
					Artists
				</Text>
			</View>
		</View>
	);
}

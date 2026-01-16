import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Menu, Users } from "lucide-react-native";
import { Pressable } from "react-native";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";

export function ArtistsHeader() {
	const navigation = useNavigation();
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	return (
		<View className="bg-transparent px-4 py-3 flex-row items-center justify-between">
			<View className="bg-transparent flex-row items-center gap-3">
				<Users size={28} className="text-primary" color={foregroundColor} />
				<Text style={{ color: foregroundColor }} className="text-3xl font-bold">
					Artists
				</Text>
			</View>
			<Pressable onPress={handleOpenDrawer}>
				<Menu size={28} color={foregroundColor} />
			</Pressable>
		</View>
	);
}

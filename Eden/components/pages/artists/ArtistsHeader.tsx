import { DrawerActions, useNavigation } from "expo-router/react-navigation";
import { Menu, Users } from "lucide-react-native";
import {Pressable, View} from "react-native";

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
		<View
			className="bg-transparent px-4 py-3 flex-row items-center justify-between"
			style={{
				borderBottomWidth: 0.5,
				borderBottomColor: isDark
					? "rgba(255,255,255,0.08)"
					: "rgba(0,0,0,0.06)",
			}}
		>
			<View className="bg-transparent flex-row items-center gap-3">
				<Users size={28} className="text-primary" color={foregroundColor} />
				<Text style={{ color: foregroundColor }} className="text-3xl font-bold">
					Artists
				</Text>
			</View>
			<Pressable
				onPress={handleOpenDrawer}
				style={({ pressed }) => ({
					opacity: pressed ? 0.6 : 1,
					transform: [{ scale: pressed ? 0.92 : 1 }],
				})}
			>
				<Menu size={32} color={foregroundColor} />
			</Pressable>
		</View>
	);
}

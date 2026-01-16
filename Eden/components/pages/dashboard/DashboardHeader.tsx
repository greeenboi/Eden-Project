import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { Menu, Music, Search } from "lucide-react-native";
import { Animated, Pressable } from "react-native";

interface DashboardHeaderProps {
	navPaddingTop: Animated.AnimatedInterpolation<number>;
	navPaddingBottom: Animated.AnimatedInterpolation<number>;
	navHeight: Animated.AnimatedInterpolation<number>;
	navTextScale: Animated.AnimatedInterpolation<number>;
	navIconScale: Animated.AnimatedInterpolation<number>;
	trackCount?: number;
	isLoading: boolean;
}

export function DashboardHeader({
	navPaddingTop,
	navPaddingBottom,
	navHeight,
	navTextScale,
	navIconScale,
	trackCount,
	isLoading,
}: DashboardHeaderProps) {
	const navigation = useNavigation();
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	return (
		<Animated.View
			style={{
				backgroundColor: "transparent",
				paddingHorizontal: 16,
				paddingTop: navPaddingTop,
				paddingBottom: navPaddingBottom,
				height: navHeight,
			}}
			className="flex flex-row items-center justify-between"
		>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-center gap-3"
			>
				<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
					<Music size={32} color={foregroundColor} />
				</Animated.View>
				<Animated.View
					style={{
						backgroundColor: "transparent",
						transform: [{ scale: navTextScale }],
					}}
				>
					<Text className="text-3xl text-foreground font-bold">All Songs</Text>
					{trackCount !== undefined && !isLoading && (
						<Text className="text-xs text-muted-foreground opacity-70">
							{trackCount} tracks available
						</Text>
					)}
				</Animated.View>
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex flex-row items-center justify-end gap-2.5"
			>
				<Pressable onPress={() => router.push("/search-songs")}>
					<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
						<Search color={foregroundColor} size={32} />
					</Animated.View>
				</Pressable>
				<Pressable onPress={handleOpenDrawer}>
					<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
						<Menu size={32} color={foregroundColor} />
					</Animated.View>
				</Pressable>
			</View>
		</Animated.View>
	);
}

import { DrawerActions, useNavigation } from "expo-router/react-navigation";
import { router } from "expo-router";
import { Menu, Music, Search } from "lucide-react-native";
import {Animated, Pressable, View} from "react-native";

import { BlurSurface } from "@/components/ui/blur-surface";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";

interface DashboardHeaderProps {
	navPaddingTop: Animated.AnimatedInterpolation<number>;
	navPaddingBottom: Animated.AnimatedInterpolation<number>;
	navHeight: Animated.AnimatedInterpolation<number>;
	navTextScale: Animated.AnimatedInterpolation<number>;
	navIconScale: Animated.AnimatedInterpolation<number>;
	trackCount?: number;
	isLoading: boolean;
}

const AnimatedBlurSurface = Animated.createAnimatedComponent(BlurSurface);

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
	const primaryColor = isDark ? THEME.dark.primary : THEME.light.primary;

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	return (
		<AnimatedBlurSurface
			intensity={50}
			style={{
				paddingHorizontal: 16,
				paddingTop: navPaddingTop,
				paddingBottom: navPaddingBottom,
				height: navHeight,
				borderBottomWidth: 0.5,
				borderBottomColor: `${primaryColor}33`,
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				overflow: "hidden",
			}}
		>
			<View
				pointerEvents="none"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: `${primaryColor}26`,
				}}
			/>
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
						<Text
							selectable
							className="text-xs text-muted-foreground opacity-70"
							style={{ fontVariant: ["tabular-nums"] }}
						>
							{trackCount} tracks available
						</Text>
					)}
				</Animated.View>
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex flex-row items-center justify-end gap-2.5"
			>
				<Pressable
					onPress={() => router.push("/search-songs")}
					style={({ pressed }) => ({
						opacity: pressed ? 0.6 : 1,
						transform: [{ scale: pressed ? 0.92 : 1 }],
					})}
				>
					<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
						<Search color={foregroundColor} size={32} />
					</Animated.View>
				</Pressable>
				<Pressable
					onPress={handleOpenDrawer}
					style={({ pressed }) => ({
						opacity: pressed ? 0.6 : 1,
						transform: [{ scale: pressed ? 0.92 : 1 }],
					})}
				>
					<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
						<Menu size={32} color={foregroundColor} />
					</Animated.View>
				</Pressable>
			</View>
		</AnimatedBlurSurface>
	);
}

import { View } from "@/components/Themed";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import { router } from "expo-router";
import { Menu, Music, Search, X } from "lucide-react-native";
import { Animated, Pressable } from "react-native";

interface DashboardHeaderProps {
	navPaddingTop: Animated.AnimatedInterpolation<number>;
	navPaddingBottom: Animated.AnimatedInterpolation<number>;
	navHeight: Animated.AnimatedInterpolation<number>;
	navTextScale: Animated.AnimatedInterpolation<number>;
	navIconScale: Animated.AnimatedInterpolation<number>;
	trackCount?: number;
	isLoading: boolean;
	menuButtonState: boolean;
	onMenuOpenChange: (open: boolean) => void;
	contentInsets: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
}

export function DashboardHeader({
	navPaddingTop,
	navPaddingBottom,
	navHeight,
	navTextScale,
	navIconScale,
	trackCount,
	isLoading,
	menuButtonState,
	onMenuOpenChange,
	contentInsets,
}: DashboardHeaderProps) {
	const isDark = useIsDark();
	const foregroundColor = isDark ? THEME.dark.foreground : THEME.light.foreground;

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
				<DropdownMenu onOpenChange={onMenuOpenChange}>
					<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
						<DropdownMenuTrigger>
							{menuButtonState ? (
								<X size={32} color={foregroundColor} />
							) : (
								<Menu size={32} color={foregroundColor} />
							)}
						</DropdownMenuTrigger>
					</Animated.View>
					<DropdownMenuContent
						insets={contentInsets}
						sideOffset={2}
						className="w-56"
						align="start"
					>
						<DropdownMenuItem onPress={() => router.push("/artists")}>
							<Text>Artists</Text>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>My Account</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onPress={() => router.push("/account")}>
								<Text>Account</Text>
							</DropdownMenuItem>
							<DropdownMenuItem onPress={() => router.push("/settings")}>
								<Text>Settings</Text>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</View>
		</Animated.View>
	);
}

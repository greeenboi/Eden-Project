import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Menu, Search } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Animated, Pressable } from "react-native";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";

interface DrawerHeaderProps {
	title: string;
	subtitle?: string;
	icon: LucideIcon;
	navPaddingTop?: Animated.AnimatedInterpolation<number> | number;
	navPaddingBottom?: Animated.AnimatedInterpolation<number> | number;
	navHeight?: Animated.AnimatedInterpolation<number> | number;
	navTextScale?: Animated.AnimatedInterpolation<number> | number;
	navIconScale?: Animated.AnimatedInterpolation<number> | number;
	showSearch?: boolean;
	onSearchPress?: () => void;
	rightContent?: ReactNode;
}

export function DrawerHeader({
	title,
	subtitle,
	icon: Icon,
	navPaddingTop = 16,
	navPaddingBottom = 12,
	navHeight = 92,
	navTextScale = 1,
	navIconScale = 1,
	showSearch = false,
	onSearchPress,
	rightContent,
}: DrawerHeaderProps) {
	const navigation = useNavigation();
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;

	const isAnimated =
		typeof navPaddingTop !== "number" ||
		typeof navPaddingBottom !== "number" ||
		typeof navHeight !== "number";

	const containerStyle = {
		backgroundColor: "transparent",
		paddingHorizontal: 16,
		paddingTop: navPaddingTop,
		paddingBottom: navPaddingBottom,
		height: navHeight,
	};

	const textTransform =
		typeof navTextScale === "number"
			? [{ scale: navTextScale }]
			: [{ scale: navTextScale }];

	const iconTransform =
		typeof navIconScale === "number"
			? [{ scale: navIconScale }]
			: [{ scale: navIconScale }];

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	const content = (
		<>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-center gap-3"
			>
				<Animated.View style={{ transform: iconTransform }}>
					<Icon size={32} color={foregroundColor} />
				</Animated.View>
				<Animated.View
					style={{
						backgroundColor: "transparent",
						transform: textTransform,
					}}
				>
					<Text className="text-3xl text-foreground font-bold">{title}</Text>
					{subtitle && (
						<Text className="text-xs text-muted-foreground opacity-70">
							{subtitle}
						</Text>
					)}
				</Animated.View>
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex flex-row items-center justify-end gap-2.5"
			>
				{showSearch && onSearchPress && (
					<Pressable onPress={onSearchPress}>
						<Animated.View style={{ transform: iconTransform }}>
							<Search color={foregroundColor} size={32} />
						</Animated.View>
					</Pressable>
				)}
				{rightContent}
				<Pressable onPress={handleOpenDrawer}>
					<Animated.View style={{ transform: iconTransform }}>
						<Menu size={32} color={foregroundColor} />
					</Animated.View>
				</Pressable>
			</View>
		</>
	);

	if (isAnimated) {
		return (
			<Animated.View
				style={containerStyle}
				className="flex flex-row items-center justify-between"
			>
				{content}
			</Animated.View>
		);
	}

	return (
		<View
			style={containerStyle as object}
			className="flex flex-row items-center justify-between"
		>
			{content}
		</View>
	);
}

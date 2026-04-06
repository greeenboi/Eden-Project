import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import {
	type DrawerContentComponentProps,
	DrawerContentScrollView,
	DrawerItem,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { Music, Search, Settings, Users, X } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

export function CustomDrawerContent(props: DrawerContentComponentProps) {
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;
	const mutedColor = isDark
		? THEME.dark.mutedForeground
		: THEME.light.mutedForeground;
	const backgroundColor = isDark
		? THEME.dark.background
		: THEME.light.background;
	const primaryColor = isDark ? THEME.dark.primary : THEME.light.primary;

	const currentRoute = props.state.routes[props.state.index]?.name;

	return (
		<View style={[styles.container, { backgroundColor }]}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<Music size={28} color={primaryColor} />
					<Text className="text-2xl font-bold text-foreground ml-2">Eden</Text>
				</View>
				<Pressable onPress={() => props.navigation.closeDrawer()} hitSlop={8}>
					<X size={24} color={mutedColor} />
				</Pressable>
			</View>

			{/* Navigation Items */}
			<DrawerContentScrollView
				{...props}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.section}>
					<Text className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">
						Browse
					</Text>
					<DrawerItem
						label="Home"
						icon={({ size }) => (
							<Music
								size={size}
								color={
									currentRoute === "index" ? primaryColor : foregroundColor
								}
							/>
						)}
						focused={currentRoute === "index"}
						onPress={() => {
							router.push("/");
							props.navigation.closeDrawer();
						}}
						activeTintColor={primaryColor}
						inactiveTintColor={foregroundColor}
						activeBackgroundColor={
							isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
						}
						style={styles.drawerItem}
						labelStyle={styles.drawerLabel}
					/>
					<DrawerItem
						label="All Songs"
						icon={({ size }) => (
							<Music
								size={size}
								color={
									currentRoute === "allsongs" ? primaryColor : foregroundColor
								}
							/>
						)}
						focused={currentRoute === "allsongs"}
						onPress={() => {
							router.push("/allsongs");
							props.navigation.closeDrawer();
						}}
						activeTintColor={primaryColor}
						inactiveTintColor={foregroundColor}
						activeBackgroundColor={
							isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
						}
						style={styles.drawerItem}
						labelStyle={styles.drawerLabel}
					/>
					<DrawerItem
						label="Artists"
						icon={({ size }) => (
							<Users
								size={size}
								color={
									currentRoute === "artists" ? primaryColor : foregroundColor
								}
							/>
						)}
						focused={currentRoute === "artists"}
						onPress={() => {
							router.push("/artists");
							props.navigation.closeDrawer();
						}}
						activeTintColor={primaryColor}
						inactiveTintColor={foregroundColor}
						activeBackgroundColor={
							isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
						}
						style={styles.drawerItem}
						labelStyle={styles.drawerLabel}
					/>
					<DrawerItem
						label="Search"
						icon={({ size }) => (
							<Search
								size={size}
								color={
									currentRoute === "search-songs"
										? primaryColor
										: foregroundColor
								}
							/>
						)}
						focused={currentRoute === "search-songs"}
						onPress={() => {
							router.push("/search-songs");
							props.navigation.closeDrawer();
						}}
						activeTintColor={primaryColor}
						inactiveTintColor={foregroundColor}
						activeBackgroundColor={
							isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
						}
						style={styles.drawerItem}
						labelStyle={styles.drawerLabel}
					/>
				</View>

				<View style={[styles.separator, { backgroundColor: mutedColor }]} />

				<View style={styles.section}>
					<Text className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">
						Account
					</Text>
					<DrawerItem
						label="Settings"
						icon={({ size }) => (
							<Settings size={size} color={foregroundColor} />
						)}
						onPress={() => {
							router.push("/settings");
							props.navigation.closeDrawer();
						}}
						inactiveTintColor={foregroundColor}
						style={styles.drawerItem}
						labelStyle={styles.drawerLabel}
					/>
				</View>
			</DrawerContentScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingTop: 60,
		paddingBottom: 16,
		backgroundColor: "transparent",
	},
	headerContent: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "transparent",
	},
	scrollContent: {
		paddingTop: 8,
	},
	section: {
		paddingVertical: 8,
		backgroundColor: "transparent",
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginHorizontal: 16,
		marginVertical: 8,
		opacity: 0.3,
	},
	drawerItem: {
		marginHorizontal: 8,
		borderRadius: 8,
	},
	drawerLabel: {
		fontSize: 15,
		fontWeight: "500",
	},
});

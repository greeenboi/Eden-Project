
import { BlurSurface } from "@/components/ui/blur-surface";
import { Text } from "@/components/ui/text";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import { router } from "expo-router";
import { DrawerContentScrollView, DrawerItem } from "expo-router/build/react-navigation/drawer";
import { Music, Search, Settings, Users, X } from "lucide-react-native";
import {Pressable, StyleSheet, View} from "react-native";

export function CustomDrawerContent(props: any) {
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;
	const mutedColor = isDark
		? THEME.dark.mutedForeground
		: THEME.light.mutedForeground;
	const primaryColor = isDark ? THEME.dark.primary : THEME.light.primary;

	const currentRoute = props.state.routes[props.state.index]?.name;
	const activeBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

	return (
		<BlurSurface intensity={70} style={styles.container}>
			<View
				style={[
					styles.surface,
					{
						backgroundColor: isDark
							? "rgba(10,10,12,0.55)"
							: "rgba(255,255,255,0.55)",
					},
				]}
			>
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<Music size={28} color={primaryColor} />
						<Text className="text-2xl font-bold text-foreground ml-2">
							Eden
						</Text>
					</View>
					<Pressable
						onPress={() => props.navigation.closeDrawer()}
						hitSlop={8}
						style={({ pressed }) => ({
							opacity: pressed ? 0.6 : 1,
							transform: [{ scale: pressed ? 0.92 : 1 }],
						})}
					>
						<X size={24} color={mutedColor} />
					</Pressable>
				</View>

				<DrawerContentScrollView
					{...props}
					contentContainerStyle={styles.scrollContent}
				>
					<View style={styles.section}>
						<DrawerItem
							label="Your Mix"
							focused={currentRoute === "index"}
							onPress={() => {
								router.push("/");
								props.navigation.closeDrawer();
							}}
							activeTintColor={primaryColor}
							inactiveTintColor={foregroundColor}
							activeBackgroundColor={activeBg}
							style={styles.drawerItem}
							labelStyle={styles.drawerLabel}
						/>
						<View style={[styles.separator, { backgroundColor: mutedColor }]} />
						<Text className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-4">
							Browse
						</Text>
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
							activeBackgroundColor={activeBg}
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
							activeBackgroundColor={activeBg}
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
							activeBackgroundColor={activeBg}
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
		</BlurSurface>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		borderTopLeftRadius: 24,
		borderBottomLeftRadius: 24,
		borderCurve: "continuous",
		overflow: "hidden",
	},
	surface: {
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
		borderRadius: 12,
		borderCurve: "continuous",
	},
	drawerLabel: {
		fontSize: 15,
		fontWeight: "500",
	},
});

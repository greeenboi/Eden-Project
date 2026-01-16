import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { CustomDrawerContent } from "@/components/pages/dashboard";
import { useSession } from "@/lib/ctx";
import { GlobalPlayerProvider } from "@/lib/GlobalPlayerProvider";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";

export default function AppLayout() {
	const { session, isLoading } = useSession();
	const isDark = useIsDark();

	const backgroundColor = isDark
		? THEME.dark.background
		: THEME.light.background;

	// Only require authentication within the (dashboard) group's layout as it could be
	// problematic to require authentication within the root layout.
	if (!session && !isLoading) {
		return <Redirect href="/sign-in" />;
	}

	return (
		<GlobalPlayerProvider>
			<Drawer
				drawerContent={(props) => <CustomDrawerContent {...props} />}
				screenOptions={{
					headerShown: false,
					drawerPosition: "right",
					drawerType: "slide",
					swipeEnabled: true,
					swipeEdgeWidth: 50,
					drawerStyle: {
						backgroundColor,
						width: 280,
					},
				}}
			>
				{/* Main drawer screens */}
				<Drawer.Screen
					name="index"
					options={{
						drawerLabel: "All Songs",
						drawerItemStyle: { display: "none" }, // Hide from auto-generated list
						lazy: false,
					}}
				/>
				<Drawer.Screen
					name="artists"
					options={{
						drawerLabel: "Artists",
						drawerItemStyle: { display: "none" },
						lazy: false,
					}}
				/>
				<Drawer.Screen
					name="search-songs"
					options={{
						drawerLabel: "Search",
						drawerItemStyle: { display: "none" },
						lazy: false,
					}}
				/>
				<Drawer.Screen
					name="settings"
					options={{
						drawerLabel: "Settings",
						drawerItemStyle: { display: "none" },
						lazy: false,
					}}
				/>

				{/* Modal screens - hidden from drawer */}
				<Drawer.Screen
					name="artist-detail"
					options={{
						drawerItemStyle: { display: "none" },
						swipeEnabled: false,
					}}
				/>
				<Drawer.Screen
					name="album-detail"
					options={{
						drawerItemStyle: { display: "none" },
						swipeEnabled: false,
					}}
				/>
				<Drawer.Screen
					name="queue"
					options={{
						drawerItemStyle: { display: "none" },
						swipeEnabled: false,
					}}
				/>
			</Drawer>
		</GlobalPlayerProvider>
	);
}

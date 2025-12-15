import { useColorScheme } from "@/components/useColorScheme";
import { SessionProvider, useSession } from "@/lib/ctx";
import { SplashScreenController } from "@/lib/splash";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "react-native-reanimated";
import "../global.css";
import { DarkThemeCustom, LightTheme } from "../lib/themeprovider.config";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary
} from "expo-router";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(dashboard)/index",
};

SplashScreen.setOptions({
	duration: 1000,
	fade: true,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		JetBrainsMono: require("../assets/fonts/JetBrainsMono-VariableFont_wght.ttf"),
		SourceSerif4: require("../assets/fonts/SourceSerif4-VariableFont_opsz,wght.ttf"),
		Merriweather: require("../assets/fonts/Merriweather-VariableFont_opsz,wdth,wght.ttf"),
		...FontAwesome.font,
	});

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error;
	}, [error]);

	if (!loaded) {
		return null;
	}

	return (
		<SessionProvider>
			<SplashScreenController />
			<RootLayoutNav />
		</SessionProvider>
	);
}

function RootLayoutNav() {
	const colorScheme = useColorScheme();
	const { session, isLoading } = useSession();
	console.log(session);
	console.log(!!session);

	// Wait for auth initialization
	if (isLoading) {
		return null;
	}

	return (
		<ThemeProvider
			value={colorScheme === "dark" ? DarkThemeCustom : LightTheme}
		>
			<GestureHandlerRootView >
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Protected guard={!session}>
						<Stack.Screen name="(auth)" />
					</Stack.Protected>

					<Stack.Protected guard={!!session}>
						<Stack.Screen name="(dashboard)" />
						<Stack.Screen name="(home)" />
					</Stack.Protected>
				</Stack>
				<PortalHost />
			</GestureHandlerRootView>
		</ThemeProvider>
	);
}

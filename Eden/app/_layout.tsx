import { SessionProvider, useSession } from "@/lib/ctx";
import { SplashScreenController } from "@/lib/splash";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { PortalHost } from "@rn-primitives/portal";
import TrackPlayer, { PlayerCommand } from "@rntp/player";
import { useRequireProfilerDevTools } from '@rozenite/require-profiler-plugin';
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { vexo } from "vexo-analytics";
import "../global.css";
import { DarkThemeCustom, LightTheme } from "../lib/themeprovider.config";

const globalTrackPlayer = globalThis as typeof globalThis & {
	__trackPlayerSetupPromise?: Promise<void>;
	__trackPlayerHandlerRegistered?: boolean;
};

if (!globalTrackPlayer.__trackPlayerHandlerRegistered) {
	TrackPlayer.registerBackgroundEventHandler(
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		() => require("../lib/services/playback-service").default,
	);
	globalTrackPlayer.__trackPlayerHandlerRegistered = true;
}

const ensureTrackPlayerSetup = (): Promise<void> => {
	if (globalTrackPlayer.__trackPlayerSetupPromise) {
		return globalTrackPlayer.__trackPlayerSetupPromise;
	}

	globalTrackPlayer.__trackPlayerSetupPromise = Promise.resolve(
		TrackPlayer.setupPlayer({
		contentType: "music",
		handleAudioBecomingNoisy: true,
		cache: {
			maxSizeBytes: 500 * 1024 * 1024,
			preloading: { window: 1 },
		},
		android: {
			notification: {
				channelId: "media-playback",
				channelName: "Media Playback",
				smallIcon: "ic_notification",
			},
		},
		}),
	)
		.then(() =>
			TrackPlayer.setCommands({
				capabilities: [
					PlayerCommand.PlayPause,
					PlayerCommand.Next,
					PlayerCommand.Previous,
					PlayerCommand.Seek,
					PlayerCommand.Stop,
				],
				handling: "native",
			}),
		)
		.catch((err: unknown) => {
			if (
				err instanceof Error &&
				err.message.includes("already set up")
			) {
				return;
			}
			globalTrackPlayer.__trackPlayerSetupPromise = undefined;
			throw err;
		});

	return globalTrackPlayer.__trackPlayerSetupPromise;
};

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary
} from "expo-router";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: "(dashboard)/index",
};

// biome-ignore lint/style/noNonNullAssertion: always gonna be there
vexo(process.env.EXPO_PUBLIC_VEXO_APPID!);

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


	// Enable Require Profiler DevTools
	useRequireProfilerDevTools();

	const trackPlayerSetupRef = useRef(false);
	useEffect(() => {
		if (trackPlayerSetupRef.current) return;
		trackPlayerSetupRef.current = true;
		ensureTrackPlayerSetup().catch((err: unknown) => {
			console.warn("[RNTP] setupPlayer failed", err);
		});
	}, []);

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

	// Wait for auth initialization
	if (isLoading) {
		return null;
	}

	return (
		<ThemeProvider
			value={colorScheme === "dark" ? DarkThemeCustom : LightTheme}
		>
			<GestureHandlerRootView>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Protected guard={!session}>
						<Stack.Screen name="(auth)" />
					</Stack.Protected>

					<Stack.Protected guard={!!session}>
						<Stack.Screen name="(dashboard)" />
					</Stack.Protected>
				</Stack>
				<PortalHost />
			</GestureHandlerRootView>
		</ThemeProvider>
	);
}

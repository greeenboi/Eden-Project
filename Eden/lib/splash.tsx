import { SplashScreen } from "expo-router";
import { useEffect } from "react";

export function SplashScreenController() {
	// Hide the splash as soon as the app shell mounts (fonts are already loaded
	// by the time this renders — RootLayout gates on that). The global
	// LoadingScreen then covers the session/context load, so users see the
	// animated native spinner instead of a frozen splash image.
	useEffect(() => {
		SplashScreen.hideAsync();
	}, []);

	return null;
}

import { useSession } from "@/lib/ctx";
import { Redirect, Stack } from "expo-router";

export default function AppLayout() {
	const { session, isLoading } = useSession();

	// Only require authentication within the (dashboard) group's layout as it could be
	// problematic to require authentication within the root layout.
	if (!session && !isLoading) {
		return <Redirect href="/sign-in" />;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="search-songs" />
			<Stack.Screen name="artists" />
			<Stack.Screen name="artist-detail" />
		</Stack>
	);
}

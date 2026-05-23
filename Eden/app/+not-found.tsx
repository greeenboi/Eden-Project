import { Link, Stack } from "expo-router";
import {StyleSheet, useColorScheme, View} from "react-native";


import Colors from "@/constants/Colors";
import {Text} from "@/components/ui/text";

export default function NotFoundScreen() {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	return (
		<>
			<Stack.Screen options={{ title: "Oops!" }} />
			<View style={styles.container}>
				<Text style={styles.title}>This screen doesn&apos;t exist.</Text>

				<Link href="/_sitemap" style={styles.link}>
					<Text style={[styles.linkText, { color: themeColors.primary }]}>
						Go to home screen!
					</Text>
				</Link>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
	},
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
	linkText: {
		fontSize: 14,
	},
});

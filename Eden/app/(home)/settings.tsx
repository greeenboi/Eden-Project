import { router } from "expo-router";
import {
	ArrowLeft,
	Bell,
	Database,
	Download,
	Info,
	Lock,
	Moon,
	Volume2,
	Wifi,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { View } from "@/components/Themed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

export default function SettingsScreen() {
	const [notifications, setNotifications] = useState(true);
	const [autoDownload, setAutoDownload] = useState(false);
	const [wifiOnly, setWifiOnly] = useState(true);
	const [darkMode, setDarkMode] = useState(false);

	const settingsSections = [
		{
			title: "Playback",
			items: [
				{
					icon: Volume2,
					label: "Audio Quality",
					description: "High (320kbps)",
					action: () => console.log("Audio quality"),
					type: "nav" as const,
				},
			],
		},
		{
			title: "Downloads",
			items: [
				{
					icon: Download,
					label: "Auto Download",
					description: "Download songs automatically",
					value: autoDownload,
					onChange: setAutoDownload,
					type: "switch" as const,
				},
				{
					icon: Wifi,
					label: "Download on WiFi Only",
					description: "Save mobile data",
					value: wifiOnly,
					onChange: setWifiOnly,
					type: "switch" as const,
				},
			],
		},
		{
			title: "Appearance",
			items: [
				{
					icon: Moon,
					label: "Dark Mode",
					description: "Use dark theme",
					value: darkMode,
					onChange: setDarkMode,
					type: "switch" as const,
				},
			],
		},
		{
			title: "Notifications",
			items: [
				{
					icon: Bell,
					label: "Push Notifications",
					description: "Get notified about new releases",
					value: notifications,
					onChange: setNotifications,
					type: "switch" as const,
				},
			],
		},
		{
			title: "Data & Storage",
			items: [
				{
					icon: Database,
					label: "Clear Cache",
					description: "Free up storage space",
					action: () => console.log("Clear cache"),
					type: "nav" as const,
				},
			],
		},
		{
			title: "Privacy & Security",
			items: [
				{
					icon: Lock,
					label: "Privacy Policy",
					description: "Read our privacy policy",
					action: () => console.log("Privacy policy"),
					type: "nav" as const,
				},
			],
		},
	];

	return (
		<View style={styles.container}>
			{/* Header */}
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-center justify-between p-4"
			>
				<Button variant="ghost" size="sm" onPress={() => router.back()}>
					<ArrowLeft size={24} />
				</Button>
				<Text className="text-xl font-bold">Settings</Text>
				<View style={{ backgroundColor: "transparent" }} className="w-10" />
			</View>

			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
			>
				{settingsSections.map((section, index) => (
					<Card key={index} className="mb-4">
						<CardHeader>
							<CardTitle>{section.title}</CardTitle>
						</CardHeader>
						<CardContent className="gap-3">
							{section.items.map((item, itemIndex) => (
								<View
									key={itemIndex}
									style={{ backgroundColor: "transparent" }}
								>
									{item.type === "switch" ? (
										<View
											style={{ backgroundColor: "transparent" }}
											className="flex-row items-center justify-between py-2"
										>
											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row items-center gap-3 flex-1"
											>
												<item.icon size={20} className="opacity-70" />
												<View
													style={{ backgroundColor: "transparent" }}
													className="flex-1"
												>
													<Label nativeID={`switch-${index}-${itemIndex}`}>
														{item.label}
													</Label>
													<Text className="text-sm opacity-70">
														{item.description}
													</Text>
												</View>
											</View>
											<Switch
												checked={item.value}
												onCheckedChange={item.onChange}
												aria-labelledby={`switch-${index}-${itemIndex}`}
											/>
										</View>
									) : (
										<Pressable onPress={item.action}>
											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row items-center justify-between py-2"
											>
												<View
													style={{ backgroundColor: "transparent" }}
													className="flex-row items-center gap-3 flex-1"
												>
													<item.icon size={20} className="opacity-70" />
													<View
														style={{ backgroundColor: "transparent" }}
														className="flex-1"
													>
														<Text className="text-base font-medium">
															{item.label}
														</Text>
														<Text className="text-sm opacity-70">
															{item.description}
														</Text>
													</View>
												</View>
												<Text className="opacity-50">→</Text>
											</View>
										</Pressable>
									)}
									{itemIndex < section.items.length - 1 && <Separator />}
								</View>
							))}
						</CardContent>
					</Card>
				))}

				{/* About Section */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle>About</CardTitle>
					</CardHeader>
					<CardContent>
						<Pressable onPress={() => router.push("/credits")}>
							<View
								style={{ backgroundColor: "transparent" }}
								className="flex-row items-center justify-between py-3"
							>
								<View
									style={{ backgroundColor: "transparent" }}
									className="flex-row items-center gap-3"
								>
									<Info size={20} className="opacity-70" />
									<View style={{ backgroundColor: "transparent" }}>
										<Text className="text-base font-medium">
											Credits & About
										</Text>
										<Text className="text-sm opacity-70">
											App version & contributors
										</Text>
									</View>
								</View>
								<Text className="opacity-50">→</Text>
							</View>
						</Pressable>
					</CardContent>
				</Card>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 16,
	},
});

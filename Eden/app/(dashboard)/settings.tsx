import { DrawerActions } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from "expo-mail-composer";
import { useNavigation } from "expo-router";
import {
	Bell,
	Bug,
	Download,
	Heart,
	LogOut,
	Mail,
	Menu,
	Settings,
	User,
	Volume2,
	Wifi,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "@/components/Themed";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/ctx";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import { generateGradientColors, getInitials } from "@/lib/utils";

export default function SettingsScreen() {
	const { signOut, user } = useSession();
	const [notifications, setNotifications] = useState(true);
	const [autoDownload, setAutoDownload] = useState(false);
	const [wifiOnly, setWifiOnly] = useState(true);
	const [bugReportOpen, setBugReportOpen] = useState(false);
	const [bugTitle, setBugTitle] = useState("");
	const [bugDescription, setBugDescription] = useState("");
	const navigation = useNavigation();
	const isDark = useIsDark();
	const foregroundColor = isDark
		? THEME.dark.foreground
		: THEME.light.foreground;

	const cardColor = THEME.dark.card;

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	const gradientColors = useMemo(
		() => generateGradientColors(user?.email || user?.name || "default"),
		[user?.email, user?.name],
	);

	const handleBugReport = async () => {
		const isAvailable = await MailComposer.isAvailableAsync();

		if (isAvailable) {
			await MailComposer.composeAsync({
				recipients: ["suvan.gowrishanker.204@gmail.com"],
				subject: `[Eden Bug Report] ${bugTitle}`,
				body: `Bug Description:\n${bugDescription}\n\n---\nUser: ${user?.email || "Unknown"}\nApp Version: 1.0.0`,
			});
			setBugReportOpen(false);
			setBugTitle("");
			setBugDescription("");
		}
	};

	// const comingSoon = ToastAndroid.show("Coming Soon", ToastAndroid.SHORT)

	const settingsSections = [
		{
			title: "Playback",
			items: [
				{
					icon: Volume2,
					label: "Audio Quality",
					description: "High (320kbps)",
					action: () => {},
					type: "nav" as const,
					isComingSoon: true,
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
					isComingSoon: true,
				},
				{
					icon: Wifi,
					label: "Download on WiFi Only",
					description: "Save mobile data",
					value: wifiOnly,
					onChange: setWifiOnly,
					type: "switch" as const,
					isComingSoon: true,
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
					isComingSoon: false,
				},
			],
		},
	];

	const accountInfo = [
		{ icon: User, label: "Name", value: user?.name || "User" },
		{ icon: Mail, label: "Email", value: user?.email || "" },
		// { icon: Shield, label: "Role", value: user?.role || "user" },
	];

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				{/* Header */}
				<View className=" px-4 py-3 flex-row items-center justify-between">
					<View className=" flex-row items-center gap-3">
						<Settings
							size={28}
							className="text-primary"
							color={foregroundColor}
						/>
						<Text
							style={{ color: foregroundColor }}
							className="text-3xl font-bold"
						>
							Settings
						</Text>
					</View>
					<Pressable onPress={handleOpenDrawer}>
						<Menu size={28} color={foregroundColor} />
					</Pressable>
				</View>

				<ScrollView className="flex-1" contentContainerClassName="p-4">
					{/* Profile Header Card */}
					<Card className="mb-4">
						<CardContent className="items-center py-6">
							<View className="w-24 h-24 rounded-full overflow-hidden mb-4 items-center justify-center">
								<LinearGradient
									colors={gradientColors}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
									style={{
										position: "absolute",
										left: 0,
										right: 0,
										top: 0,
										bottom: 0,
									}}
								/>
								<Avatar alt={user?.name || "User"} className="w-24 h-24 ">
									<AvatarFallback className="bg-transparent">
										<Text className="text-3xl text-white font-bold">
											{getInitials(user?.name)}
										</Text>
									</AvatarFallback>
								</Avatar>
							</View>
							<Text className="text-2xl font-bold mb-1">{user?.name}</Text>
							<Text className="text-base ">{user?.email}</Text>
						</CardContent>
					</Card>

					{/* Account Information */}
					<Card className="mb-4">
						<CardHeader>
							<CardTitle>Account Information</CardTitle>
						</CardHeader>
						<CardContent className="gap-3">
							{accountInfo.map((item, index) => (
								<View
									key={item.label}
									className=""
									style={{ backgroundColor: cardColor }}
								>
									<View
										className="flex-row items-center gap-3 py-2"
										style={{ backgroundColor: cardColor }}
									>
										<item.icon size={20} className="" />
										<View
											className="flex-1 "
											style={{ backgroundColor: cardColor }}
										>
											<Text className="text-sm  mb-1">{item.label}</Text>
											<Text className="text-base font-medium">
												{item.value}
											</Text>
										</View>
									</View>
									{index < accountInfo.length - 1 && <Separator />}
								</View>
							))}
						</CardContent>
					</Card>

					{/* Settings Sections */}
					{settingsSections.map((section) => (
						<Card key={section.title} className="mb-4">
							<CardHeader>
								<CardTitle>{section.title}</CardTitle>
							</CardHeader>
							<CardContent className="gap-3 bg-card">
								{section.items.map((item, itemIndex) => (
									<View key={item.label} className="bg-card">
										{item.type === "switch" ? (
											<View
												className="flex-row items-center justify-between py-2 bg-card"
												style={{ backgroundColor: cardColor }}
											>
												<View
													className="flex-row items-center gap-3 flex-1 bg-card"
													style={{ backgroundColor: cardColor }}
												>
													<item.icon size={20} className="" />
													<View
														className="flex-1 bg-card"
														style={{ backgroundColor: cardColor }}
													>
														<Label
															nativeID={`switch-${section.title}-${item.label}`}
														>
															{item.label}
														</Label>
														<Text className="text-sm ">{item.description}</Text>
													</View>
												</View>
												<Switch
													checked={item.value}
													onCheckedChange={item.onChange}
													aria-labelledby={`switch-${section.title}-${item.label}`}
													disabled={item.isComingSoon}
												/>
											</View>
										) : (
											<View
												className="flex-row items-center justify-between py-2 bg-card"
												style={{ backgroundColor: cardColor }}
											>
												<View
													className="flex-row items-center gap-3 flex-1 bg-card "
													style={{ backgroundColor: cardColor }}
												>
													<item.icon size={20} color={THEME.dark.primary} />
													<View
														className="flex-1 bg-card "
														style={{ backgroundColor: cardColor }}
													>
														<Text className="text-base font-medium">
															{item.label}
														</Text>
														<Text className="text-sm ">{item.description}</Text>
													</View>
												</View>
											</View>
										)}
										{itemIndex < section.items.length - 1 && <Separator />}
									</View>
								))}
							</CardContent>
						</Card>
					))}

					{/* Bug Report */}
					<Card className="mb-4">
						<CardHeader>
							<CardTitle>Feedback</CardTitle>
						</CardHeader>
						<CardContent>
							<Dialog open={bugReportOpen} onOpenChange={setBugReportOpen}>
								<DialogTrigger>
									<View
										className="flex-row items-center justify-between py-2"
										style={{ backgroundColor: cardColor }}
									>
										<View
											className="flex-row items-center gap-3"
											style={{ backgroundColor: cardColor }}
										>
											<Bug size={20} className="text-primary-foreground" />
											<View style={{ backgroundColor: cardColor }}>
												<Text className="text-base font-medium">
													Report a Bug
												</Text>
												<Text className="text-sm">Help us improve Eden</Text>
											</View>
										</View>
									</View>
								</DialogTrigger>
								<DialogContent className="max-w-[90%]">
									<DialogHeader>
										<DialogTitle>Report a Bug</DialogTitle>
										<DialogDescription>
											Describe the issue you encountered
										</DialogDescription>
									</DialogHeader>
									<ScrollView className="max-h-60">
										<View className="gap-4">
											<View className="gap-2">
												<Label nativeID="bug-title">Title</Label>
												<Input
													placeholder="Brief summary of the issue"
													value={bugTitle}
													onChangeText={setBugTitle}
													aria-labelledby="bug-title"
												/>
											</View>
											<View className="gap-2">
												<Label nativeID="bug-description">Description</Label>
												<Textarea
													placeholder="Describe what happened, what you expected, and steps to reproduce..."
													value={bugDescription}
													onChangeText={setBugDescription}
													aria-labelledby="bug-description"
													numberOfLines={4}
												/>
											</View>
										</View>
									</ScrollView>
									<DialogFooter>
										<DialogClose asChild>
											<Button variant="outline">
												<Text>Cancel</Text>
											</Button>
										</DialogClose>
										<Button
											onPress={handleBugReport}
											disabled={!bugTitle.trim() || !bugDescription.trim()}
										>
											<Mail size={16} className="mr-2" />
											<Text>Send Report</Text>
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</CardContent>
					</Card>

					{/* Sign Out Button */}
					<Button variant="destructive" onPress={signOut} className="mb-6">
						<LogOut size={20} />
						<Text className="ml-2 text-destructive-foreground">Sign Out</Text>
					</Button>

					<Separator className="mb-6" />

					{/* Developer Credits */}
					<Card className="mb-4">
						<CardHeader>
							<View
								className="flex-row items-center gap-2 "
								style={{ backgroundColor: cardColor }}
							>
								<CardTitle>Developer Credits</CardTitle>
							</View>
						</CardHeader>
						<CardContent>
							<View className="py-2" style={{ backgroundColor: cardColor }}>
								<Text className="text-base font-semibold mb-1">
									Suvan Gowrishanker
								</Text>
								<Text className="text-sm  mb-1">Lead Developer</Text>
								<View
									className="flex-row items-center gap-2 "
									style={{ backgroundColor: cardColor }}
								>
									<Mail size={14} color={THEME.dark.primary} />
									<Text className="text-sm ">
										suvan.gowrishanker.204@gmail.com
									</Text>
								</View>
							</View>
						</CardContent>
					</Card>

					{/* Footer */}
					<View className="items-center py-6 mb-8 ">
						<Heart size={20} color={THEME.dark.destructive} />
						<Text className="text-center  text-sm">
							Made with passion for music lovers
						</Text>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}

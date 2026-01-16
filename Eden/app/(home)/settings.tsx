import { View } from "@/components/Themed";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/ctx";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from "expo-mail-composer";
import { router } from "expo-router";
import {
	ArrowLeft,
	Bell,
	Bug,
	Code,
	Download,
	Heart,
	LogOut,
	Mail,
	Moon,
	Music,
	Shield,
	User,
	Volume2,
	Wifi,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Generate gradient colors based on user ID or email
function generateGradientColors(seed: string): [string, string, string] {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	const hue1 = Math.abs(hash % 360);
	const hue2 = (hue1 + 45) % 360;
	const hue3 = (hue1 + 90) % 360;

	return [
		`hsl(${hue1}, 70%, 50%)`,
		`hsl(${hue2}, 65%, 45%)`,
		`hsl(${hue3}, 60%, 40%)`,
	];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Setting item wrapper with tooltip for "coming soon" features
function SettingItemWithTooltip({
	children,
	isComingSoon,
}: {
	children: React.ReactNode;
	isComingSoon: boolean;
}) {
	if (!isComingSoon) {
		return <>{children}</>;
	}

	return (
		<Tooltip delayDuration={300}>
			<TooltipTrigger asChild>
				<View className="opacity-50">{children}</View>
			</TooltipTrigger>
			<TooltipContent>
				<Text>Coming Soon</Text>
			</TooltipContent>
		</Tooltip>
	);
}

export default function SettingsScreen() {
	const { signOut, user } = useSession();
	const [notifications, setNotifications] = useState(true);
	const [autoDownload, setAutoDownload] = useState(false);
	const [wifiOnly, setWifiOnly] = useState(true);
	const [darkMode, setDarkMode] = useState(false);
	const [bugReportOpen, setBugReportOpen] = useState(false);
	const [bugTitle, setBugTitle] = useState("");
	const [bugDescription, setBugDescription] = useState("");

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
			title: "Appearance",
			items: [
				{
					icon: Moon,
					label: "Dark Mode",
					description: "Use dark theme",
					value: darkMode,
					onChange: setDarkMode,
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
		{ icon: Shield, label: "Role", value: user?.role || "user" },
	];

	const technologies = [
		{ name: "React Native", description: "Mobile framework" },
		{ name: "Expo", description: "Development platform" },
		{ name: "TypeScript", description: "Type-safe JavaScript" },
		{ name: "Zustand", description: "State management" },
		{ name: "Cloudflare Workers", description: "Backend API" },
		{ name: "Drizzle ORM", description: "Database ORM" },
		{ name: "Hono", description: "Web framework" },
	];

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				{/* Header */}
				<View className="flex-row items-center justify-between p-4 bg-transparent">
					<Button variant="ghost" size="sm" onPress={() => router.back()}>
						<ArrowLeft size={24} />
					</Button>
					<Text className="text-xl font-bold">Settings</Text>
					<View className="w-10 bg-transparent" />
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
								<Avatar
									alt={user?.name || "User"}
									className="w-24 h-24 bg-transparent"
								>
									<AvatarFallback className="bg-transparent">
										<Text className="text-3xl text-white font-bold">
											{user?.name ? getInitials(user.name) : "U"}
										</Text>
									</AvatarFallback>
								</Avatar>
							</View>
							<Text className="text-2xl font-bold mb-1">{user?.name}</Text>
							<Text className="text-base opacity-70">{user?.email}</Text>
							<Badge className="mt-2">
								<Text className="capitalize">{user?.role || "user"}</Text>
							</Badge>
						</CardContent>
					</Card>

					{/* Account Information */}
					<Card className="mb-4">
						<CardHeader>
							<CardTitle>Account Information</CardTitle>
						</CardHeader>
						<CardContent className="gap-3">
							{accountInfo.map((item, index) => (
								<View key={item.label} className="bg-transparent">
									<View className="flex-row items-center gap-3 py-2 bg-transparent">
										<item.icon size={20} className="opacity-70" />
										<View className="flex-1 bg-transparent">
											<Text className="text-sm opacity-70 mb-1">
												{item.label}
											</Text>
											<Text className="text-base font-medium">{item.value}</Text>
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
							<CardContent className="gap-3">
								{section.items.map((item, itemIndex) => (
									<View key={item.label} className="bg-transparent">
										<SettingItemWithTooltip isComingSoon={item.isComingSoon}>
											{item.type === "switch" ? (
												<View className="flex-row items-center justify-between py-2 bg-transparent">
													<View className="flex-row items-center gap-3 flex-1 bg-transparent">
														<item.icon size={20} className="opacity-70" />
														<View className="flex-1 bg-transparent">
															<Label nativeID={`switch-${section.title}-${item.label}`}>
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
														aria-labelledby={`switch-${section.title}-${item.label}`}
														disabled={item.isComingSoon}
													/>
												</View>
											) : (
												<Pressable
													onPress={item.isComingSoon ? undefined : item.action}
												>
													<View className="flex-row items-center justify-between py-2 bg-transparent">
														<View className="flex-row items-center gap-3 flex-1 bg-transparent">
															<item.icon size={20} className="opacity-70" />
															<View className="flex-1 bg-transparent">
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
										</SettingItemWithTooltip>
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
								<DialogTrigger asChild>
									<Pressable>
										<View className="flex-row items-center justify-between py-2 bg-transparent">
											<View className="flex-row items-center gap-3 bg-transparent">
												<Bug size={20} className="opacity-70" />
												<View className="bg-transparent">
													<Text className="text-base font-medium">
														Report a Bug
													</Text>
													<Text className="text-sm opacity-70">
														Help us improve Eden
													</Text>
												</View>
											</View>
											<Text className="opacity-50">→</Text>
										</View>
									</Pressable>
								</DialogTrigger>
								<DialogContent className="w-[90%] max-w-md">
									<DialogHeader>
										<DialogTitle>Report a Bug</DialogTitle>
										<DialogDescription>
											Describe the issue you encountered
										</DialogDescription>
									</DialogHeader>
									<View className="gap-4 bg-transparent">
										<View className="gap-2 bg-transparent">
											<Label nativeID="bug-title">Title</Label>
											<Input
												placeholder="Brief summary of the issue"
												value={bugTitle}
												onChangeText={setBugTitle}
												aria-labelledby="bug-title"
											/>
										</View>
										<View className="gap-2 bg-transparent">
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

					{/* About Section */}
					<Card className="mb-4">
						<CardContent className="items-center py-6">
							<View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-3">
								<Music size={32} className="text-primary" />
							</View>
							<Text className="text-xl font-bold mb-1">Eden Music</Text>
							<Badge variant="outline">
								<Text>Version 1.0.0</Text>
							</Badge>
							<Text className="text-center opacity-70 mt-3 text-sm">
								A beautiful music streaming app built with modern technologies
							</Text>
						</CardContent>
					</Card>

					{/* Developer Credits */}
					<Card className="mb-4">
						<CardHeader>
							<View className="flex-row items-center gap-2 bg-transparent">
								<Code size={18} />
								<CardTitle>Developer</CardTitle>
							</View>
							<CardDescription>Built with ❤️ by</CardDescription>
						</CardHeader>
						<CardContent>
							<View className="py-2 bg-transparent">
								<Text className="text-base font-semibold mb-1">
									Suvan Gowrishanker
								</Text>
								<Text className="text-sm opacity-70 mb-1">Lead Developer</Text>
								<View className="flex-row items-center gap-2 bg-transparent">
									<Mail size={14} className="opacity-50" />
									<Text className="text-sm opacity-70">
										suvan.gowrishanker.204@gmail.com
									</Text>
								</View>
							</View>
						</CardContent>
					</Card>

					{/* Technologies */}
					<Card className="mb-4">
						<CardHeader>
							<CardTitle>Technologies</CardTitle>
							<CardDescription>Powered by amazing open-source tools</CardDescription>
						</CardHeader>
						<CardContent>
							<View className="flex-row flex-wrap gap-2 bg-transparent">
								{technologies.map((tech) => (
									<Badge key={tech.name} variant="secondary">
										<Text>{tech.name}</Text>
									</Badge>
								))}
							</View>
						</CardContent>
					</Card>

					{/* Footer */}
					<View className="items-center py-6 mb-8 bg-transparent">
						<Heart size={20} className="text-destructive mb-2" />
						<Text className="text-center opacity-70 text-sm">
							Made with passion for music lovers
						</Text>
						<Text className="text-xs opacity-50 mt-1">
							© 2025 Eden Music. All rights reserved.
						</Text>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}

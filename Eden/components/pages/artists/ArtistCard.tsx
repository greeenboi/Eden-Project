
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";
import type { Artist } from "@/lib/actions/artists";
import { Host, Icon } from "@expo/ui/jetpack-compose";
import {Pressable, useColorScheme, View} from "react-native";

interface ArtistCardProps {
	artist: Artist;
	onPress: (artistId: string) => void;
	showName?: boolean;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function ArtistCard({
	artist,
	onPress,
	showName = false,
}: ArtistCardProps) {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	if (showName) {
		return (
			<Pressable
				onPress={() => onPress(artist.id)}
				className="flex-1 flex-row items-center p-2 gap-3"
				style={({ pressed }) => ({
					opacity: pressed ? 0.85 : 1,
					transform: [{ scale: pressed ? 0.98 : 1 }],
				})}
			>
				<Avatar
					alt={artist.name}
					className="w-14 h-14 rounded-full"
					style={{
						borderCurve: "continuous",
					}}
				>
					{artist.avatarUrl ? (
						<AvatarImage source={{ uri: artist.avatarUrl }} />
					) : null}
					<AvatarFallback>
						<Text className="text-lg font-semibold">
							{getInitials(artist.name)}
						</Text>
					</AvatarFallback>
				</Avatar>
				<View className="flex-1 flex-row items-center gap-2 bg-transparent">
					<Text
						className="text-base font-semibold flex-shrink"
						numberOfLines={1}
					>
						{artist.name}
					</Text>
					{artist.verified && (
						<Host matchContents>
							<Icon
								tint={themeColors.success}
								size={14}
								source={require("../../../assets/icons/verified.xml")}
								contentDescription="Verification-Badge"
							/>
						</Host>
					)}
				</View>
			</Pressable>
		);
	}

	return (
		<Pressable
			onPress={() => onPress(artist.id)}
			className="flex-1 p-1.5 aspect-square"
			style={({ pressed }) => ({
				opacity: pressed ? 0.85 : 1,
				transform: [{ scale: pressed ? 0.96 : 1 }],
			})}
		>
			<View style={{ flex: 1, backgroundColor: "transparent" }}>
				<Avatar
					alt={artist.name}
					className="w-full h-full rounded-full"
					style={{
						boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
						borderCurve: "continuous",
					}}
				>
					{artist.avatarUrl ? (
						<AvatarImage source={{ uri: artist.avatarUrl }} />
					) : null}
					<AvatarFallback>
						<Text className="text-2xl font-semibold">
							{getInitials(artist.name)}
						</Text>
					</AvatarFallback>
				</Avatar>
				{artist.verified && (
					<View
						style={{
							position: "absolute",
							bottom: 4,
							right: 4,
							backgroundColor: "transparent",
						}}
					>
						<Host matchContents>
							<Icon
								tint={themeColors.success}
								size={18}
								source={require("../../../assets/icons/verified.xml")}
								contentDescription="Verification-Badge"
							/>
						</Host>
					</View>
				)}
			</View>
		</Pressable>
	);
}

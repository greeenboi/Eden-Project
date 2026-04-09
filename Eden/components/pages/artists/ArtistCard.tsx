import { View } from "@/components/Themed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";
import type { Artist } from "@/lib/actions/artists";
import { Host, Icon } from "@expo/ui/jetpack-compose";
import { Pressable, useColorScheme } from "react-native";

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
			>
				<Avatar alt={artist.name} className="w-14 h-14 rounded-full">
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
							<Icon tint={themeColors.success} size={14} source={require("../../../assets/icons/verified.xml")} contentDescription="Verification-Badge" />
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
		>
			<Avatar alt={artist.name} className="w-full h-full rounded-full">
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
				<Host matchContents >
					<Icon tint={themeColors.success} size={16} source={require("../../../assets/icons/verified.xml")} contentDescription="Verification-Badge" />
				</Host>
			)}
		</Pressable>
	);
}

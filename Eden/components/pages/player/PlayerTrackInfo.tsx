import { View } from "@/components/Themed";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { Pressable } from "react-native";

interface PlayerTrackInfoProps {
	title: string;
	artistId: string;
	artistName: string;
	genre?: string | null;
}

export function PlayerTrackInfo({
	title,
	artistId,
	artistName,
	genre,
}: PlayerTrackInfoProps) {
	return (
		<View style={{ backgroundColor: "transparent" }} className="px-8 pb-4">
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-start justify-between mb-2"
			>
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 mr-4"
				>
					<Text className="text-2xl font-bold mb-1">{title}</Text>
					<Pressable
						onPress={() => router.push(`/artist-detail?id=${artistId}`)}
					>
						<Text className="text-lg opacity-70 mb-1 underline">
							{artistName}
						</Text>
					</Pressable>
				</View>
				{genre && (
					<Badge variant="secondary" className="self-start mt-2">
						<Text className="text-xs">{genre}</Text>
					</Badge>
				)}
			</View>
		</View>
	);
}

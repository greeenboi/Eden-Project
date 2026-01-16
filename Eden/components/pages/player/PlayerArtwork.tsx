import { Music } from "lucide-react-native";
import { Image } from "react-native";
import { View } from "@/components/Themed";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

interface PlayerArtworkProps {
	artworkUrl?: string | null;
	explicit?: boolean;
}

export function PlayerArtwork({ artworkUrl, explicit }: PlayerArtworkProps) {
	return (
		<View
			style={{
				width: "100%",
				aspectRatio: 1,
				maxWidth: 320,
				borderRadius: 12,
				overflow: "hidden",
				position: "relative",
			}}
		>
			{artworkUrl ? (
				<Image
					source={{ uri: artworkUrl }}
					style={{ width: "100%", height: "100%" }}
					resizeMode="cover"
				/>
			) : (
				<View className="w-full h-full items-center justify-center bg-primary/10">
					<Music size={120} className="text-primary opacity-50" />
				</View>
			)}
			{explicit && (
				<Badge variant="destructive" className="absolute top-4 right-4">
					<Text>Explicit</Text>
				</Badge>
			)}
		</View>
	);
}

import { View } from "@/components/Themed";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Music } from "lucide-react-native";
import { Image } from "react-native";

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
				<View
					style={{
						width: "100%",
						height: "100%",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(139, 92, 246, 0.1)",
					}}
				>
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

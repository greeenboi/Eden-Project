import { View } from "@/components/Themed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { Track } from "@/lib/actions/tracks";
import { Clock, Disc } from "lucide-react-native";
import { Image, Pressable } from "react-native";

interface MasonryTrack extends Track {
	span: number;
	estimatedHeight: number;
}

interface TrackCardProps {
	item: MasonryTrack;
	index: number;
	onPress: (id: string) => void;
}

const IMAGE_COLORS = [
	"bg-purple-500/20",
	"bg-blue-500/20",
	"bg-green-500/20",
	"bg-yellow-500/20",
	"bg-red-500/20",
	"bg-pink-500/20",
	"bg-indigo-500/20",
	"bg-teal-500/20",
];

function formatDuration(seconds: number | null) {
	if (!seconds) return "--:--";
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackCard({ item, index, onPress }: TrackCardProps) {
	const imageColor = IMAGE_COLORS[index % IMAGE_COLORS.length];

	return (
		<Pressable onPress={() => onPress(item.id)} style={{ padding: 4 }}>
			<Card className="bg-transparent border-0 p-0">
				<View
					style={{ backgroundColor: "transparent" }}
					className={`w-full aspect-square ${imageColor} items-center justify-center relative`}
				>
					{item.artworkUrl ? (
						<Image
							source={{ uri: item.artworkUrl }}
							style={{ width: "100%", height: "100%", borderRadius: 11 }}
							resizeMode="cover"
						/>
					) : (
						<Disc size={60} className="opacity-30" />
					)}
					{item.explicit && (
						<Badge variant="destructive" className="absolute top-2 right-2">
							<Text className="text-xs">E</Text>
						</Badge>
					)}
					<Badge
						variant="default"
						className="flex-row items-center gap-1 absolute bottom-2 right-2"
					>
						<Clock size={12} className="opacity-50" />
						<Text className="text-xs opacity-70">
							{formatDuration(item.duration)}
						</Text>
					</Badge>
				</View>
				<CardContent className="px-1 pb-3 mt-0 items-center justify-between flex flex-row">
					<Text className="font-bold text-base" numberOfLines={2}>
						{item.title}
					</Text>
				</CardContent>
			</Card>
		</Pressable>
	);
}

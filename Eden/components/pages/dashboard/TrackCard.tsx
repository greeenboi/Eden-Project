
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { Track } from "@/lib/actions/tracks";
import { formatDuration } from "@/lib/utils";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Disc } from "lucide-react-native";
import {Image, Pressable, View} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface MasonryTrack extends Track {
	span: number;
	estimatedHeight: number;
}

interface TrackCardProps {
	item: MasonryTrack;
	index: number;
	onPress: (id: string) => void;
}

const GRADIENT_PAIRS: [string, string][] = [
	["#7c3aed33", "#ec489933"],
	["#0ea5e933", "#22d3ee33"],
	["#f5972933", "#ef444433"],
	["#10b98133", "#22c55e33"],
	["#a855f733", "#6366f133"],
	["#f59e0b33", "#fde68a22"],
	["#06b6d433", "#3b82f633"],
	["#f43f5e33", "#fb923c33"],
];

const ASPECT_RATIOS = [1, 4 / 5, 1, 5 / 4, 1, 3 / 4, 1, 1];

export function TrackCard({ item, index, onPress }: TrackCardProps) {
	const gradientColors = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
	const aspectRatio = ASPECT_RATIOS[index % ASPECT_RATIOS.length];

	return (
		<Animated.View
		className="p-1"
			entering={FadeInDown.duration(220)
				.delay(Math.min(index * 18, 360))
				.springify()
				.damping(16)}
		>
			<Pressable
				onPress={() => onPress(item.id)}
				style={({ pressed }) => ({
					padding: 8,
					opacity: pressed ? 0.9 : 1,
					transform: [{ scale: pressed ? 0.97 : 1 }],
				})}
			>
				<Card className="bg-transparent border-0 p-0">
					<View
						style={{
							backgroundColor: "transparent",
							borderRadius: 14,
							borderCurve: "continuous",
							overflow: "hidden",
							aspectRatio,
						}}
						className="w-full items-center justify-center relative"
					>
						{item.artworkUrl ? (
							<Image
								source={{ uri: item.artworkUrl }}
								style={{ width: "100%", height: "100%" }}
								resizeMode="cover"
							/>
						) : (
							<LinearGradient
								colors={gradientColors}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Disc size={60} className="opacity-40" />
							</LinearGradient>
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
							<Text
								className="text-xs opacity-70"
								style={{ fontVariant: ["tabular-nums"] }}
							>
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
		</Animated.View>
	);
}

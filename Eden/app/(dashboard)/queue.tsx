import { View } from "@/components/Themed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import { type QueueTrack, useQueueStore } from "@/lib/actions/queue";
import {
	queueCleared,
	queueTrackRemoved,
	trackPlayWithQueue,
} from "@/lib/analytics";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { GripVertical, Music, Pause, Trash2, X } from "lucide-react-native";
import { useCallback } from "react";
import { Image, Pressable, useColorScheme } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

interface QueueItemProps {
	track: QueueTrack;
	index: number;
	isCurrentTrack: boolean;
	isPlaying: boolean;
	themeColors: { primary: string; tint: string; muted: string };
	onPlay: () => void;
	onRemove: () => void;
}

function DeleteAction(
	themeColors: { tint: string },
	_progress: SharedValue<number>,
	drag: SharedValue<number>,
) {
	const animatedStyle = useAnimatedStyle(() => {
		const translateX = interpolate(
			drag.value,
			[-80, 0],
			[0, 80],
			Extrapolation.CLAMP,
		);
		const opacity = interpolate(
			drag.value,
			[-60, 0],
			[1, 0],
			Extrapolation.CLAMP,
		);
		return {
			transform: [{ translateX }],
			opacity,
		};
	});

	return (
		<Reanimated.View
			className="w-20 justify-center items-center"
			style={animatedStyle}
		>
			<View className="w-14 h-14 rounded-full bg-destructive justify-center items-center">
				<Trash2 size={24} className="text-destructive-foreground" />
			</View>
		</Reanimated.View>
	);
}

function QueueItem({
	track,
	index,
	isCurrentTrack,
	isPlaying,
	themeColors,
	onPlay,
	onRemove,
}: QueueItemProps) {
	return (
		<Swipeable
			friction={2}
			rightThreshold={60}
			dragOffsetFromRightEdge={15}
			overshootRight={false}
			onSwipeableOpen={(direction) => {
				if (direction === "left") {
					onRemove();
				}
			}}
			renderRightActions={(progress, drag) =>
				DeleteAction(themeColors, progress, drag)
			}
		>
			<Pressable onPress={onPlay}>
				<View
					className={`flex-row items-center py-2 px-2 gap-3 ${isCurrentTrack ? "bg-primary/20" : ""}`}
				>
					{/* Drag Handle */}
					<View className="p-1 opacity-50 bg-transparent">
						<GripVertical size={20} color={themeColors.muted} />
					</View>

					{/* Track Number or Playing Indicator */}
					<View className="w-6 items-center justify-center bg-transparent">
						{isCurrentTrack ? (
							isPlaying ? (
								<View className="flex-row items-end h-4 gap-0.5 bg-transparent">
									<View
										className="w-[3px] h-2 rounded-sm"
										style={{ backgroundColor: themeColors.primary }}
									/>
									<View
										className="w-[3px] h-3.5 rounded-sm"
										style={{ backgroundColor: themeColors.primary }}
									/>
									<View
										className="w-[3px] h-2 rounded-sm"
										style={{ backgroundColor: themeColors.primary }}
									/>
								</View>
							) : (
								<Pause size={16} color={themeColors.primary} />
							)
						) : (
							<Text className="text-sm opacity-50">{index + 1}</Text>
						)}
					</View>

					{/* Artwork */}
					<Card className="w-12 h-12 p-0 overflow-hidden">
						<CardContent className="p-0 w-full h-full bg-primary/10 items-center justify-center">
							{track.artworkUrl ? (
								<Image
									source={{ uri: track.artworkUrl }}
									className="w-full h-full"
									resizeMode="cover"
								/>
							) : (
								<Music size={20} color={themeColors.muted} />
							)}
						</CardContent>
					</Card>

					{/* Track Info */}
					<View className="flex-1 gap-0.5 bg-transparent">
						<Text
							className={`text-base font-medium ${isCurrentTrack ? "text-primary" : ""}`}
							numberOfLines={1}
						>
							{track.title}
						</Text>
					</View>

					{/* Duration */}
					{track.duration && (
						<Text className="text-sm opacity-50 pr-2">
							{formatDuration(track.duration)}
						</Text>
					)}
				</View>
			</Pressable>
		</Swipeable>
	);
}

function formatDuration(seconds: number): string {
	const totalSeconds = Math.floor(seconds);
	const minutes = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function QueueScreen() {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	const { queue, currentIndex } = useGlobalPlayer();
	const queueStore = useQueueStore();

	// Check if currently playing (you'd need to get this from playback state)
	// For now we'll just show the current track indicator
	const isPlaying = true; // This should come from actual playback state

	const currentTrack = queue[currentIndex] ?? null;
	const upcomingTracks = queue.slice(currentIndex + 1);

	const handlePlayTrack = useCallback(
		(index: number) => {
			const track = queue[index];
			if (track) {
				// Track analytics
				trackPlayWithQueue(track.id, track.title, "queue", queue.length, index);
			}
			queueStore.skipToIndex(index);
		},
		[queueStore, queue],
	);

	const handleRemoveTrack = useCallback(
		(trackId: string) => {
			const track = queue.find((t) => t.id === trackId);
			if (track) {
				queueTrackRemoved(trackId, track.title);
			}
			queueStore.removeFromQueueById(trackId);
		},
		[queueStore, queue],
	);

	const handleClearQueue = useCallback(() => {
		// Clear upcoming tracks only, keep current
		const upcoming = queue.slice(currentIndex + 1);

		// Track analytics
		queueCleared(upcoming.length);

		for (const track of upcoming) {
			queueStore.removeFromQueueById(track.id);
		}
	}, [queue, currentIndex, queueStore]);

	const renderQueueItem = useCallback(
		({ item, index }: { item: QueueTrack; index: number }) => {
			const actualIndex = currentIndex + 1 + index;
			return (
				<QueueItem
					track={item}
					index={actualIndex}
					isCurrentTrack={false}
					isPlaying={false}
					themeColors={themeColors}
					onPlay={() => handlePlayTrack(actualIndex)}
					onRemove={() => handleRemoveTrack(item.id)}
				/>
			);
		},
		[currentIndex, themeColors, handlePlayTrack, handleRemoveTrack],
	);

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				{/* Header */}
				<View className="flex-row items-center justify-between px-2 py-3 border-b border-border">
					<Button variant="ghost" size="sm" onPress={() => router.back()}>
						<X size={24} color={themeColors.tint} />
					</Button>
					<Text className="text-lg font-semibold">Queue</Text>
					<View className="w-10 bg-transparent" />
				</View>

				{/* Now Playing Section */}
				{currentTrack && (
					<View className="bg-transparent">
						<Text className="text-sm font-semibold uppercase opacity-60 px-4 py-2">
							Now Playing
						</Text>
						<QueueItem
							track={currentTrack}
							index={currentIndex}
							isCurrentTrack={true}
							isPlaying={isPlaying}
							themeColors={themeColors}
							onPlay={() => {}}
							onRemove={() => {}}
						/>
					</View>
				)}

				{/* Up Next Section */}
				<View className="flex-1">
					<View className="flex-row items-center justify-between px-4 py-2 bg-transparent">
						<Text className="text-sm font-semibold uppercase opacity-60">
							Next in Queue
						</Text>
						{upcomingTracks.length > 0 && (
							<Button variant="ghost" size="sm" onPress={handleClearQueue}>
								<Text className="text-primary">Clear</Text>
							</Button>
						)}
					</View>

					{upcomingTracks.length === 0 ? (
						<View className="flex-1 items-center justify-center py-12 gap-3 bg-transparent">
							<Music size={48} color={themeColors.muted} />
							<Text className="text-lg font-semibold">No tracks in queue</Text>
							<Text className="text-sm opacity-60">
								Add songs to play them next
							</Text>
						</View>
					) : (
						<FlashList
							data={upcomingTracks}
							renderItem={renderQueueItem}
							keyExtractor={(item) => item.id}
							contentContainerStyle={{ paddingBottom: 100 }}
						/>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
}

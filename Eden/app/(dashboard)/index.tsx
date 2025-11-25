import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import {
	AlertCircle,
	Clock,
	Disc,
	Music,
	Play,
	Search,
	Settings,
	User,
	Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet } from "react-native";
import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { type Track, useTrackStore } from "@/lib/actions/tracks";

const { width } = Dimensions.get("window");
const CARD_PADDING = 16;
const CARD_GAP = 8;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
	(width - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Extended track interface for masonry layout
interface MasonryTrack extends Track {
	span: number;
	estimatedHeight: number;
}

export default function AllSongsScreen() {
	const [searchQuery, setSearchQuery] = useState("");
	const { tracks, pagination, isLoading, error, fetchTracks, clearTracks } =
		useTrackStore();

	useEffect(() => {
		// Fetch published tracks on mount
		fetchTracks(1, 50, undefined, undefined, "published");

		return () => {
			clearTracks();
		};
	}, []);

	// Transform tracks for masonry layout with varying heights and spans
	const masonryTracks: MasonryTrack[] = useMemo(() => {
		return tracks.map((track, index) => {
			// Vary spans: most cards span 1, some span 2 (full width)
			const span = index % 7 === 0 ? 2 : 1;

			// Calculate estimated heights based on content
			const baseHeight = 180;
			const titleLength = track.title.length;
			const hasGenre = !!track.genre;

			// Longer titles need more height
			const titleHeight = titleLength > 30 ? 40 : titleLength > 20 ? 30 : 20;
			const genreHeight = hasGenre ? 20 : 0;

			const estimatedHeight = baseHeight + titleHeight + genreHeight;

			return {
				...track,
				span,
				estimatedHeight,
			};
		});
	}, [tracks]);

	const filteredTracks = masonryTracks.filter(
		(track) =>
			searchQuery.trim() === "" ||
			track.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleSongPress = (songId: string) => {
		router.push(`/playing-song?id=${songId}`);
	};

	const handleLoadMore = () => {
		if (
			pagination &&
			!isLoading &&
			pagination.page * pagination.limit < pagination.total
		) {
			fetchTracks(pagination.page + 1, 50, undefined, undefined, "published");
		}
	};

	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "--:--";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const getImageColors = (index: number) => {
		const colors = [
			"bg-purple-500/20",
			"bg-blue-500/20",
			"bg-green-500/20",
			"bg-yellow-500/20",
			"bg-red-500/20",
			"bg-pink-500/20",
			"bg-indigo-500/20",
			"bg-teal-500/20",
		];
		return colors[index % colors.length];
	};

	const renderTrackCard = ({
		item,
		index,
	}: {
		item: MasonryTrack;
		index: number;
	}) => {
		return (
			<Pressable
				onPress={() => handleSongPress(item.id)}
				style={{ padding: 4 }}
			>
				<Card className="overflow-hidden">
					{/* Album Art / Cover */}
					<View
						style={{ backgroundColor: "transparent" }}
						className={`w-full aspect-square ${getImageColors(index)} items-center justify-center`}
					>
						<Disc size={60} className="opacity-30" />
						{item.explicit && (
							<Badge variant="destructive" className="absolute top-2 right-2">
								<Text className="text-xs">E</Text>
							</Badge>
						)}
					</View>

					<CardContent className="p-3">
						<Text className="font-bold text-base mb-1" numberOfLines={2}>
							{item.title}
						</Text>

						{item.genre && (
							<Badge variant="secondary" className="self-start mb-2">
								<Text className="text-xs">{item.genre}</Text>
							</Badge>
						)}

						<View
							style={{ backgroundColor: "transparent" }}
							className="flex-row items-center gap-1 mb-2"
						>
							<Clock size={12} className="opacity-50" />
							<Text className="text-xs opacity-70">
								{formatDuration(item.duration)}
							</Text>
						</View>

						<View
							style={{ backgroundColor: "transparent" }}
							className="flex-row items-center justify-between"
						>
							<Badge
								variant={item.status === "published" ? "default" : "secondary"}
								className="flex-1 mr-2"
							>
								<Text className="text-xs capitalize">{item.status}</Text>
							</Badge>
							<View
								style={{ backgroundColor: "transparent" }}
								className="w-8 h-8 rounded-full bg-primary items-center justify-center"
							>
								<Play size={14} fill="white" color="white" />
							</View>
						</View>
					</CardContent>
				</Card>
			</Pressable>
		);
	};

	return (
		<View style={styles.container}>
			{/* Header with Navigation */}
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-center justify-between p-4 pb-2"
			>
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center gap-3"
				>
					<Music size={32} className="text-primary" />
					<View style={{ backgroundColor: "transparent" }}>
						<Text className="text-3xl font-bold">All Songs</Text>
						{pagination && !isLoading && (
							<Text className="text-xs opacity-70">
								{pagination.total} tracks available
							</Text>
						)}
					</View>
				</View>
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row gap-2"
				>
					<Pressable onPress={() => router.push("/artists")}>
						<View
							style={{ backgroundColor: "transparent" }}
							className="w-10 h-10 items-center justify-center"
						>
							<Users size={24} />
						</View>
					</Pressable>
					<Pressable onPress={() => router.push("/account")}>
						<Avatar alt="User" className="w-10 h-10">
							<AvatarFallback>
								<User size={20} />
							</AvatarFallback>
						</Avatar>
					</Pressable>
					<Pressable onPress={() => router.push("/settings")}>
						<View
							style={{ backgroundColor: "transparent" }}
							className="w-10 h-10 items-center justify-center"
						>
							<Settings size={24} />
						</View>
					</Pressable>
				</View>
			</View>

			{/* Error Alert */}
			{error && (
				<View style={{ backgroundColor: "transparent" }} className="px-4 pb-2">
					<Alert variant="destructive" icon={AlertCircle}>
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</View>
			)}

			{/* Search Bar */}
			<View style={{ backgroundColor: "transparent" }} className="px-4 pb-2">
				<Card>
					<CardContent className="pt-4">
						<View
							style={{ backgroundColor: "transparent" }}
							className="flex-row items-center gap-2"
						>
							<Search size={20} className="opacity-50" />
							<Input
								placeholder="Search tracks..."
								value={searchQuery}
								onChangeText={setSearchQuery}
								className="flex-1"
							/>
							<Button
								variant="ghost"
								size="sm"
								onPress={() => router.push("/search-songs")}
							>
								<Text>Advanced</Text>
							</Button>
						</View>
					</CardContent>
				</Card>
			</View>

			{/* Loading State */}
			{isLoading && tracks.length === 0 ? (
				<View style={{ backgroundColor: "transparent" }} className="flex-1 p-4">
					<View
						style={{ backgroundColor: "transparent" }}
						className="flex-row gap-2 mb-2"
					>
						<Skeleton className="flex-1 h-64" />
						<Skeleton className="flex-1 h-64" />
					</View>
					<View
						style={{ backgroundColor: "transparent" }}
						className="flex-row gap-2"
					>
						<Skeleton className="flex-1 h-64" />
						<Skeleton className="flex-1 h-64" />
					</View>
				</View>
			) : (
				<View style={styles.listContainer}>
					<FlashList
						data={filteredTracks}
						renderItem={renderTrackCard}
						keyExtractor={(item) => item.id}
						estimatedItemSize={200}
						numColumns={NUM_COLUMNS}
						masonry
						optimizeItemArrangement
						overrideItemLayout={(layout, item) => {
							layout.span = item.span;
						}}
						contentContainerStyle={styles.flashListContent}
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.5}
						ListEmptyComponent={
							<View
								style={{ backgroundColor: "transparent" }}
								className="py-8 items-center"
							>
								<Music size={48} className="opacity-30 mb-4" />
								<Text className="text-center opacity-70">
									{searchQuery
										? "No tracks found matching your search"
										: "No tracks available"}
								</Text>
							</View>
						}
						ListFooterComponent={
							isLoading && tracks.length > 0 ? (
								<View
									style={{ backgroundColor: "transparent" }}
									className="py-4 items-center"
								>
									<Text className="text-sm opacity-70">
										Loading more tracks...
									</Text>
								</View>
							) : null
						}
					/>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContainer: {
		flex: 1,
		paddingHorizontal: 12,
	},
	flashListContent: {
		paddingTop: 8,
		paddingBottom: 16,
	},
});

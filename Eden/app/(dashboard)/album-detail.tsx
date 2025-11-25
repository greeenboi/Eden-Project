import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useTrackStore } from "@/lib/actions/tracks";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    Clock,
    Music,
    Play
} from "lucide-react-native";
import { useEffect } from "react";
import { Image, Pressable, ScrollView, StyleSheet } from "react-native";

export default function AlbumDetailScreen() {
	const { id } = useLocalSearchParams();
	const { tracks, currentTrack, isLoading, error, fetchTracks, fetchTrackById, clearTracks } = useTrackStore();

	useEffect(() => {
		if (id) {
			// Fetch tracks for this album
			fetchTracks(1, 50, undefined, id as string);
		}

		return () => {
			clearTracks();
		};
	}, [id, fetchTracks, clearTracks]);

	// Fetch first track details to get album/artist info
	useEffect(() => {
		if (tracks.length > 0 && !currentTrack) {
			fetchTrackById(tracks[0].id);
		}
	}, [tracks, currentTrack, fetchTrackById]);

	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "--:--";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const getTotalDuration = () => {
		if (!tracks.length) return "0:00";
		const totalSeconds = tracks.reduce(
			(sum, track) => sum + (track.duration || 0),
			0,
		);
		const mins = Math.floor(totalSeconds / 60);
		const secs = totalSeconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const albumInfo = currentTrack?.album;
	const artistInfo = currentTrack?.artist;

	return (
		<View style={styles.container}>
			<ScrollView>
				{/* Header */}
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center justify-between p-4"
				>
					<Button variant="ghost" size="sm" onPress={() => router.back()}>
						<ArrowLeft size={24} />
					</Button>
					<Text className="text-lg font-semibold">Album</Text>
					<View style={{ backgroundColor: "transparent" }} className="w-10" />
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

				{/* Loading State */}
				{isLoading && (
					<View
						style={{ backgroundColor: "transparent" }}
						className="px-4"
					>
						<Skeleton className="w-full aspect-square max-w-sm mx-auto mb-4" />
						<Skeleton className="h-8 w-3/4 mb-2" />
						<Skeleton className="h-6 w-1/2 mb-4" />
						<Skeleton className="h-20 w-full mb-2" />
						<Skeleton className="h-20 w-full mb-2" />
					</View>
				)}

				{/* Album Content */}
				{!isLoading && tracks.length > 0 && (
					<>
						{/* Album Cover */}
						<View
							style={{ backgroundColor: "transparent" }}
							className="items-center px-8 mb-6"
						>
							<Card className="w-full aspect-square max-w-sm overflow-hidden">
								<CardContent className="flex-1 items-center justify-center bg-primary/10 p-0">
									{albumInfo?.artworkUrl ? (
										<Image
											source={{ uri: albumInfo.artworkUrl }}
											style={{ width: "100%", height: "100%" }}
											resizeMode="cover"
										/>
									) : (
										<Music size={120} className="text-primary opacity-50" />
									)}
								</CardContent>
							</Card>
						</View>

						{/* Album Info */}
						<View
							style={{ backgroundColor: "transparent" }}
							className="px-8 mb-6"
						>
							<Text className="text-3xl font-bold mb-2">
								{albumInfo?.title || "Album"}
							</Text>
							{artistInfo && (
								<Pressable
									onPress={() =>
										router.push(`/artist-detail?id=${artistInfo.id}`)
									}
								>
									<Text className="text-xl opacity-70 mb-2 underline">
										{artistInfo.name}
									</Text>
								</Pressable>
							)}
							{albumInfo?.releaseDate && (
								<Text className="text-sm opacity-50 mb-2">
									Released: {new Date(albumInfo.releaseDate).getFullYear()}
								</Text>
							)}
							<View
								style={{ backgroundColor: "transparent" }}
								className="flex-row items-center gap-3"
							>
								<Badge variant="secondary">
									<Text className="text-xs">{tracks.length} tracks</Text>
								</Badge>
								<Badge variant="secondary">
									<Text className="text-xs">{getTotalDuration()}</Text>
								</Badge>
							</View>
						</View>

						{/* Play Button */}
						<View
							style={{ backgroundColor: "transparent" }}
							className="px-8 mb-6"
						>
							<Button
								size="lg"
								onPress={() =>
									tracks[0] && router.push(`/playing-song?id=${tracks[0].id}`)
								}
							>
								<View
									style={{ backgroundColor: "transparent" }}
									className="flex-row items-center gap-2"
								>
									<Play size={20} fill="white" color="white" />
									<Text className="text-primary-foreground font-semibold">
										Play Album
									</Text>
								</View>
							</Button>
						</View>

						{/* Track List */}
						<View
							style={{ backgroundColor: "transparent" }}
							className="px-4"
						>
							<Text className="text-xl font-bold mb-4 px-4">Tracks</Text>
							{tracks.map((track, index) => (
								<Pressable
									key={track.id}
									onPress={() => router.push(`/playing-song?id=${track.id}`)}
								>
									<Card className="mb-2 overflow-hidden">
										<CardContent className="p-4">
											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row items-center gap-3"
											>
												{/* Track Number */}
												<View
													style={{ backgroundColor: "transparent" }}
													className="w-8 items-center"
												>
													<Text className="text-sm opacity-50">
														{index + 1}
													</Text>
												</View>

												{/* Track Artwork Thumbnail */}
												<View
													style={{ backgroundColor: "transparent" }}
													className="w-12 h-12 rounded overflow-hidden bg-primary/10"
												>
													{track.artworkUrl ? (
														<Image
															source={{ uri: track.artworkUrl }}
															style={{ width: "100%", height: "100%" }}
															resizeMode="cover"
														/>
													) : (
														<View
															style={{ backgroundColor: "transparent" }}
															className="flex-1 items-center justify-center"
														>
															<Music
																size={24}
																className="text-primary opacity-50"
															/>
														</View>
													)}
												</View>

												{/* Track Info */}
												<View
													style={{ backgroundColor: "transparent" }}
													className="flex-1"
												>
													<Text
														className="font-semibold mb-1"
														numberOfLines={1}
													>
														{track.title}
													</Text>
													<View
														style={{ backgroundColor: "transparent" }}
														className="flex-row items-center gap-2"
													>
														<View
															style={{ backgroundColor: "transparent" }}
															className="flex-row items-center gap-1"
														>
															<Clock size={12} className="opacity-50" />
															<Text className="text-xs opacity-70">
																{formatDuration(track.duration)}
															</Text>
														</View>
														{track.explicit && (
															<Badge variant="destructive" className="h-5">
																<Text className="text-xs">E</Text>
															</Badge>
														)}
													</View>
												</View>

												{/* Play Button */}
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
							))}
						</View>
					</>
				)}

				{/* Empty State */}
				{!isLoading && tracks.length === 0 && (
					<View
						style={{ backgroundColor: "transparent" }}
						className="flex-1 items-center justify-center p-8"
					>
						<Music size={64} className="opacity-30 mb-4" />
						<Text className="text-xl font-semibold mb-2">No Tracks Found</Text>
						<Text className="text-center opacity-70">
							This album doesn't have any tracks yet.
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

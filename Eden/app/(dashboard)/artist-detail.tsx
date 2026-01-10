import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import { useArtistStore } from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { router, useLocalSearchParams } from "expo-router";
import {
	AlertCircle,
	ArrowLeft,
	BarChart3,
	Heart,
	Mail,
	Music,
	Play,
	Share2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ArtistDetailScreen() {
	const { id } = useLocalSearchParams();
	const {
		currentArtist,
		currentArtistStats,
		currentArtistTracks,
		tracksPagination,
		isLoading,
		isLoadingStats,
		isLoadingTracks,
		error,
		fetchArtistById,
		fetchArtistStats,
		fetchArtistTracks,
		clearCurrentArtist,
	} = useArtistStore();
	const { playTrackWithQueue } = useGlobalPlayer();

	useEffect(() => {
		if (id) {
			fetchArtistById(id as string);
			fetchArtistStats(id as string);
			fetchArtistTracks(id as string, 1, 20, "published");
		}

		return () => {
			clearCurrentArtist();
		};
	}, [id, fetchArtistById, fetchArtistStats, fetchArtistTracks, clearCurrentArtist]);

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	// Convert tracks to queue format for artist playback
	const queueTracks: QueueTrack[] = useMemo(() => {
		return currentArtistTracks.map((track) => ({
			id: track.id,
			title: track.title,
			artistName: currentArtist?.name ?? "Loading...",
			artworkUrl: track.coverUrl,
			duration: track.duration,
		}));
	}, [currentArtistTracks, currentArtist?.name]);

	// Queue source locked to this artist
	const artistQueueSource: QueueSource | null = useMemo(() => {
		if (!id || !currentArtist?.name) return null;
		return {
			type: "artist",
			artistId: id as string,
			artistName: currentArtist.name,
		};
	}, [id, currentArtist?.name]);

	const handlePlayTrack = useCallback((trackId: string, index: number) => {
		const selectedTrack = queueTracks[index];
		if (selectedTrack && artistQueueSource) {
			playTrackWithQueue(selectedTrack, queueTracks, index, artistQueueSource);
		}
	}, [queueTracks, artistQueueSource, playTrackWithQueue]);

	const handlePlayArtist = useCallback(() => {
		if (queueTracks.length > 0 && artistQueueSource) {
			playTrackWithQueue(queueTracks[0], queueTracks, 0, artistQueueSource);
		}
	}, [queueTracks, artistQueueSource, playTrackWithQueue]);

	return (
		<SafeAreaView className="flex-1">
			<View style={styles.container}>
				{/* Header */}
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center justify-between p-4"
				>
					<Button variant="ghost" size="sm" onPress={() => router.back()}>
						<ArrowLeft size={24} />
					</Button>
					<Text className="text-lg font-semibold">Artist Details</Text>
					<Button variant="ghost" size="sm">
						<Share2 size={20} />
					</Button>
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
				>
					{/* Error Alert */}
					{error && (
						<Alert icon={AlertCircle} variant="destructive" className="mb-4">
							<AlertCircle size={20} />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Loading State */}
					{isLoading && (
						<View style={{ backgroundColor: "transparent" }} className="gap-4">
							<Card>
								<CardContent className="items-center py-6">
									<Skeleton className="w-32 h-32 rounded-full mb-4" />
									<Skeleton className="h-8 w-48 mb-2" />
									<Skeleton className="h-4 w-32 mb-3" />
									<Skeleton className="h-4 w-full mb-2" />
									<Skeleton className="h-10 w-full" />
								</CardContent>
							</Card>
							<Skeleton className="h-48 w-full" />
						</View>
					)}

					{/* Artist Content */}
					{!isLoading && currentArtist && (
						<>
							{/* Artist Header */}
							<Card className="mb-4">
								<CardContent className="items-center py-6">
									<Avatar alt={currentArtist.name} className="w-32 h-32 mb-4">
										{currentArtist.avatarUrl ? (
											<AvatarImage source={{ uri: currentArtist.avatarUrl }} />
										) : null}
										<AvatarFallback>
											<Text className="text-4xl">
												{getInitials(currentArtist.name)}
											</Text>
										</AvatarFallback>
									</Avatar>

									<Text className="text-3xl font-bold mb-2">
										{currentArtist.name}
									</Text>
									{currentArtist.verified && (
										<Badge variant="default" className="mb-3">
											<Text>✓ Verified Artist</Text>
										</Badge>
									)}

									{currentArtist.bio && (
										<Text className="text-center opacity-70 mb-4 px-4">
											{currentArtist.bio}
										</Text>
									)}

									<View
										style={{ backgroundColor: "transparent" }}
										className="flex-row items-center gap-2 mb-4"
									>
										<Mail size={16} className="opacity-70" />
										<Text className="text-sm opacity-70">
											{currentArtist.email}
										</Text>
									</View>

									<View
										style={{ backgroundColor: "transparent" }}
										className="flex-row gap-2 w-full"
									>
										<Button className="flex-1" onPress={handlePlayArtist}>
											<Play size={20} />
											<Text className="ml-2">Play</Text>
										</Button>
										<Button variant="outline">
											<Heart size={20} />
										</Button>
									</View>
								</CardContent>
							</Card>

							{/* Profile Details */}
							<Card className="mb-4">
								<CardHeader>
									<CardTitle className="flex-row items-center gap-2">
										<BarChart3 size={20} />
										<Text>Profile Information</Text>
									</CardTitle>
								</CardHeader>
								<CardContent className="gap-3">
									{currentArtist.profile && (
										<>
											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">Profile</Text>
												<Text className="text-sm font-semibold">
													{currentArtist.profile}
												</Text>
											</View>
											<Separator />
										</>
									)}

									<View
										style={{ backgroundColor: "transparent" }}
										className="flex-row justify-between"
									>
										<Text className="text-sm opacity-70">Member Since</Text>
										<Text className="text-sm font-semibold">
											{new Date(currentArtist.createdAt).toLocaleDateString()}
										</Text>
									</View>

									<Separator />

									<View
										style={{ backgroundColor: "transparent" }}
										className="flex-row justify-between"
									>
										<Text className="text-sm opacity-70">Last Updated</Text>
										<Text className="text-sm font-semibold">
											{new Date(currentArtist.updatedAt).toLocaleDateString()}
										</Text>
									</View>
								</CardContent>
							</Card>

							{/* Placeholder for future stats */}
							<Card className="mb-8">
								<CardHeader>
									<CardTitle className="flex-row items-center gap-2">
										<BarChart3 size={20} />
										<Text>Statistics</Text>
									</CardTitle>
								</CardHeader>
								<CardContent className="gap-3">
									{isLoadingStats ? (
										<>
											<Skeleton className="h-8 w-full mb-2" />
											<Skeleton className="h-8 w-full mb-2" />
											<Skeleton className="h-8 w-full" />
										</>
									) : currentArtistStats ? (
										<>
											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">Total Tracks</Text>
												<Text className="text-lg font-bold">
													{currentArtistStats.totalTracks}
												</Text>
											</View>
											<Separator />

											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">
													Published Tracks
												</Text>
												<Text className="text-lg font-bold">
													{currentArtistStats.publishedTracks}
												</Text>
											</View>
											<Separator />

											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">Total Albums</Text>
												<Text className="text-lg font-bold">
													{currentArtistStats.totalAlbums}
												</Text>
											</View>
											<Separator />

											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">Total Uploads</Text>
												<Text className="text-lg font-bold">
													{currentArtistStats.totalUploads}
												</Text>
											</View>
											<Separator />

											<View
												style={{ backgroundColor: "transparent" }}
												className="flex-row justify-between"
											>
												<Text className="text-sm opacity-70">
													Pending Uploads
												</Text>
												<Text className="text-lg font-bold">
													{currentArtistStats.pendingUploads}
												</Text>
											</View>
										</>
									) : (
										<Text className="text-sm opacity-70 text-center py-4">
											No statistics available
										</Text>
									)}
								</CardContent>
							</Card>

							{/* Tracks */}
							<Card className="mb-8">
								<CardHeader>
									<CardTitle className="flex-row items-center gap-2">
										<Music size={20} />
										<Text>Published Tracks</Text>
									</CardTitle>
									{tracksPagination && (
										<CardDescription>
											Showing {currentArtistTracks.length} of{" "}
											{tracksPagination.total} tracks
										</CardDescription>
									)}
								</CardHeader>
								<CardContent className="gap-2">
									{isLoadingTracks && currentArtistTracks.length === 0 ? (
										<>
											<Skeleton className="h-16 w-full mb-2" />
											<Skeleton className="h-16 w-full mb-2" />
											<Skeleton className="h-16 w-full" />
										</>
									) : currentArtistTracks.length > 0 ? (
										<>
											{currentArtistTracks.map((track, index) => (
												<Pressable
													key={track.id}
													onPress={() => handlePlayTrack(track.id, index)}
													className="active:opacity-70"
												>
													<Card className="mb-2">
														<CardContent className="flex-row items-center py-3">
															<View
																style={{ backgroundColor: "transparent" }}
																className="w-12 h-12 rounded-md bg-primary/10 items-center justify-center mr-3"
															>
																{track.coverUrl ? (
																	<Avatar
																		alt={track.title}
																		className="w-12 h-12 rounded-md"
																	>
																		<AvatarImage
																			source={{ uri: track.coverUrl }}
																		/>
																	</Avatar>
																) : (
																	<Music size={24} className="opacity-50" />
																)}
															</View>

															<View
																style={{ backgroundColor: "transparent" }}
																className="flex-1"
															>
																<Text className="font-semibold mb-1">
																	{track.title}
																</Text>
																<Text className="text-xs opacity-70">
																	{Math.floor(track.duration / 60)}:
																	{(track.duration % 60)
																		.toString()
																		.padStart(2, "0")}
																	{track.trackNumber &&
																		` • Track ${track.trackNumber}`}
																</Text>
															</View>

															<Badge
																variant={
																	track.status === "published"
																		? "default"
																		: "secondary"
																}
															>
																<Text className="text-xs capitalize">
																	{track.status}
																</Text>
															</Badge>
														</CardContent>
													</Card>
												</Pressable>
											))}

											{tracksPagination &&
												currentArtistTracks.length < tracksPagination.total && (
													<Button
														variant="outline"
														className="mt-4"
														onPress={() => {
															if (id && tracksPagination) {
																fetchArtistTracks(
																	id as string,
																	tracksPagination.page + 1,
																	20,
																	"published",
																);
															}
														}}
														disabled={isLoadingTracks}
													>
														<Text>
															{isLoadingTracks
																? "Loading..."
																: "Load More Tracks"}
														</Text>
													</Button>
												)}
										</>
									) : (
										<Text className="text-sm opacity-70 text-center py-4">
											No published tracks yet
										</Text>
									)}
								</CardContent>
							</Card>
						</>
					)}

					{/* Not Found State */}
					{!isLoading && !currentArtist && !error && (
						<Card>
							<CardContent className="py-8 items-center">
								<AlertCircle size={48} className="opacity-50 mb-4" />
								<Text className="text-center opacity-70">Artist not found</Text>
							</CardContent>
						</Card>
					)}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 16,
	},
});

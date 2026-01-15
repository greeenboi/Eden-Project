import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import { useAlbumStore } from "@/lib/actions/albums";
import { useArtistStore } from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import {
	AlertCircle,
	BadgeCheck,
	Disc3,
	Music,
	Play,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ArtistDetailScreen() {
	const { id } = useLocalSearchParams();
	const artistId = Array.isArray(id) ? id[0] : id;
	const [hasInitialized, setHasInitialized] = useState(false);
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

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
		clearError,
	} = useArtistStore();
	const {
		albums: artistAlbums,
		isLoading: isLoadingAlbums,
		fetchAlbums,
	} = useAlbumStore();
	const { playTrackWithQueue } = useGlobalPlayer();

	useEffect(() => {
		let isMounted = true;
		console.log(`[ArtistDetail] useEffect triggered, artistId: ${artistId}`);
		setHasInitialized(false);

		const loadArtistData = async () => {
			if (!artistId) {
				console.log("[ArtistDetail] No artistId, skipping fetch");
				return;
			}

			console.log(
				`[ArtistDetail] Starting to load data for artistId: ${artistId}`,
			);

			try {
				// Fetch all data in parallel, but handle errors gracefully
				const results = await Promise.allSettled([
					fetchArtistById(artistId),
					fetchArtistStats(artistId),
					fetchArtistTracks(artistId, 1, 20, "published"),
					fetchAlbums(1, 20, artistId),
				]);

				console.log(
					`[ArtistDetail] All fetches completed, isMounted: ${isMounted}`,
				);
				console.log(
					"[ArtistDetail] Results:",
					results.map((r, i) => ({
						index: i,
						status: r.status,
						reason: r.status === "rejected" ? r.reason?.message : undefined,
					})),
				);

				// Log any rejected promises only if still mounted
				if (isMounted) {
					setHasInitialized(true);
					results.forEach((result, index) => {
						if (result.status === "rejected") {
							const names = ["artist", "stats", "tracks", "albums"];
							console.warn(
								`[ArtistDetail] Failed to load ${names[index]}:`,
								result.reason,
							);
						}
					});
				}
			} catch (err) {
				// This shouldn't happen with allSettled, but just in case
				if (isMounted) {
					setHasInitialized(true);
					console.error(
						"[ArtistDetail] Unexpected error loading artist data:",
						err,
					);
				}
			}
		};

		// Clear any previous errors before fetching
		console.log("[ArtistDetail] Clearing error and starting fetch");
		clearError();
		loadArtistData();

		return () => {
			console.log(
				"[ArtistDetail] Cleanup called, setting isMounted=false and clearing artist",
			);
			isMounted = false;
			clearCurrentArtist();
		};
	}, [
		artistId,
		fetchArtistById,
		fetchArtistStats,
		fetchArtistTracks,
		fetchAlbums,
		clearCurrentArtist,
		clearError,
	]);

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
		if (!artistId || !currentArtist?.name) return null;
		return {
			type: "artist",
			artistId: artistId,
			artistName: currentArtist.name,
		};
	}, [artistId, currentArtist?.name]);

	const handlePlayTrack = useCallback(
		(trackId: string, index: number) => {
			const selectedTrack = queueTracks[index];
			if (selectedTrack && artistQueueSource) {
				playTrackWithQueue(
					selectedTrack,
					queueTracks,
					index,
					artistQueueSource,
				);
			}
		},
		[queueTracks, artistQueueSource, playTrackWithQueue],
	);

	const handlePlayArtist = useCallback(() => {
		if (queueTracks.length > 0 && artistQueueSource) {
			playTrackWithQueue(queueTracks[0], queueTracks, 0, artistQueueSource);
		}
	}, [queueTracks, artistQueueSource, playTrackWithQueue]);

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				<ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
					{/* Error Alert */}
					{error && (
						<Alert icon={AlertCircle} variant="destructive" className="mb-4">
							<AlertCircle size={20} />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Loading State */}
					{(isLoading || !hasInitialized) && (
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
					{hasInitialized && !isLoading && currentArtist && (
						<>
							{/* Artist Header */}
							<Card className="mb-4">
								<CardContent className="items-center py-6">
									{/* <View className="relative"> */}
									<Avatar
										alt={currentArtist.name}
										className="w-32 h-32 mb-4 relative"
									>
										{currentArtist.avatarUrl ? (
											<AvatarImage source={{ uri: currentArtist.avatarUrl }} />
										) : null}
										<AvatarFallback>
											<Text className="text-4xl">
												{getInitials(currentArtist.name)}
											</Text>
										</AvatarFallback>
										{currentArtist.verified && (
											<View
												style={{ backgroundColor: themeColors.success }}
												className="rounded-full w-5 h-5 items-center justify-center absolute bottom-0 right-1"
											>
												<BadgeCheck size={14} color={themeColors.successForeground} />
											</View>
										)}
									</Avatar>
									{/* </View> */}

									<Text className="text-3xl font-bold mb-2">
										{currentArtist.name}
									</Text>

									{currentArtist.bio && (
										<Text className="text-center opacity-70 mb-4 px-4">
											{currentArtist.bio}
										</Text>
									)}

									<View
										style={{ backgroundColor: "transparent" }}
										className="w-full"
									>
										<Button className="flex-1" onPress={handlePlayArtist}>
											<Play size={20} />
											<Text className="ml-2">Play</Text>
										</Button>
									</View>
								</CardContent>
							</Card>

							{/* Tracks - Horizontal FlashList */}
							<View className="mb-6 bg-transparent">
								<View className="flex-row items-center justify-between px-2 mb-3 bg-transparent">
									<Text className="text-xl font-bold">Tracks</Text>
									{tracksPagination && (
										<Text className="text-sm opacity-60">
											{tracksPagination.total} tracks
										</Text>
									)}
								</View>

								{isLoadingTracks && currentArtistTracks.length === 0 ? (
									<View className="flex-row gap-3 px-2 bg-transparent">
										<Skeleton className="w-32 h-44 rounded-xl" />
										<Skeleton className="w-32 h-44 rounded-xl" />
										<Skeleton className="w-32 h-44 rounded-xl" />
									</View>
								) : currentArtistTracks.length > 0 ? (
									<View className="h-48 bg-transparent">
										<FlashList
											data={currentArtistTracks}
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={{ paddingHorizontal: 8 }}
											renderItem={({ item: track, index }) => (
												<Pressable
													onPress={() => handlePlayTrack(track.id, index)}
													className="mr-3 active:opacity-70"
												>
													<View className="w-32 bg-transparent">
														{track.coverUrl ? (
															<Image
																source={{ uri: track.coverUrl }}
																style={{
																	width: 128,
																	height: 128,
																	borderRadius: 12,
																}}
																resizeMode="cover"
															/>
														) : (
															<View className="w-32 h-32 rounded-xl bg-primary/10 items-center justify-center">
																<Music size={32} className="opacity-40" />
															</View>
														)}
														<Text
															className="font-semibold text-sm mt-2"
															numberOfLines={1}
														>
															{track.title}
														</Text>
														<Text
															className="text-xs opacity-60"
															numberOfLines={1}
														>
															{Math.floor(track.duration / 60)}:
															{(track.duration % 60)
																.toString()
																.padStart(2, "0")}
														</Text>
													</View>
												</Pressable>
											)}
											keyExtractor={(item) => item.id}
										/>
									</View>
								) : (
									<Text className="text-sm opacity-70 text-center py-4">
										No published tracks yet
									</Text>
								)}

								{tracksPagination &&
									currentArtistTracks.length < tracksPagination.total && (
										<Button
											variant="ghost"
											className="mt-2 self-center"
											onPress={() => {
												if (artistId && tracksPagination) {
													fetchArtistTracks(
														artistId,
														tracksPagination.page + 1,
														20,
														"published",
													);
												}
											}}
											disabled={isLoadingTracks}
										>
											<Text className="text-primary">
												{isLoadingTracks ? "Loading..." : "Load More"}
											</Text>
										</Button>
									)}
							</View>

							{/* Albums - Horizontal FlashList */}
							<View className="mb-6 bg-transparent">
								<View className="flex-row items-center justify-between px-2 mb-3 bg-transparent">
									<Text className="text-xl font-bold">Albums</Text>
									{artistAlbums.length > 0 && (
										<Text className="text-sm opacity-60">
											{artistAlbums.length} albums
										</Text>
									)}
								</View>

								{isLoadingAlbums && artistAlbums.length === 0 ? (
									<View className="flex-row gap-3 px-2 bg-transparent">
										<Skeleton className="w-36 h-48 rounded-xl" />
										<Skeleton className="w-36 h-48 rounded-xl" />
									</View>
								) : artistAlbums.length > 0 ? (
									<View className="h-48 bg-transparent">
										<FlashList
											data={artistAlbums}
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={{ paddingHorizontal: 8 }}
											renderItem={({ item: album }) => (
												<Pressable className="mr-3 active:opacity-70">
													<View className="w-32 bg-transparent">
														{album.artworkUrl ? (
															<Image
																source={{ uri: album.artworkUrl }}
																style={{
																	width: 128,
																	height: 128,
																	borderRadius: 12,
																}}
																resizeMode="cover"
															/>
														) : (
															<View className="w-32 h-32 rounded-xl bg-primary/10 items-center justify-center">
																<Disc3 size={32} className="opacity-40" />
															</View>
														)}
														<Text
															className="font-semibold text-sm mt-2"
															numberOfLines={1}
														>
															{album.title}
														</Text>
														{album.releaseDate && (
															<Text
																className="text-xs opacity-60"
																numberOfLines={1}
															>
																{new Date(album.releaseDate).getFullYear()}
															</Text>
														)}
													</View>
												</Pressable>
											)}
											keyExtractor={(item) => item.id}
										/>
									</View>
								) : (
									<View className="h-32 items-center justify-center bg-transparent">
										<Disc3 size={32} className="opacity-30 mb-2" />
										<Text className="text-sm opacity-70 text-center">
											No albums yet
										</Text>
									</View>
								)}
							</View>

							{/* Profile Details */}
							<Card className="mb-4">
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

									<Separator />

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
										</>
									) : (
										<Text className="text-sm opacity-70 text-center py-4">
											No statistics available
										</Text>
									)}
								</CardContent>
							</Card>
						</>
					)}

					{/* Not Found State */}
					{hasInitialized && !isLoading && !currentArtist && !error && (
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

import { View } from "@/components/Themed";
import ArtistProfile from "@/components/pages/artists/details/ArtistProfile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useGlobalPlayerActions } from "@/lib/GlobalPlayerProvider";
import { useAlbumStore } from "@/lib/actions/albums";
import {
	type Artist,
	type ArtistPagination,
	type ArtistStatistics,
	fetchArtistById,
	fetchArtistStats,
	fetchArtistTracks,
} from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import type { Track } from "@/lib/actions/tracks";
import {
	artistViewed,
	loadMoreTriggered,
	trackPlayWithQueue,
} from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { AlertCircle, Disc3 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ArtistDetailScreen() {
	const { id } = useLocalSearchParams();
	const artistId = Array.isArray(id) ? id[0] : id;

	const [currentArtist, setCurrentArtist] = useState<Artist | null>(null);
	const [currentArtistStats, setCurrentArtistStats] =
		useState<ArtistStatistics | null>(null);
	const [currentArtistTracks, setCurrentArtistTracks] = useState<Track[]>([]);
	const [tracksPagination, setTracksPagination] =
		useState<ArtistPagination | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [isLoadingTracks, setIsLoadingTracks] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const {
		albums: artistAlbums,
		isLoading: isLoadingAlbums,
		fetchAlbums,
	} = useAlbumStore();
	const { playTrackWithQueue } = useGlobalPlayerActions();

	useEffect(() => {
		if (!artistId) return;

		// Cancel previous requests
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		// Reset state
		setCurrentArtist(null);
		setCurrentArtistStats(null);
		setCurrentArtistTracks([]);
		setTracksPagination(null);
		setError(null);
		setIsLoading(true);
		setIsLoadingStats(true);
		setIsLoadingTracks(true);

		const loadData = async () => {
			try {
				// Fetch artist
				const artist = await fetchArtistById(artistId, controller.signal);
				if (!controller.signal.aborted) {
					setCurrentArtist(artist);
					setIsLoading(false);

					// Track artist view
					artistViewed(artistId, artist.name);
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") return;
				setError(err instanceof Error ? err.message : "Failed to load artist");
				setIsLoading(false);
			}

			try {
				// Fetch stats
				const stats = await fetchArtistStats(artistId, controller.signal);
				if (!controller.signal.aborted) {
					setCurrentArtistStats(stats);
					setIsLoadingStats(false);
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") return;
				setIsLoadingStats(false);
			}

			try {
				// Fetch tracks
				const tracksData = await fetchArtistTracks(
					artistId,
					1,
					20,
					"published",
					controller.signal,
				);
				if (!controller.signal.aborted) {
					setCurrentArtistTracks(tracksData.tracks);
					setTracksPagination(tracksData.pagination);
					setIsLoadingTracks(false);
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") return;
				setIsLoadingTracks(false);
			}

			// Fetch albums (still uses store for now)
			fetchAlbums(1, 20, artistId);
		};

		loadData();

		return () => controller.abort();
	}, [artistId, fetchAlbums]);

	const loadMoreTracks = useCallback(async () => {
		if (!artistId || !tracksPagination || isLoadingTracks) return;

		// Track load more event
		loadMoreTriggered(tracksPagination.page + 1, "artist-detail");

		setIsLoadingTracks(true);
		try {
			const data = await fetchArtistTracks(
				artistId,
				tracksPagination.page + 1,
				20,
				"published",
			);
			setCurrentArtistTracks((prev) => [...prev, ...data.tracks]);
			setTracksPagination(data.pagination);
		} catch {
			// Ignore errors for load more
		} finally {
			setIsLoadingTracks(false);
		}
	}, [artistId, tracksPagination, isLoadingTracks]);

	// Convert tracks to queue format for artist playback
	const queueTracks: QueueTrack[] = useMemo(() => {
		return currentArtistTracks.map((track) => ({
			id: track.id,
			title: track.title,
			artistName: currentArtist?.name ?? "Loading...",
			artworkUrl: track.artworkUrl,
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
				// Track analytics
				trackPlayWithQueue(
					trackId,
					selectedTrack.title,
					"artist",
					queueTracks.length,
					index,
				);

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
			// Track analytics for playing all artist tracks
			trackPlayWithQueue(
				queueTracks[0].id,
				queueTracks[0].title,
				"artist-play-all",
				queueTracks.length,
				0,
			);

			playTrackWithQueue(queueTracks[0], queueTracks, 0, artistQueueSource);
		}
	}, [queueTracks, artistQueueSource, playTrackWithQueue]);

	return (
		<SafeAreaView className="flex-1">
			<ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 240 }}>
				{/* Error Alert */}
				{error && (
					<Alert icon={AlertCircle} variant="destructive" className="mb-4">
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
						<View className="mb-6">
							<ArtistProfile 
								CurrentArtist={currentArtist} 
								handlePlayArtist={handlePlayArtist} 
							/>
						</View>

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
													<Image
														// biome-ignore lint/style/noNonNullAssertion: will never be null
														source={{ uri: track.artworkUrl! }}
														style={{
															width: 128,
															height: 128,
															borderRadius: 12,
														}}
														resizeMode="cover"
													/>
													<View className="flex flex-row justify-between items-center mt-2">
														<Text
															className="font-semibold text-sm"
															numberOfLines={1}
														>
															{track.title}
														</Text>
														<Text
															className="text-xs opacity-60"
															numberOfLines={1}
														>
															{formatDuration(track.duration)}
														</Text>
													</View>
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
										onPress={loadMoreTracks}
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
				{!isLoading && !currentArtist && !error && (
					<Card>
						<CardContent className="py-8 items-center">
							<AlertCircle size={48} className="opacity-50 mb-4" />
							<Text className="text-center opacity-70">Artist not found</Text>
						</CardContent>
					</Card>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

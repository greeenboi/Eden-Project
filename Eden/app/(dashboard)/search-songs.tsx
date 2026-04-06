import { View } from "@/components/Themed";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import type { Album } from "@/lib/actions/albums";
import type { Artist } from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { searchTracks, searchWithRelated } from "@/lib/actions/search";
import type { Track } from "@/lib/actions/tracks";
import {
	albumViewed,
	artistViewed,
	searchPerformed,
	trackPlayWithQueue,
} from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import {
	AlertCircle,
	BadgeCheck,
	Clock,
	Disc,
	Library,
	Menu,
	Search,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	type TextStyle,
	useColorScheme,
	useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SearchType = "all" | "title" | "artist";

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// === Artist Card (Circle) ===
interface ArtistCircleCardProps {
	artist: Artist;
	onPress: (artistId: string) => void;
	size?: number;
}

function ArtistCircleCard({
	artist,
	onPress,
	size = 100,
}: ArtistCircleCardProps) {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	return (
		<Pressable
			onPress={() => onPress(artist.id)}
			className="items-center mr-3"
			style={{ width: size }}
		>
			<Avatar
				alt={artist.name}
				style={{ width: size, height: size, borderRadius: size / 2 }}
			>
				{artist.avatarUrl ? (
					<AvatarImage source={{ uri: artist.avatarUrl }} />
				) : null}
				<AvatarFallback>
					<Text className="text-xl font-semibold">
						{getInitials(artist.name)}
					</Text>
				</AvatarFallback>
			</Avatar>
			{artist.verified && (
				<View className="absolute top-0 right-0 w-5 h-5 rounded-full items-center justify-center bg-success">
					<BadgeCheck size={12} color={themeColors.successForeground} />
				</View>
			)}
			<Text
				className="text-sm font-medium text-center mt-2"
				numberOfLines={2}
				style={{ width: size }}
			>
				{artist.name}
			</Text>
		</Pressable>
	);
}

// === Track Card (Square) ===
interface TrackSquareCardProps {
	track: Track;
	index: number;
	onPress: (trackId: string) => void;
	size?: number;
}

const IMAGE_COLORS = [
	"bg-primary/20",
	"bg-secondary/40",
	"bg-accent/30",
	"bg-muted/50",
	"bg-chart-1/20",
	"bg-chart-2/20",
	"bg-chart-3/20",
	"bg-chart-4/20",
];

function TrackSquareCard({
	track,
	index,
	onPress,
	size = 140,
}: TrackSquareCardProps) {
	const imageColor = IMAGE_COLORS[index % IMAGE_COLORS.length];

	return (
		<Pressable
			onPress={() => onPress(track.id)}
			className="mr-3"
			style={{ width: size }}
		>
			<Card className="bg-transparent border-0 p-0">
				<View
					className={`${imageColor} items-center justify-center relative rounded-lg overflow-hidden`}
					style={{ width: size, height: size }}
				>
					{track.artworkUrl ? (
						<Image
							source={{ uri: track.artworkUrl }}
							style={{ width: "100%", height: "100%", borderRadius: 8 }}
							resizeMode="cover"
						/>
					) : (
						<Disc size={40} className="opacity-30" />
					)}
					{track.explicit && (
						<Badge variant="destructive" className="absolute top-2 right-2">
							<Text className="text-xs">E</Text>
						</Badge>
					)}
					<Badge
						variant="default"
						className="flex-row items-center gap-1 absolute bottom-2 right-2"
					>
						<Clock size={10} className="opacity-50" />
						<Text className="text-xs opacity-70">
							{formatDuration(track.duration)}
						</Text>
					</Badge>
				</View>
				<CardContent className="px-1 py-2">
					<Text className="font-semibold text-sm" numberOfLines={2}>
						{track.title}
					</Text>
					{track.genre && (
						<Text className="text-xs opacity-60 mt-0.5" numberOfLines={1}>
							{track.genre}
						</Text>
					)}
				</CardContent>
			</Card>
		</Pressable>
	);
}

// === Track List Item (for vertical list) ===
interface TrackListItemProps {
	track: Track;
	index: number;
	onPress: (trackId: string) => void;
}

function TrackListItem({ track, index, onPress }: TrackListItemProps) {
	const imageColor = IMAGE_COLORS[index % IMAGE_COLORS.length];

	return (
		<Pressable
			onPress={() => onPress(track.id)}
			className="flex-row items-center px-4 py-2 gap-3 active:opacity-70"
		>
			<View
				className={`${imageColor} items-center justify-center w-14 h-14 rounded-md overflow-hidden`}
			>
				{track.artworkUrl ? (
					<Image
						source={{ uri: track.artworkUrl }}
						style={{ width: "100%", height: "100%", borderRadius: 6 }}
						resizeMode="cover"
					/>
				) : (
					<Disc size={24} className="opacity-30" />
				)}
			</View>
			<View className="flex-1 justify-center gap-0.5">
				<Text className="font-semibold text-base" numberOfLines={1}>
					{track.title}
				</Text>
				<View className="flex-row items-center gap-2 bg-transparent">
					{track.explicit && (
						<Badge variant="outline" className="px-1 py-0">
							<Text className="text-[10px]">E</Text>
						</Badge>
					)}
					{track.genre && (
						<Text className="text-xs opacity-60" numberOfLines={1}>
							{track.genre}
						</Text>
					)}
					<Text className="text-xs opacity-40">
						{formatDuration(track.duration)}
					</Text>
				</View>
			</View>
		</Pressable>
	);
}

// === Album Card (Square with rounded corners) ===
interface AlbumCardProps {
	album: Album;
	onPress: (albumId: string) => void;
	size?: number;
}

function AlbumCard({ album, onPress, size = 140 }: AlbumCardProps) {
	return (
		<Pressable
			onPress={() => onPress(album.id)}
			className="mr-3"
			style={{ width: size }}
		>
			<View
				className="bg-muted/30 items-center justify-center rounded-lg overflow-hidden"
				style={{ width: size, height: size }}
			>
				{album.artworkUrl ? (
					<Image
						source={{ uri: album.artworkUrl }}
						style={{ width: "100%", height: "100%", borderRadius: 8 }}
						resizeMode="cover"
					/>
				) : (
					<Library size={40} className="opacity-30" />
				)}
			</View>
			<Text
				className="font-semibold text-sm mt-2"
				numberOfLines={2}
				style={{ width: size }}
			>
				{album.title}
			</Text>
			{album.releaseDate && (
				<Text className="text-xs opacity-50" numberOfLines={1}>
					{new Date(album.releaseDate).getFullYear()}
				</Text>
			)}
		</Pressable>
	);
}

// === Section Header ===
interface SectionHeaderProps {
	title: string;
	count?: number;
	onSeeAll?: () => void;
}

function SectionHeader({ title, count, onSeeAll }: SectionHeaderProps) {
	return (
		<View className="flex-row justify-between items-center px-4 mb-3">
			<View className="flex-row items-center gap-2 bg-transparent">
				<Text className="text-xl font-bold">{title}</Text>
				{count !== undefined && (
					<Text className="text-sm opacity-50">({count})</Text>
				)}
			</View>
			{onSeeAll && (
				<Pressable onPress={onSeeAll}>
					<Text className="text-sm text-primary font-medium">See all</Text>
				</Pressable>
			)}
		</View>
	);
}

// === Loading Skeletons ===
function ArtistsSkeleton() {
	return (
		<View className="flex-row px-3 gap-3">
			{[1, 2, 3, 4].map((i) => (
				<View key={i} className="items-center mr-3 w-[100px]">
					<Skeleton className="w-[100px] h-[100px] rounded-full" />
					<Skeleton className="w-16 h-4 mt-2 rounded" />
				</View>
			))}
		</View>
	);
}

function TracksSkeleton() {
	return (
		<View className="flex-row px-3 gap-3">
			{[1, 2, 3].map((i) => (
				<View key={i} className="mr-3 w-[140px]">
					<Skeleton className="w-[140px] h-[140px] rounded-lg" />
					<Skeleton className="w-24 h-4 mt-2 rounded" />
					<Skeleton className="w-16 h-3 mt-1 rounded" />
				</View>
			))}
		</View>
	);
}

function TracksListSkeleton() {
	return (
		<View>
			{[1, 2, 3, 4, 5].map((i) => (
				<View key={i} className="flex-row items-center px-4 py-2 gap-3">
					<Skeleton className="w-14 h-14 rounded-md" />
					<View className="flex-1 justify-center gap-0.5">
						<Skeleton className="w-40 h-4 rounded" />
						<Skeleton className="w-24 h-3 mt-1 rounded" />
					</View>
				</View>
			))}
		</View>
	);
}

function AlbumsSkeleton() {
	return (
		<View className="flex-row px-3 gap-3">
			{[1, 2, 3].map((i) => (
				<View key={i} className="mr-3 w-[140px]">
					<Skeleton className="w-[140px] h-[140px] rounded-lg" />
					<Skeleton className="w-24 h-4 mt-2 rounded" />
					<Skeleton className="w-16 h-3 mt-1 rounded" />
				</View>
			))}
		</View>
	);
}

// === Empty State ===
function EmptyState({ message, color }: { message: string, color: string }) {
	return (
		<View className="flex-1 items-center justify-center py-20 px-8">
			<Search size={48} className="opacity-20" color={color} />
			<Text className="text-lg opacity-50 mt-4 text-center">{message}</Text>
		</View>
	);
}

// === Main Search Screen ===
export default function SearchSongsScreen() {
	const navigation = useNavigation();
	const { width: screenWidth } = useWindowDimensions();
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;
	const { playTrackWithQueue } = useGlobalPlayer();
	const isAndroid = process.env.EXPO_OS === "android";

	const composeSearchBar = useMemo(() => {
		if (!isAndroid) return null;
		return require("@expo/ui/jetpack-compose").SearchBar as React.ComponentType<{
			onSearch?: (searchText: string) => void;
			children?: React.ReactNode;
			Placeholder?: React.ComponentType<{ children: React.ReactNode }>;
		}> & {
			Placeholder: React.ComponentType<{ children: React.ReactNode }>;
		};
	}, [isAndroid]);

	const composeSingleChoiceRow = useMemo(() => {
		if (!isAndroid) return null;
		return require("@expo/ui/jetpack-compose")
			.SingleChoiceSegmentedButtonRow as React.ComponentType<{
			children: React.ReactNode;
		}>;
	}, [isAndroid]);

	const composeSegmentedButton = useMemo(() => {
		if (!isAndroid) return null;
		return require("@expo/ui/jetpack-compose").SegmentedButton as React.ComponentType<{
			selected?: boolean;
			onClick?: () => void;
			children?: React.ReactNode;
		}> & {
			Label: React.ComponentType<{ children: React.ReactNode }>;
		};
	}, [isAndroid]);

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchType, setSearchType] = useState<SearchType>("all");
	const [genre, setGenre] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Results
	const [artists, setArtists] = useState<Artist[]>([]);
	const [tracks, setTracks] = useState<Track[]>([]);
	const [albums, setAlbums] = useState<Album[]>([]);
	const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);

	const abortControllerRef = useRef<AbortController | null>(null);

	// Calculate card sizes based on screen width
	const artistCardSize = useMemo(
		() => Math.min(100, (screenWidth - 64) / 4),
		[screenWidth],
	);
	const trackCardSize = useMemo(
		() => Math.min(150, (screenWidth - 48) / 2.5),
		[screenWidth],
	);
	const albumCardSize = useMemo(
		() => Math.min(140, (screenWidth - 48) / 2.5),
		[screenWidth],
	);

	const handleSearchWithQuery = useCallback(
		async (queryInput: string) => {
			const query = queryInput.trim();
		if (!query) {
			setError("Please enter a search query");
			return;
		}

			setSearchQuery(query);

		// Cancel previous request
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsSearching(true);
		setError(null);
		setHasSearched(true);

		try {
			if (searchType === "artist") {
				// Artist-only search with related content
				const result = await searchWithRelated(
					query,
					{
						artistLimit: 50,
						trackLimit: 0,
						albumLimit: 20,
						relatedTracksLimit: 30,
					},
					controller.signal,
				);
				setArtists(result.artists);
				setTracks([]);
				setAlbums(result.albums);
				setRelatedTracks(result.relatedTracks);

				// Track search analytics
				searchPerformed(query, "artist", {
					artists: result.artists.length,
					tracks: 0,
					albums: result.albums.length,
				});
			} else if (searchType === "title") {
				// Track-only search
				const result = await searchTracks(query, 50, controller.signal);
				setTracks(result.tracks);
				setArtists([]);
				setAlbums([]);
				setRelatedTracks([]);

				// Track search analytics
				searchPerformed(query, "title", {
					artists: 0,
					tracks: result.tracks.length,
					albums: 0,
				});
			} else {
				// Search all with related content
				const result = await searchWithRelated(
					query,
					{
						artistLimit: 10,
						trackLimit: 30,
						albumLimit: 10,
						relatedTracksLimit: 20,
					},
					controller.signal,
				);
				setArtists(result.artists);
				setTracks(result.tracks);
				setAlbums(result.albums);
				setRelatedTracks(result.relatedTracks);

				// Track search analytics
				searchPerformed(query, "all", {
					artists: result.artists.length,
					tracks: result.tracks.length + result.relatedTracks.length,
					albums: result.albums.length,
				});
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(err instanceof Error ? err.message : "Search failed");
			setArtists([]);
			setTracks([]);
			setAlbums([]);
			setRelatedTracks([]);
			} finally {
				setIsSearching(false);
			}
		},
		[searchType],
	);

	const handleSearch = useCallback(async () => {
		await handleSearchWithQuery(searchQuery);
	}, [handleSearchWithQuery, searchQuery]);

	// Cleanup on unmount
	useEffect(() => {
		return () => abortControllerRef.current?.abort();
	}, []);

	// Filter tracks by genre if specified
	const filteredTracks = useMemo(() => {
		if (!genre.trim()) return tracks;
		const lowerGenre = genre.toLowerCase();
		return tracks.filter((track) =>
			track.genre?.toLowerCase().includes(lowerGenre),
		);
	}, [tracks, genre]);

	// Filter related tracks by genre if specified
	const filteredRelatedTracks = useMemo(() => {
		if (!genre.trim()) return relatedTracks;
		const lowerGenre = genre.toLowerCase();
		return relatedTracks.filter((track) =>
			track.genre?.toLowerCase().includes(lowerGenre),
		);
	}, [relatedTracks, genre]);

	// Convert all tracks (main + related) to queue format
	const allTracks = useMemo(() => {
		return [...filteredTracks, ...filteredRelatedTracks];
	}, [filteredTracks, filteredRelatedTracks]);

	const queueTracks: QueueTrack[] = useMemo(() => {
		return allTracks.map((track) => ({
			id: track.id,
			title: track.title,
			artistName: "Loading...",
			artworkUrl: track.artworkUrl,
			duration: track.duration,
		}));
	}, [allTracks]);

	const searchSource: QueueSource = useMemo(
		() => ({ type: "search", query: searchQuery }),
		[searchQuery],
	);

	const handleArtistPress = useCallback(
		(artistId: string) => {
			// Find artist name for analytics
			const artist = artists.find((a) => a.id === artistId);
			if (artist) {
				artistViewed(artistId, artist.name);
			}
			router.push(`/artist-detail?id=${artistId}`);
		},
		[artists],
	);

	const handleAlbumPress = useCallback(
		(albumId: string) => {
			// Find album title for analytics
			const album = albums.find((a) => a.id === albumId);
			if (album) {
				albumViewed(albumId, album.title);
			}
			router.push(`/album-detail?id=${albumId}`);
		},
		[albums],
	);

	const handleTrackPress = useCallback(
		(trackId: string) => {
			const trackIndex = queueTracks.findIndex((t) => t.id === trackId);
			const selectedTrack = queueTracks[trackIndex];
			if (selectedTrack && queueTracks.length > 0) {
				// Track analytics
				trackPlayWithQueue(
					trackId,
					selectedTrack.title,
					"search",
					queueTracks.length,
					trackIndex,
				);

				playTrackWithQueue(
					selectedTrack,
					queueTracks,
					trackIndex,
					searchSource,
				);
			}
		},
		[queueTracks, playTrackWithQueue, searchSource],
	);

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	const showArtistsSection = searchType === "all" || searchType === "artist";
	const showTracksSection = searchType === "all" || searchType === "title";
	const showAlbumsSection = searchType === "all" || searchType === "artist";
	const showRelatedSection = searchType === "all" || searchType === "artist";
	const hasResults =
		artists.length > 0 ||
		filteredTracks.length > 0 ||
		albums.length > 0 ||
		filteredRelatedTracks.length > 0;

	const segmentedLabelStyle: TextStyle = {
		fontSize: 13,
		fontWeight: "600",
	};

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				{/* Header */}
				<View className="flex-row items-center justify-between px-4 py-3">
					<View className="bg-transparent flex-row items-center gap-3">
						<Search size={28} color={themeColors.tint} />
						<Text className="text-2xl font-bold">Search</Text>
					</View>
					<Pressable onPress={handleOpenDrawer}>
						<Menu size={28} color={themeColors.text} />
					</Pressable>
				</View>

				{/* Large Search Bar */}
				<View className="px-4 pb-3">
					{isAndroid && composeSearchBar ? (
						<View className="bg-transparent gap-2">
							{(() => {
								const ComposeSearchBar = composeSearchBar;
								return (
									<ComposeSearchBar
										onSearch={(value: string) => {
											handleSearchWithQuery(value);
										}}
									>
										<ComposeSearchBar.Placeholder>
											<Text>What do you want to listen to?</Text>
										</ComposeSearchBar.Placeholder>
									</ComposeSearchBar>
								);
							})()}
							{isSearching && <ActivityIndicator size="small" color={themeColors.tint} />}
						</View>
					) : (
						<View className="rounded-xl bg-muted/10 px-4 py-3">
							<Text className="text-sm opacity-70">
								This screen uses Android Expo UI components only.
							</Text>
						</View>
					)}
				</View>

				{/* Advanced Settings Accordion */}
				<View className="px-4 mb-2">
					<Accordion type="single" collapsible>
						<AccordionItem value="filters">
							<AccordionTrigger>
								<Text className="font-medium">Advanced Filters</Text>
							</AccordionTrigger>
							<AccordionContent>
								<View className="py-2">
									{/* Search Type */}
									<View className="gap-2 bg-transparent">
										<Label className="text-sm opacity-70">Search In</Label>
										{isAndroid && composeSingleChoiceRow && composeSegmentedButton ? (
											(() => {
												const SingleChoiceSegmentedButtonRow = composeSingleChoiceRow;
												const SegmentedButton = composeSegmentedButton;
												return (
													<SingleChoiceSegmentedButtonRow>
														<SegmentedButton
															selected={searchType === "all"}
															onClick={() => setSearchType("all")}
														>
															<SegmentedButton.Label>
																<Text style={segmentedLabelStyle}>All</Text>
															</SegmentedButton.Label>
														</SegmentedButton>
														<SegmentedButton
															selected={searchType === "title"}
															onClick={() => setSearchType("title")}
														>
															<SegmentedButton.Label>
																<Text style={segmentedLabelStyle}>Tracks</Text>
															</SegmentedButton.Label>
														</SegmentedButton>
														<SegmentedButton
															selected={searchType === "artist"}
															onClick={() => setSearchType("artist")}
														>
															<SegmentedButton.Label>
																<Text style={segmentedLabelStyle}>Artists</Text>
															</SegmentedButton.Label>
														</SegmentedButton>
													</SingleChoiceSegmentedButtonRow>
												);
											})()
										) : (
										<Text className="text-xs opacity-60">
											Search type is available on Android only.
										</Text>
										)}
									</View>

									{/* Genre Filter */}
									<View className="gap-2 mt-4 bg-transparent">
										<Label nativeID="genre" className="text-sm opacity-70">
											Filter by Genre
										</Label>
										<Input
											placeholder="e.g., Rock, Pop, Jazz"
											value={genre}
											onChangeText={setGenre}
											aria-labelledby="genre"
										/>
									</View>
								</View>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</View>

				{/* Results */}
				<ScrollView
					className="flex-1"
					contentContainerClassName="pb-24"
					showsVerticalScrollIndicator={false}
				>
					{/* Error State */}
					{error && (
						<View className="flex-row items-center justify-center p-4 mx-4 mb-4 bg-destructive/10 rounded-lg">
							<AlertCircle size={20} color={themeColors.destructive} />
							<Text className="text-destructive ml-2">{error}</Text>
						</View>
					)}

					{/* Loading State */}
					{isSearching && (
						<View>
							{showArtistsSection && (
								<>
									<SectionHeader title="Artists" />
									<ArtistsSkeleton />
								</>
							)}
							{showAlbumsSection && (
								<>
									<SectionHeader title="Albums" />
									<AlbumsSkeleton />
								</>
							)}
							{showTracksSection && (
								<>
									<SectionHeader title="Tracks" />
									<TracksSkeleton />
									<TracksListSkeleton />
								</>
							)}
							{showRelatedSection && (
								<>
									<SectionHeader title="More from Artists" />
									<TracksListSkeleton />
								</>
							)}
						</View>
					)}

					{/* Results */}
					{!isSearching && hasSearched && (
						<>
							{!hasResults && (
								<EmptyState message="No results found. Try a different search term." color={themeColors.tint} />
							)}

							{/* Artists Section - Horizontal */}
							{showArtistsSection && artists.length > 0 && (
								<View className="mb-6">
									<SectionHeader title="Artists" count={artists.length} />
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerClassName="px-4"
									>
										{artists.map((artist) => (
											<ArtistCircleCard
												key={artist.id}
												artist={artist}
												onPress={handleArtistPress}
												size={artistCardSize}
											/>
										))}
									</ScrollView>
								</View>
							)}

							{/* Albums Section - Horizontal */}
							{showAlbumsSection && albums.length > 0 && (
								<View className="mb-6">
									<SectionHeader title="Albums" count={albums.length} />
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerClassName="px-4"
									>
										{albums.map((album) => (
											<AlbumCard
												key={album.id}
												album={album}
												onPress={handleAlbumPress}
												size={albumCardSize}
											/>
										))}
									</ScrollView>
								</View>
							)}

							{/* Top Tracks - Horizontal */}
							{showTracksSection && filteredTracks.length > 0 && (
								<View className="mb-6">
									<SectionHeader
										title="Top Tracks"
										count={Math.min(10, filteredTracks.length)}
									/>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerClassName="px-4"
									>
										{filteredTracks.slice(0, 10).map((track, index) => (
											<TrackSquareCard
												key={track.id}
												track={track}
												index={index}
												onPress={handleTrackPress}
												size={trackCardSize}
											/>
										))}
									</ScrollView>
								</View>
							)}

							{/* More from Artists - Horizontal */}
							{showRelatedSection && filteredRelatedTracks.length > 0 && (
								<View className="mb-6">
									<SectionHeader
										title="More from Artists"
										count={Math.min(10, filteredRelatedTracks.length)}
									/>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerClassName="px-4"
									>
										{filteredRelatedTracks.slice(0, 10).map((track, index) => (
											<TrackSquareCard
												key={track.id}
												track={track}
												index={index}
												onPress={handleTrackPress}
												size={trackCardSize}
											/>
										))}
									</ScrollView>
								</View>
							)}

							{/* All Tracks - Vertical List */}
							{showTracksSection && allTracks.length > 0 && (
								<View className="mb-6">
									<SectionHeader title="All Tracks" count={allTracks.length} />
									{allTracks.map((track, index) => (
										<TrackListItem
											key={track.id}
											track={track}
											index={index}
											onPress={handleTrackPress}
										/>
									))}
								</View>
							)}
						</>
					)}

					{/* Initial State */}
					{!isSearching && !hasSearched && (
						<EmptyState message="Search for your favorite songs and artists" color={themeColors.tint} />
					)}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}


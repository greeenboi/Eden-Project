import { View } from "@/components/Themed";
import {
	DashboardHeader,
	EmptyTrackList,
	LoadingMoreTracks,
	LoadingSkeleton,
	TrackCard,
} from "@/components/pages/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { type Track, useTrackStore } from "@/lib/actions/tracks";
import {
	loadMoreTriggered,
	trackPlayWithQueue,
	tracksRefreshed,
} from "@/lib/analytics";
import { FlashList } from "@shopify/flash-list";
import { AlertCircle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	RefreshControl,
	useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NUM_COLUMNS = 2;
const TRACK_STATUS_FILTER = "published";
const NAV_COLLAPSE_THRESHOLD = 4;
// Extended track interface for masonry layout
interface MasonryTrack extends Track {
	span: number;
	estimatedHeight: number;
}

export default function AllSongsScreen() {
	const [refreshing, setRefreshing] = useState(false);
	const [navCollapsed, setNavCollapsed] = useState(false);
	const navAnim = useRef(new Animated.Value(0)).current;
	const { playTrack, playTrackWithQueue } = useGlobalPlayer();
	const { tracks, pagination, isLoading, error, fetchTracks, clearTracks } =
		useTrackStore();
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	useEffect(() => {
		// Fetch published tracks on mount
		fetchTracks(1, 50, undefined, undefined, TRACK_STATUS_FILTER);

		return () => {
			clearTracks();
		};
	}, [fetchTracks, clearTracks]);

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

	const navHeight = navAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [92, 64],
	});
	const navPaddingTop = navAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [16, 6],
	});
	const navPaddingBottom = navAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [12, 6],
	});
	const navTextScale = navAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0.9],
	});
	const navIconScale = navAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0.82],
	});

	const handleListScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			if (offsetY > NAV_COLLAPSE_THRESHOLD && !navCollapsed) {
				setNavCollapsed(true);
			} else if (offsetY <= NAV_COLLAPSE_THRESHOLD && navCollapsed) {
				setNavCollapsed(false);
			}
		},
		[navCollapsed],
	);

	useEffect(() => {
		Animated.timing(navAnim, {
			toValue: navCollapsed ? 1 : 0,
			duration: 180,
			easing: Easing.out(Easing.quad),
			useNativeDriver: false, // layout + font sizes animate
		}).start();
	}, [navCollapsed, navAnim]);

	// Convert tracks to queue format
	// Note: Track list doesn't include artist details, so we use a placeholder
	// The full artist name will be loaded when the track is played
	const queueTracks: QueueTrack[] = useMemo(() => {
		return tracks.map((track) => ({
			id: track.id,
			title: track.title,
			artistName: "Loading...", // Will be populated when track is fetched with details
			artworkUrl: track.artworkUrl,
			duration: track.duration,
		}));
	}, [tracks]);

	// Queue source for "All Songs" page
	const allSongsSource: QueueSource = useMemo(
		() => ({ type: "all-songs" }),
		[],
	);

	const handleSongPress = useCallback(
		(songId: string) => {
			// Find the index of the selected track
			const trackIndex = queueTracks.findIndex((t) => t.id === songId);
			const selectedTrack = queueTracks[trackIndex];

			if (selectedTrack && queueTracks.length > 0) {
				// Track analytics event
				trackPlayWithQueue(
					songId,
					selectedTrack.title,
					"all-songs",
					queueTracks.length,
					trackIndex,
				);

				// Play with queue context - all visible tracks become the queue
				// Source is "all-songs" so queue contains all songs from this page
				playTrackWithQueue(
					selectedTrack,
					queueTracks,
					trackIndex,
					allSongsSource,
				);
			} else {
				// Fallback to single track play
				playTrack(songId);
			}
		},
		[queueTracks, playTrackWithQueue, playTrack, allSongsSource],
	);

	const handleLoadMore = useCallback(() => {
		if (
			pagination &&
			!isLoading &&
			!refreshing &&
			pagination.page * pagination.limit < pagination.total
		) {
			// Track load more event
			loadMoreTriggered(pagination.page + 1, "all-songs");

			fetchTracks(
				pagination.page + 1,
				50,
				undefined,
				undefined,
				TRACK_STATUS_FILTER,
			);
		}
	}, [pagination, isLoading, refreshing, fetchTracks]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			clearTracks();
			await fetchTracks(1, 50, undefined, undefined, TRACK_STATUS_FILTER);
			// Track refresh event after tracks are loaded
			tracksRefreshed(tracks.length);
		} finally {
			setRefreshing(false);
		}
	}, [clearTracks, fetchTracks, tracks.length]);

	const renderTrackCard = useCallback(
		({ item, index }: { item: MasonryTrack; index: number }) => (
			<TrackCard item={item} index={index} onPress={handleSongPress} />
		),
		[handleSongPress],
	);

	return (
		<SafeAreaView style={{ flex: 1 }}>
			{/* Header with Navigation */}
			<DashboardHeader
				navPaddingTop={navPaddingTop}
				navPaddingBottom={navPaddingBottom}
				navHeight={navHeight}
				navTextScale={navTextScale}
				navIconScale={navIconScale}
				trackCount={pagination?.total}
				isLoading={isLoading}
			/>

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
			{isLoading && tracks.length === 0 ? (
				<LoadingSkeleton />
			) : (
				<View
					style={{
						flex: 1,
						paddingHorizontal: 12,
						backgroundColor: "transparent",
					}}
				>
					<FlashList
						data={masonryTracks}
						renderItem={renderTrackCard}
						keyExtractor={(item) => item.id}
						numColumns={NUM_COLUMNS}
						masonry
						onScroll={handleListScroll}
						scrollEventThrottle={16}
						optimizeItemArrangement
						overrideItemLayout={(layout, item) => {
							layout.span = item.span;
						}}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.5}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={themeColors.primary}
								colors={[themeColors.primary]}
							/>
						}
						ListEmptyComponent={!isLoading ? <EmptyTrackList /> : null}
						ListFooterComponent={
							isLoading && tracks.length > 0 && !refreshing ? (
								<LoadingMoreTracks />
							) : null
						}
					/>
				</View>
			)}
		</SafeAreaView>
	);
}

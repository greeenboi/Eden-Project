import { View } from "@/components/Themed";
import {
	DashboardHeader,
	EmptyTrackList,
	LoadingMoreTracks,
	LoadingSkeleton,
	TrackCard,
} from "@/components/pages/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import { type Track, useTrackStore } from "@/lib/actions/tracks";
import { FlashList } from "@shopify/flash-list";
import { AlertCircle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Easing,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";


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
	const [menuButtonState, setMenuButtonState] = useState(false);
	const [navCollapsed, setNavCollapsed] = useState(false);
	const navAnim = useRef(new Animated.Value(0)).current;
	const { playTrack } = useGlobalPlayer();
	const { tracks, pagination, isLoading, error, fetchTracks, clearTracks } =
		useTrackStore();

	useEffect(() => {
		// Fetch published tracks on mount
		fetchTracks(1, 50, undefined, undefined, TRACK_STATUS_FILTER);

		return () => {
			clearTracks();
		};
	}, [fetchTracks, clearTracks]);
	
	const insets = useSafeAreaInsets();
	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	};

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

	const navHeight = navAnim.interpolate({ inputRange: [0, 1], outputRange: [92, 64] });
	const navPaddingTop = navAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
	const navPaddingBottom = navAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 6] });
	const navTextScale = navAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
	const navIconScale = navAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });

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

	const handleSongPress = useCallback((songId: string) => {
		playTrack(songId);
	}, [playTrack]);

	const handleLoadMore = useCallback(() => {
		if (
			pagination &&
			!isLoading &&
			!refreshing &&
			pagination.page * pagination.limit < pagination.total
		) {
			fetchTracks(pagination.page + 1, 50, undefined, undefined, TRACK_STATUS_FILTER);
		}
	}, [pagination, isLoading, refreshing, fetchTracks]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			clearTracks();
			await fetchTracks(1, 50, undefined, undefined, TRACK_STATUS_FILTER);
		} finally {
			setRefreshing(false);
		}
	}, [clearTracks, fetchTracks]);

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
					menuButtonState={menuButtonState}
					onMenuOpenChange={(open: boolean) => setMenuButtonState(open)}
					contentInsets={contentInsets}
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
						style={{ flex: 1, paddingHorizontal: 12, backgroundColor: "transparent" }}
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
								tintColor="#8b5cf6"
								colors={["#8b5cf6"]}
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
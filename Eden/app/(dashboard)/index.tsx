import { View } from "@/components/Themed";
import { PlayingSongContent } from "@/components/pages/player";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { type Track, useTrackStore } from "@/lib/actions/tracks";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView, useBottomSheet } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import {
	AlertCircle,
	Clock,
	Disc,
	Menu,
	Music,
	Search,
	X
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";


const NUM_COLUMNS = 2;
const TRACK_STATUS_FILTER = "published";
const NAV_COLLAPSE_THRESHOLD = 4;
// Extended track interface for masonry layout
interface MasonryTrack extends Track {
	span: number;
	estimatedHeight: number;
}

// Auto-expand the sheet to the target snap point when the content mounts
function AutoExpandOnMount({ targetIndex }: { targetIndex: number }) {
	const { snapToIndex } = useBottomSheet();

	useEffect(() => {
		snapToIndex(targetIndex);
	}, [snapToIndex, targetIndex]);

	return null;
}

export default function AllSongsScreen() {
	const [refreshing, setRefreshing] = useState(false);
	const [menuButtonState, setMenuButtonState] = useState(false);
	const [navCollapsed, setNavCollapsed] = useState(false);
	const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
	const [sheetIndex, setSheetIndex] = useState(0);
	const navAnim = useRef(new Animated.Value(0)).current;
	const bottomSheetRef = useRef<BottomSheetModal>(null);
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

	const snapPoints = useMemo(() => ["20%", "50%", "100%"], []);
	const FULL_SNAP_INDEX = snapPoints.length - 1;

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

	const handleSongPress = (songId: string) => {
		setSelectedTrackId(songId);
		bottomSheetRef.current?.present();
		requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX));
	};

	const handleSheetDismiss = () => {
		setSelectedTrackId(null);
		setSheetIndex(0);
	};

	const handleLoadMore = () => {
		if (
			pagination &&
			!isLoading &&
			!refreshing &&
			pagination.page * pagination.limit < pagination.total
		) {
			fetchTracks(pagination.page + 1, 50, undefined, undefined, TRACK_STATUS_FILTER);
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			clearTracks();
			await fetchTracks(1, 50, undefined, undefined, TRACK_STATUS_FILTER);
		} finally {
			setRefreshing(false);
		}
	};

	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "--:--";
		const totalSeconds = Math.max(0, Math.floor(seconds));
		const mins = Math.floor(totalSeconds / 60);
		const secs = totalSeconds % 60;
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
				<Card className="bg-transparent border-0 p-0">
					<View
						style={{ backgroundColor: "transparent" }}
						className={`w-full aspect-square ${getImageColors(index)} items-center justify-center relative`}
					>
						{item.artworkUrl ? (
							<Image
								source={{ uri: item.artworkUrl }}
								style={{ width: "100%", height: "100%", borderRadius: 11 }}
								resizeMode="cover"
							/>
						) : (
							<Disc size={60} className="opacity-30" />
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
							<Text className="text-xs opacity-70">
								{formatDuration(item.duration)}
							</Text>
						</Badge>
					</View>
					<CardContent className="px-1 pb-3 mt-0 items-center justify-between flex flex-row">
						<Text className="font-bold text-base" numberOfLines={2}>
							{item.title}
						</Text>
						{item.genre && (
							<Badge variant="secondary" className="self-start">
								<Text className="text-xs">{item.genre}</Text>
							</Badge>
						)}
					</CardContent>
				</Card>
			</Pressable>
		);
	};

	return (
		<BottomSheetModalProvider>
		<SafeAreaView style={{flex:1}}>
			{/* Header with Navigation */}
			<Animated.View
				style={{
					backgroundColor: "transparent",
					paddingHorizontal: 16,
					paddingTop: navPaddingTop,
					paddingBottom: navPaddingBottom,
					height: navHeight,
				}}
				className="flex flex-row items-center justify-between"
			>
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center gap-3"
				>
						<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
							<Music size={32} color={useIsDark() ? THEME.dark.foreground : THEME.light.foreground } />
						</Animated.View>
						<Animated.View style={{ backgroundColor: "transparent", transform: [{ scale: navTextScale }] }}>
							<Text className="text-3xl text-foreground font-bold">All Songs</Text>
							{pagination && !isLoading && (
								<Text className="text-xs text-muted-foreground opacity-70">
									{pagination.total} tracks available
								</Text>
							)}
						</Animated.View>
				</View>
				<View style={{backgroundColor: "transparent"}} className="flex flex-row items-center justify-end gap-2.5">
					<Pressable onPress={() => router.push('/search-songs')}>
						<Animated.View style={{ transform: [{ scale: navIconScale }] }}>
							<Search color={useIsDark() ? THEME.dark.foreground : THEME.light.foreground } size={32} />
						</Animated.View>
					</Pressable>
					<DropdownMenu onOpenChange={(open: boolean) => setMenuButtonState(open)}>
						<Animated.View style={{ transform: [{ scale: navIconScale }] }}> 
							<DropdownMenuTrigger>
								{menuButtonState ? <X size={32} color={useIsDark() ? THEME.dark.foreground : THEME.light.foreground } /> : <Menu size={32} color={useIsDark() ? THEME.dark.foreground : THEME.light.foreground } />}
							</DropdownMenuTrigger>
						</Animated.View>
						<DropdownMenuContent insets={contentInsets} sideOffset={2} className="w-56" align="start">
							<DropdownMenuItem onPress={() => router.push("/artists")}>
								<Text>Artists</Text>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>My Account</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
							<DropdownMenuItem onPress={() => router.push("/account")}>
								<Text>Account</Text>
							</DropdownMenuItem>
							<DropdownMenuItem onPress={() => router.push("/settings")}>
								<Text>Settings</Text>
							</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</View>
			</Animated.View>

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
				<View style={{flex: 1, paddingHorizontal: 12, backgroundColor:"transparent"}}>
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
						contentContainerStyle={{paddingTop: 8, paddingBottom: 16,}}
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
						ListEmptyComponent={
							!isLoading ? (
								<View
									style={{ backgroundColor: "transparent" }}
									className="py-8 items-center"
								>
									<Music size={48} className="opacity-30 mb-4" />
									<Text className="text-center opacity-70">
										{"No tracks available"}
									</Text>
								</View>
							) : null
						}
						ListFooterComponent={
							isLoading && tracks.length > 0 && !refreshing ? (
								<View
									style={{ backgroundColor: "transparent" }}
									className="py-4 items-center flex-row justify-center gap-2"
								>
									<ActivityIndicator size="small" color="#8b5cf6" />
									<Text className="text-sm opacity-70">
										Loading more tracks...
									</Text>
								</View>
							) : null
						}
					/>
				</View>
			)}
		</SafeAreaView>
		<BottomSheetModal
			ref={bottomSheetRef}
			snapPoints={snapPoints}
			index={2}
			enablePanDownToClose={false}
			// onDismiss={handleSheetDismiss}
			// handleComponent={null}
			onChange={(index) => setSheetIndex(index)}
			backgroundStyle={{ backgroundColor: useIsDark() ? THEME.dark.background : THEME.light.background }}
			handleIndicatorStyle={{ backgroundColor: useIsDark() ? THEME.dark.primary : THEME.light.primary }}
			detached={sheetIndex === 1}
			style={sheetIndex === 1 ? { marginHorizontal: 16, marginTop: 8 } : undefined}
			animateOnMount
		>
			<BottomSheetView style={{ flex: 1 }}>
				<AutoExpandOnMount targetIndex={FULL_SNAP_INDEX} />
				<PlayingSongContent
					trackId={selectedTrackId ?? undefined}
					onClose={() => bottomSheetRef.current?.dismiss()}
					variant={sheetIndex === 0 ? "mini" : sheetIndex === 1 ? "compact" : "full"}
				/>
			</BottomSheetView>
		</BottomSheetModal>
		</BottomSheetModalProvider>
	);
}
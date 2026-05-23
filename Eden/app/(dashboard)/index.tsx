import { BlurSurface } from "@/components/ui/blur-surface";
import Colors from "@/constants/Colors";
import { useGlobalPlayerActions } from "@/lib/GlobalPlayerProvider";
import { type Artist, fetchArtists } from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { type Track, useTrackStore } from "@/lib/actions/tracks";
import { trackPlayWithQueue } from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";
import {
	Box,
	HorizontalCenteredHeroCarousel,
	Host,
	RNHostView
} from "@expo/ui/jetpack-compose";
import { Shapes, clickable, clip, size } from "@expo/ui/jetpack-compose/modifiers";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { DrawerActions, useNavigation } from "expo-router/react-navigation";
import { Disc, Menu, Play } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Dimensions,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
	useColorScheme,
} from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import WavyLoading from "@/components/ui/wavy-loading";

const TRACK_STATUS_FILTER = "published";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DESIGN_WIDTH = 375;
const ALL_SONGS_SOURCE: QueueSource = { type: "all-songs" };
const scale = (value: number) => (SCREEN_WIDTH / DESIGN_WIDTH) * value;

type CollageTrack = {
	id?: string;
	artworkUrl?: string | null;
};

type PositionValue = number | `${number}%`;

type CollageShape = "Circle" | "Star" | "RoundedCornerShape" | "Pill" | "Slanted" | "Other";

type CollageConfig = {
	width: number;
	height: number;
	top?: PositionValue;
	left?: PositionValue;
	right?: PositionValue;
	bottom?: PositionValue;
	zIndex: number;
	shape: CollageShape;
	rotate: string;
};

const COSMIC_SWIRL_CONFIGS: CollageConfig[] = [
	{
		width: scale(240),
		height: scale(240),
		top: "14%",
		left: "14%",
		zIndex: 10,
		shape: "Pill",
		rotate: "0deg",
	},
	{
		width: scale(110),
		height: scale(110),
		top: scale(10),
		left: scale(-10),
		zIndex: 20,
		shape: "Circle",
		rotate: "10deg",
	},
	{
		width: scale(100),
		height: scale(100),
		top: scale(20),
		right: scale(10),
		zIndex: 20,
		shape: "Other",
		rotate: "-18deg",
	},
	{
		width: scale(130),
		height: scale(130),
		top: scale(10),
		left: scale(-10),
		zIndex: 20,
		shape: "RoundedCornerShape",
		rotate: "-20deg",
	},
	{
		width: scale(210),
		height: scale(210),
		bottom: -40,
		right: scale(-30),
		zIndex: 15,
		shape: "Star",
		rotate: "45deg",
	},
];

const getNativeShape = (shapeName: CollageShape) => {
	switch (shapeName) {
		case "Circle":
			return Shapes.Circle;
		case "Star":
			return Shapes.Material.SoftBurst;
		case "RoundedCornerShape":
			return Shapes.Material.Slanted;
		case "Slanted":
			return Shapes.Material.Slanted;
		case "Pill":
			return Shapes.Material.Pill;
		case "Other":
			return Shapes.Material.Cookie9Sided;
		default:
			return Shapes.Material.Pill;
	}
};

const getStyles = (cfg: CollageConfig) => ({
	position: "absolute" as const,
	width: cfg.width,
	height: cfg.height,
	top: cfg.top,
	left: cfg.left,
	right: cfg.right,
	bottom: cfg.bottom,
	zIndex: cfg.zIndex,
	transform: [{ rotate: cfg.rotate }],
});

const CollageItem = ({ track, cfg, pressFn }: { track: CollageTrack; cfg: CollageConfig; pressFn?: () => void }) => {
	if (!track.artworkUrl) return null;

	return (
		<Pressable onPress={() => pressFn?.()} style={getStyles(cfg)}>
			<Host matchContents>
				<Box modifiers={[size(cfg.width, cfg.height), clip(getNativeShape(cfg.shape))]}>
					<RNHostView matchContents>
						<Image
							source={{ uri: track.artworkUrl }}
							style={{ width: "100%", height: "100%" }}
							resizeMode="cover"
						/>
					</RNHostView>
				</Box>
			</Host>
		</Pressable>
	);
};

const AdaptiveCollage = ({
	featuredTracks,
	handleTrackPress,
}: {
	featuredTracks: CollageTrack[];
	handleTrackPress: (trackId: string) => void;
}) => {
	const collageHeight = scale(400);

	const songsToShow: (CollageTrack | null)[] = [...featuredTracks.slice(0, 6)];
	while (songsToShow.length < 6) songsToShow.push(null);

	const topTracks = songsToShow.slice(0, 3);
	const bottomTracks = songsToShow.slice(3, 6);

	return (
		<View style={{ width: SCREEN_WIDTH, height: collageHeight }}>
			<View style={{ height: "60%", width: "100%", position: "relative" }}>
				{topTracks.map((track, i) => {
					const cfg = COSMIC_SWIRL_CONFIGS[i];
					if (!track || !cfg) return null;
					const trackKey = track.id ?? track.artworkUrl ?? `top-slot-${cfg.zIndex}-${cfg.shape}`;
					// biome-ignore lint/style/noNonNullAssertion: track id is not null when all tracks are always present
					return <CollageItem key={`top-${trackKey}`} track={track} cfg={cfg} pressFn={() => handleTrackPress(track.id!)} />;
				})}
			</View>

			<View style={{ height: "40%", width: "100%", position: "relative" }}>
				{bottomTracks.map((track, i) => {
					const cfg = COSMIC_SWIRL_CONFIGS[i + 3];
					if (!track || !cfg) return null;
					const trackKey = track.id ?? track.artworkUrl ?? `bottom-slot-${cfg.zIndex}-${cfg.shape}`;
					// biome-ignore lint/style/noNonNullAssertion: track id is not null when all tracks are always present
					return <CollageItem key={`bottom-${trackKey}`} track={track} cfg={cfg} pressFn={() => handleTrackPress(track.id!)} />;
				})}
			</View>
		</View>
	);
};


export default function HomeScreen() {
	const colorScheme = useColorScheme();
	const navigation = useNavigation();
	const { playTrack, playTrackWithQueue } = useGlobalPlayerActions();
	const { tracks, isLoading, fetchTracks, clearTracks } = useTrackStore();
	const [topArtists, setTopArtists] = useState<Artist[]>([]);
	const [isArtistsLoading, setIsArtistsLoading] = useState(false);
	const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	// Reveal the page only after the first round of both fetches has settled,
	// so the centered wavy loader hides exactly once all sections have data.
	useEffect(() => {
		if (hasInitialLoaded) return;
		if (isLoading || isArtistsLoading) return;
		if (tracks.length === 0) return;
		setHasInitialLoaded(true);
	}, [hasInitialLoaded, isLoading, isArtistsLoading, tracks.length]);

	useEffect(() => {
		fetchTracks(1, 40, undefined, undefined, TRACK_STATUS_FILTER);

		return () => {
			clearTracks();
		};
	}, [fetchTracks, clearTracks]);

	useEffect(() => {
		const controller = new AbortController();
		setIsArtistsLoading(true);

		fetchArtists(1, 20, null, controller.signal)
			.then((data) => {
				setTopArtists(data.artists.slice(0, 10));
			})
			.catch((err) => {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				setTopArtists([]);
			})
			.finally(() => {
				setIsArtistsLoading(false);
			});

		return () => {
			controller.abort();
		};
	}, []);

	const queueTracks: QueueTrack[] = useMemo(() => {
		return tracks.map((track) => ({
			id: track.id,
			title: track.title,
			artistName: "Loading...",
			artworkUrl: track.artworkUrl,
			duration: track.duration,
		}));
	}, [tracks]);

	const featuredTracks = useMemo(() => tracks.slice(0, 10), [tracks]);

	const newReleases: Track[] = useMemo(() => {
		return [...tracks]
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
			.slice(0, 8);
	}, [tracks]);


	const quickPicks: Track[] = useMemo(() => {
		if (tracks.length === 0) return [];
		// Deterministic pseudo-shuffle so it doesn't reorder every render
		const len = tracks.length;
		const seed = (n: number) => (n * 9301 + 49297) % 233280;
		const picked: Track[] = [];
		const used = new Set<number>();
		let i = 0;
		while (picked.length < Math.min(4, len) && i < len * 3) {
			const idx = seed(i + 7) % len;
			if (!used.has(idx)) {
				used.add(idx);
				const track = tracks[idx];
				if (track) picked.push(track);
			}
			i += 1;
		}
		return picked;
	}, [tracks]);

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	const handleTrackPress = useCallback((trackId: string) => {
		const trackIndex = queueTracks.findIndex((track) => track.id === trackId);
		const selectedTrack = queueTracks[trackIndex];

		if (selectedTrack && queueTracks.length > 0) {
			trackPlayWithQueue(
				trackId,
				selectedTrack.title,
				"all-songs",
				queueTracks.length,
				trackIndex,
			);
			playTrackWithQueue(selectedTrack, queueTracks, trackIndex, ALL_SONGS_SOURCE);
			return;
		}

		playTrack(trackId);
	}, [playTrack, playTrackWithQueue, queueTracks]);

	const handleArtistPress = useCallback((artistId: string) => {
		router.push(`/artist-detail?id=${artistId}`);
	}, []);

	const playPulse = useSharedValue(1);
	useEffect(() => {
		playPulse.value = withRepeat(
			withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
			-1,
			true,
		);
	}, [playPulse]);
	const playPulseStyle = useAnimatedStyle(() => ({
		transform: [{ scale: playPulse.value }],
	}));

	const renderTopArtists = () => {
		if (isArtistsLoading) {
			return <WavyLoading color={themeColors.primary} />;
		}

		if (topArtists.length === 0) {
			return <Text style={{ color: themeColors.tint }}>No artists available.</Text>;
		}

		return (
			<Host matchContents>
				<HorizontalCenteredHeroCarousel
					maxItemWidth={220}
					maxSmallItemWidth={120}
					minSmallItemWidth={90}
					itemSpacing={12}
					contentPadding={{ start: 0, top: 10, end: 0, bottom: 0 }}
					modifiers={[size(SCREEN_WIDTH, 220)]}
					flingBehavior="singleAdvance"
				>
					{topArtists.map((artist) => (
						<Box
							key={artist.id}
							modifiers={[size(220, 220), clip(Shapes.RoundedCorner(12)), clickable(() => handleArtistPress(artist.id))]}
						>
							<RNHostView matchContents>
								<Image
									// biome-ignore lint/style/noNonNullAssertion: always present
									source={{ uri: artist.avatarUrl! }}
									style={{ width: "100%", height: 250, backgroundColor: themeColors.muted }}
									resizeMode="cover"
								/>
							</RNHostView>
						</Box>
					))}
				</HorizontalCenteredHeroCarousel>
			</Host>
		);
	};

	if (!hasInitialLoaded) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
				<LinearGradient
					colors={[`${themeColors.primary}22`, "transparent"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 0.6, y: 0.6 }}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						height: SCREEN_WIDTH * 1.1,
					}}
					pointerEvents="none"
				/>
				<Animated.View
					entering={FadeIn.duration(200)}
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<WavyLoading color={themeColors.primary} dimension={72} />
				</Animated.View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
			<LinearGradient
				colors={[`${themeColors.primary}22`, "transparent"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.6, y: 0.6 }}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: SCREEN_WIDTH * 1.1,
				}}
				pointerEvents="none"
			/>
			<ScrollView
				style={{ flex: 1, backgroundColor: "transparent" }}
				contentContainerStyle={{ paddingHorizontal: 16 }}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-row items-center justify-end px-4 py-3">
					<Pressable
						onPress={handleOpenDrawer}
						style={({ pressed }) => ({
							opacity: pressed ? 0.6 : 1,
							transform: [{ scale: pressed ? 0.92 : 1 }],
						})}
					>
						<Menu size={32} color={themeColors.text} />
					</Pressable>
				</View>
				<Animated.View entering={FadeIn.duration(300)} className="mt-3">
					<View className="flex-row items-end justify-between">
						<View>
							<Text
								style={{ color: themeColors.text, fontSize: 78, lineHeight: 78, fontWeight: "800" }}
							>
								Your{"\n"}Mix
							</Text>
							<Text
								style={{ color: themeColors.tint, fontSize: 44 / 2, fontWeight: "500", marginTop: 10 }}
							>
								Today&apos;s Mix for you
							</Text>
						</View>

						<Animated.View style={playPulseStyle}>
							<Pressable
								onPress={() => {
									const firstTrack = featuredTracks[0];
									if (firstTrack) {
										handleTrackPress(firstTrack.id);
									}
								}}
								className="h-32 w-32 items-center justify-center rounded-full"
								style={({ pressed }) => ({
									backgroundColor: themeColors.accent,
									boxShadow: `0 10px 24px ${themeColors.primary}40`,
									opacity: pressed ? 0.85 : 1,
									transform: [{ scale: pressed ? 0.94 : 1 }],
								})}
							>
								<Play size={56} color={themeColors.mutedForeground} fill={themeColors.muted} />
							</Pressable>
						</Animated.View>
					</View>

					<Animated.View entering={FadeInDown.duration(360).delay(80).springify().damping(16)}>
						<AdaptiveCollage
							featuredTracks={featuredTracks}
							handleTrackPress={handleTrackPress}
						/>
					</Animated.View>

					<Animated.View
						entering={FadeInDown.duration(380).delay(140).springify().damping(16)}
						style={{ marginTop: 30, paddingBottom: 12 }}
					>
						{renderTopArtists()}
					</Animated.View>

					{/* New Releases */}
					{newReleases.length > 0 && (
						<Animated.View
							entering={FadeInDown.duration(380).delay(180).springify().damping(16)}
							style={{ marginTop: 12 }}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "space-between",
									paddingHorizontal: 4,
									marginBottom: 12,
								}}
							>
								<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
									<Text
										style={{
											color: themeColors.text,
											fontSize: 22,
											fontWeight: "700",
										}}
									>
										New Releases
									</Text>
								</View>
								<Pressable
									onPress={() => router.push("/allsongs")}
									style={({ pressed }) => ({
										opacity: pressed ? 0.6 : 1,
									})}
								>
									<Text
										style={{
											color: themeColors.primary,
											fontSize: 14,
											fontWeight: "600",
										}}
									>
										See all
									</Text>
								</Pressable>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{ paddingHorizontal: 4, gap: 14 }}
							>
								{newReleases.map((track, idx) => (
									<Pressable
										key={track.id}
										onPress={() => handleTrackPress(track.id)}
										style={({ pressed }) => ({
											width: 168,
											opacity: pressed ? 0.9 : 1,
											transform: [{ scale: pressed ? 0.97 : 1 }],
										})}
									>
										<View
											style={{
												width: 168,
												height: 168,
												borderRadius: 16,
												borderCurve: "continuous",
												overflow: "hidden",
												backgroundColor: `${themeColors.primary}1a`,
											}}
										>
											{track.artworkUrl ? (
												<Image
													source={{ uri: track.artworkUrl }}
													style={{ width: "100%", height: "100%" }}
													resizeMode="cover"
												/>
											) : (
												<View
													style={{
														width: "100%",
														height: "100%",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													<Disc size={48} color={themeColors.primary} opacity={0.5} />
												</View>
											)}
											{idx === 0 && (
												<View
													style={{
														position: "absolute",
														top: 8,
														left: 8,
														paddingHorizontal: 8,
														paddingVertical: 4,
														borderRadius: 999,
														backgroundColor: themeColors.primary,
													}}
												>
													<Text
														style={{
															color: themeColors.primaryForeground,
															fontSize: 10,
															fontWeight: "700",
															letterSpacing: 0.4,
														}}
													>
														LATEST
													</Text>
												</View>
											)}
										</View>
										<Text
											style={{
												color: themeColors.text,
												fontSize: 14,
												fontWeight: "600",
												marginTop: 8,
											}}
											numberOfLines={1}
										>
											{track.title}
										</Text>
										{track.duration ? (
											<Text
												style={{
													color: themeColors.mutedForeground,
													fontSize: 12,
													marginTop: 2,
													fontVariant: ["tabular-nums"],
												}}
											>
												{formatDuration(track.duration)}
											</Text>
										) : null}
									</Pressable>
								))}
							</ScrollView>
						</Animated.View>
					)}


					{/* Quick Picks */}
					{quickPicks.length > 0 && (
						<Animated.View
							entering={FadeInDown.duration(380).delay(260).springify().damping(16)}
							style={{ marginTop: 28, paddingBottom: 32 }}
						>
							<Text
								style={{
									color: themeColors.text,
									fontSize: 22,
									fontWeight: "700",
									paddingHorizontal: 4,
									marginBottom: 12,
								}}
							>
								Quick Picks
							</Text>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: 10,
								}}
							>
								{quickPicks.map((track) => (
									<Pressable
										key={track.id}
										onPress={() => handleTrackPress(track.id)}
										style={({ pressed }) => ({
											width: (SCREEN_WIDTH - 32 - 10) / 2,
											opacity: pressed ? 0.9 : 1,
											transform: [{ scale: pressed ? 0.98 : 1 }],
										})}
									>
										<BlurSurface
											intensity={40}
											style={{
												flexDirection: "row",
												alignItems: "center",
												padding: 8,
												gap: 10,
												borderRadius: 14,
												borderCurve: "continuous",
												overflow: "hidden",
												borderWidth: 0
											}}
										>
											<View
												style={{
													width: 56,
													height: 56,
													borderRadius: 10,
													borderCurve: "continuous",
													overflow: "hidden",
													backgroundColor: `${themeColors.primary}26`,
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												{track.artworkUrl ? (
													<Image
														source={{ uri: track.artworkUrl }}
														style={{ width: "100%", height: "100%" }}
														resizeMode="cover"
													/>
												) : (
													<Disc size={26} color={themeColors.primary} opacity={0.6} />
												)}
											</View>
											<View style={{ flex: 1 }}>
												<Text
													style={{
														color: themeColors.text,
														fontSize: 13,
														fontWeight: "600",
													}}
													numberOfLines={1}
												>
													{track.title}
												</Text>
												{track.genre ? (
													<Text
														style={{
															color: themeColors.mutedForeground,
															fontSize: 11,
															marginTop: 2,
														}}
														numberOfLines={1}
													>
														{track.genre}
													</Text>
												) : track.duration ? (
													<Text
														style={{
															color: themeColors.mutedForeground,
															fontSize: 11,
															marginTop: 2,
															fontVariant: ["tabular-nums"],
														}}
													>
														{formatDuration(track.duration)}
													</Text>
												) : null}
											</View>
										</BlurSurface>
									</Pressable>
								))}
							</View>
						</Animated.View>
					)}

				</Animated.View>
			</ScrollView>
		</SafeAreaView>
	);
}

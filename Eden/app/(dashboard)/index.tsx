import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import { type Artist, fetchArtists } from "@/lib/actions/artists";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";
import { trackPlayWithQueue } from "@/lib/analytics";
import {
	Box,
	HorizontalCenteredHeroCarousel,
	Host,
	RNHostView,
} from "@expo/ui/jetpack-compose";
import { Shapes, clickable, clip, size } from "@expo/ui/jetpack-compose/modifiers";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { Menu, Play } from "lucide-react-native";
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
import { SafeAreaView } from "react-native-safe-area-context";

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
	const { playTrack, playTrackWithQueue } = useGlobalPlayer();
	const { tracks, isLoading, fetchTracks, clearTracks } = useTrackStore();
	const [topArtists, setTopArtists] = useState<Artist[]>([]);
	const [isArtistsLoading, setIsArtistsLoading] = useState(false);

	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

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

	const renderTopArtists = () => {
		if (isArtistsLoading) {
			return <Text style={{ color: themeColors.tint }}>Loading artists...</Text>;
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

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
			<ScrollView
				style={{ flex: 1, backgroundColor: themeColors.background }}
				contentContainerStyle={{ paddingHorizontal: 16 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row items-center justify-end px-4 py-3">
					<Pressable onPress={handleOpenDrawer}>
						<Menu size={32} color={themeColors.text} />
					</Pressable>
				</View>
				<View className="mt-3">
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

						<Pressable
							onPress={() => {
								const firstTrack = featuredTracks[0];
								if (firstTrack) {
									handleTrackPress(firstTrack.id);
								}
							}}
							className="h-32 w-32 items-center justify-center rounded-full"
							style={{ backgroundColor: themeColors.accent }}
						>
							<Play size={56} color={themeColors.mutedForeground} fill={themeColors.muted} />
						</Pressable>
					</View>

					<AdaptiveCollage
						featuredTracks={featuredTracks}
						handleTrackPress={handleTrackPress}
					/>

					<View style={{ marginTop:30, paddingBottom: 24 }}>
						{renderTopArtists()}
					</View>

					{isLoading && (
						<Text style={{ color: themeColors.tint, marginTop: 10 }}>
							Loading songs...
						</Text>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

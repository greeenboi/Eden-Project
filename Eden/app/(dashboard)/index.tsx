import Colors from "@/constants/Colors";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";
import { trackPlayWithQueue } from "@/lib/analytics";
import { Box, Host, RNHostView } from "@expo/ui/jetpack-compose";
import { Shapes, clip, size } from "@expo/ui/jetpack-compose/modifiers";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import {
	Menu,
	Play
} from "lucide-react-native";
import { useEffect, useMemo } from "react";
import {
	Dimensions,
	Image,
	Pressable,
	Text,
	View,
	useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TRACK_STATUS_FILTER = "published";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DESIGN_WIDTH = 375;
const scale = (value: number) => (SCREEN_WIDTH / DESIGN_WIDTH) * value;

type CollageTrack = {
	id?: string;
	artworkUrl?: string | null;
};

type ThemePalette = {
	accent: string;
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
		top: "15%",
		left: "18%",
		zIndex: 10,
		shape: "Pill",
		rotate: "20deg",
	},
	{
		width: scale(90),
		height: scale(90),
		top: scale(10),
		left: scale(10),
		zIndex: 20,
		shape: "Circle",
		rotate: "0deg",
	},
	{
		width: scale(90),
		height: scale(90),
		top: scale(20),
		right: scale(10),
		zIndex: 20,
		shape: "Other",
		rotate: "-18deg",
	},
	{
		width: scale(130),
		height: scale(130),
		top: scale(2),
		left: scale(-10),
		zIndex: 5,
		shape: "RoundedCornerShape",
		rotate: "-20deg",
	},
	{
		width: scale(210),
		height: scale(210),
		bottom: -60,
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
	themeColors: ThemePalette;
	handleTrackPress: (trackId: string) => void;
}) => {
	const collageHeight = scale(400);

	const songsToShow: Array<CollageTrack | null> = [...featuredTracks.slice(0, 6)];
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

	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	useEffect(() => {
		fetchTracks(1, 40, undefined, undefined, TRACK_STATUS_FILTER);

		return () => {
			clearTracks();
		};
	}, [fetchTracks, clearTracks]);

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
	const allSongsSource: QueueSource = useMemo(() => ({ type: "all-songs" }), []);

	const handleOpenDrawer = () => {
		navigation.dispatch(DrawerActions.openDrawer());
	};

	const handleTrackPress = (trackId: string) => {
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
			playTrackWithQueue(selectedTrack, queueTracks, trackIndex, allSongsSource);
			return;
		}

		playTrack(trackId);
	};

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
			<View style={{ flex: 1, backgroundColor: themeColors.background, paddingBottom: 230, paddingHorizontal: 16 }} >
				<View className="flex-row items-center justify-end px-4 py-3">
					<Pressable onPress={handleOpenDrawer}>
						<Menu size={32} color={themeColors.text} />
					</Pressable>
				</View>
				<View className="pt-3">
					<View className="flex-row items-end justify-between">
						<View>
							<Text
								style={{ color: themeColors.text, fontSize: 78, lineHeight: 78, fontWeight: "800" }}
							>
								Your{"\n"}Mix
							</Text>
							<Text style={{ color: themeColors.tint, fontSize: 44/2, fontWeight: "500", marginTop: 10 }}>
								Today's Mix for you
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

					<AdaptiveCollage featuredTracks={featuredTracks} themeColors={themeColors} handleTrackPress={handleTrackPress} />
					
					{isLoading && <Text style={{ color: themeColors.tint, marginTop: 10 }}>Loading songs...</Text>}
				</View>
			</View>
		</SafeAreaView>
	);
}

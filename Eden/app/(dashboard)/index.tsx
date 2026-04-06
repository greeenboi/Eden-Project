import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { useGlobalPlayer } from "@/lib/GlobalPlayerProvider";
import type { QueueSource, QueueTrack } from "@/lib/actions/queue";
import { useTrackStore } from "@/lib/actions/tracks";
import { trackPlayWithQueue } from "@/lib/analytics";
import { THEME } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";
import {
    Column,
    Text as ComposeText,
    FlowRow,
    HorizontalUncontainedCarousel,
    Host,
    Row,
    Shape,
    Surface,
} from "@expo/ui/jetpack-compose";
import {
    alpha,
    border,
    fillMaxWidth,
    height,
    padding,
    paddingAll,
    rotate,
    shadow,
    size,
    width,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TRACK_STATUS_FILTER = "published";

function withAlpha(hexColor: string, alpha: number): string {
	const hex = hexColor.replace("#", "");
	const normalized =
		hex.length === 3
			? hex
					.split("")
					.map((c) => `${c}${c}`)
					.join("")
			: hex;
	const r = Number.parseInt(normalized.slice(0, 2), 16);
	const g = Number.parseInt(normalized.slice(2, 4), 16);
	const b = Number.parseInt(normalized.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function HomeScreen() {
	const isAndroid = process.env.EXPO_OS === "android";
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? THEME.dark : THEME.light;
	const isDark = colorScheme === "dark";
	const ui = useMemo(
		() => ({
			heroSurface: themeColors.card,
			heroBorder: themeColors.border,
			heroBadgeBg: withAlpha(themeColors.secondary, isDark ? 0.65 : 0.9),
			heroBadgeText: themeColors.secondaryForeground,
			heroTitle: themeColors.cardForeground,
			heroBody: themeColors.mutedForeground,
			featureColors: [
				themeColors.card,
				withAlpha(themeColors.secondary, isDark ? 0.5 : 0.8),
				withAlpha(themeColors.accent, isDark ? 0.45 : 0.75),
				withAlpha(themeColors.muted, isDark ? 0.5 : 0.75),
			],
			microColors: [
				withAlpha(themeColors.card, isDark ? 0.95 : 0.92),
				withAlpha(themeColors.secondary, isDark ? 0.5 : 0.85),
				withAlpha(themeColors.accent, isDark ? 0.45 : 0.8),
				withAlpha(themeColors.muted, isDark ? 0.5 : 0.82),
			],
			chipColors: [
				withAlpha(themeColors.secondary, isDark ? 0.4 : 0.8),
				withAlpha(themeColors.accent, isDark ? 0.42 : 0.82),
				withAlpha(themeColors.muted, isDark ? 0.45 : 0.85),
				withAlpha(themeColors.card, isDark ? 0.92 : 0.9),
			],
			borderStrong: themeColors.border,
			titleText: themeColors.foreground,
			softText: withAlpha(themeColors.foreground, 0.72),
			mutedText: themeColors.mutedForeground,
			accentA: themeColors.chart5,
			accentB: themeColors.chart1,
			accentC: themeColors.chart2,
			accentD: themeColors.chart3,
			accentE: themeColors.chart4,
		}),
		[themeColors, isDark],
	);
	const { playTrack, playTrackWithQueue } = useGlobalPlayer();
	const { tracks, isLoading, fetchTracks, clearTracks } = useTrackStore();

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
	const microTracks = useMemo(() => tracks.slice(4, 20), [tracks]);
	const quickPicks = useMemo(() => tracks.slice(10, 34), [tracks]);
	const allSongsSource: QueueSource = useMemo(() => ({ type: "all-songs" }), []);

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

	if (!isAndroid) {
		return (
			<SafeAreaView style={{ flex: 1 }}>
				<ScrollView
					contentInsetAdjustmentBehavior="automatic"
					contentContainerStyle={{ padding: 20, gap: 16 }}
				>
					<View className="rounded-xl bg-muted/10 p-4">
						<Text className="text-xl font-semibold">Android Native Home</Text>
						<Text className="text-sm opacity-70 mt-2">
							This home screen uses Android Compose-native Expo UI components.
						</Text>
					</View>
					<Pressable
						onPress={() => router.push("/allsongs")}
						style={{
							paddingVertical: 14,
							paddingHorizontal: 16,
							borderRadius: 12,
							backgroundColor: themeColors.primary,
						}}
					>
						<Text style={{ color: themeColors.background, fontWeight: "700" }}>
							Open All Songs
						</Text>
					</Pressable>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: 120 }}
			>
				<Host useViewportSizeMeasurement style={{ flex: 1 }}>
					<Column
						modifiers={[fillMaxWidth(), paddingAll(16)]}
						verticalArrangement={{ spacedBy: 12 }}
					>
						<Surface
							color={ui.heroSurface}
							shadowElevation={8}
							modifiers={[
								fillMaxWidth(),
								paddingAll(16),
								shadow(6),
								border(1, ui.heroBorder),
							]}
						>
							<Column verticalArrangement={{ spacedBy: 12 }}>
								<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
									<Surface
										color={ui.heroBadgeBg}
										tonalElevation={0}
										modifiers={[padding(8, 4, 8, 4)]}
									>
										<ComposeText
											style={{ typography: "labelSmall" }}
											color={ui.heroBadgeText}
										>
											LIVE MIX
										</ComposeText>
									</Surface>
									<Shape.Star
										verticesCount={10}
										innerRadius={0.45}
										cornerRounding={0.22}
										color={ui.accentA}
										modifiers={[size(24, 24), rotate(8)]}
									/>
								</Row>
								<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
									<ComposeText
										style={{ typography: "headlineMedium" }}
										color={ui.heroTitle}
									>
										Pixel Home
									</ComposeText>
									<Shape.Polygon
										verticesCount={6}
										cornerRounding={0.25}
										color={ui.accentB}
										modifiers={[size(28, 28), alpha(0.95)]}
									/>
								</Row>
								<ComposeText style={{ typography: "bodyMedium" }} color={ui.heroBody}>
									A bold, neon-leaning dashboard inspired by PixelPlayer. Tap cards to jump into queue playback instantly.
								</ComposeText>
								<Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
									<Shape.Circle color={ui.accentA} radius={0.45} modifiers={[size(10, 10)]} />
									<Shape.Circle color={ui.accentB} radius={0.45} modifiers={[size(10, 10)]} />
									<Shape.Circle color={ui.accentC} radius={0.45} modifiers={[size(10, 10)]} />
								</Row>
							</Column>
						</Surface>

						<Column verticalArrangement={{ spacedBy: 8 }}>
							<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
								<ComposeText style={{ typography: "titleLarge" }} color={ui.titleText}>
									Featured Rotation
								</ComposeText>
								<Pressable onPress={() => router.push("/allsongs")}>
									<Text className="text-sm font-semibold" style={{ color: themeColors.primary }}>
										See all
									</Text>
								</Pressable>
							</Row>
							<HorizontalUncontainedCarousel
								itemWidth={232}
								itemSpacing={10}
								contentPadding={2}
								flingBehavior="singleAdvance"
							>
								{featuredTracks.map((track, index) => (
									<Surface
										key={track.id}
										onClick={() => handleTrackPress(track.id)}
										color={ui.featureColors[index % ui.featureColors.length]}
										tonalElevation={3}
										shadowElevation={10}
										modifiers={[
											width(232),
											height(194),
											paddingAll(14),
											border(1, ui.borderStrong),
										]}
									>
										<Column verticalArrangement={{ spacedBy: 8 }}>
											<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
												<Shape.Circle
													radius={0.45}
													color={index % 2 === 0 ? ui.accentB : ui.accentA}
													modifiers={[size(44, 44)]}
												/>
												<ComposeText
													style={{ typography: "labelMedium" }}
													color={ui.softText}
												>
													{formatDuration(track.duration)}
												</ComposeText>
											</Row>
											<Shape.Rectangle
												cornerRounding={0.42}
												smoothing={0.45}
												color={withAlpha(themeColors.secondary, index % 2 === 0 ? 0.5 : 0.65)}
												modifiers={[fillMaxWidth(), height(56)]}
											/>
											<ComposeText
												style={{ typography: "titleMedium" }}
												color={ui.titleText}
											>
												{track.title}
											</ComposeText>
											<ComposeText style={{ typography: "bodySmall" }} color={ui.mutedText}>
												Tap to start queue playback
											</ComposeText>
										</Column>
									</Surface>
								))}
							</HorizontalUncontainedCarousel>
						</Column>

						<Row
							horizontalArrangement={{ spacedBy: 10 }}
							verticalAlignment="center"
						>
							<Shape.Pill
								smoothing={0.7}
								color={withAlpha(themeColors.secondary, 0.65)}
								modifiers={[width(54), height(14), alpha(0.9)]}
							/>
							<Shape.Star
								verticesCount={8}
								innerRadius={0.44}
								cornerRounding={0.2}
								color={ui.accentC}
								modifiers={[size(14, 14), rotate(16)]}
							/>
							<Shape.Polygon
								verticesCount={6}
								cornerRounding={0.35}
								color={ui.accentA}
								modifiers={[size(18, 18), alpha(0.9)]}
							/>
							<Shape.Pill
								smoothing={0.65}
								color={withAlpha(themeColors.accent, 0.75)}
								modifiers={[width(78), height(14), alpha(0.9)]}
							/>
						</Row>

						<Column verticalArrangement={{ spacedBy: 8 }}>
							<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
								<ComposeText style={{ typography: "titleLarge" }} color={ui.titleText}>
									Pulse Lane
								</ComposeText>
								<ComposeText style={{ typography: "labelMedium" }} color={ui.softText}>
									Micro cards
								</ComposeText>
							</Row>
							<HorizontalUncontainedCarousel
								itemWidth={142}
								itemSpacing={8}
								contentPadding={2}
								flingBehavior="singleAdvance"
							>
								{microTracks.map((track, index) => (
									<Surface
										key={`micro-${track.id}`}
										onClick={() => handleTrackPress(track.id)}
										color={ui.microColors[index % ui.microColors.length]}
										tonalElevation={2}
										shadowElevation={4}
										modifiers={[
											width(142),
											height(126),
											paddingAll(10),
											border(1, ui.borderStrong),
										]}
									>
										<Column verticalArrangement={{ spacedBy: 6 }}>
											<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
												<Shape.Circle
													radius={0.45}
													color={index % 2 === 0 ? ui.accentA : ui.accentB}
													modifiers={[size(16, 16)]}
												/>
												<ComposeText style={{ typography: "labelSmall" }} color={ui.softText}>
													{formatDuration(track.duration)}
												</ComposeText>
											</Row>
											<ComposeText style={{ typography: "labelLarge" }} color={ui.titleText}>
												{track.title}
											</ComposeText>
											<Shape.Rectangle
												cornerRounding={0.45}
												smoothing={0.4}
												color={withAlpha(themeColors.secondary, 0.7)}
												modifiers={[fillMaxWidth(), height(6), alpha(0.85)]}
											/>
										</Column>
									</Surface>
								))}
							</HorizontalUncontainedCarousel>
						</Column>

						<Column verticalArrangement={{ spacedBy: 8 }}>
							<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
								<ComposeText style={{ typography: "titleLarge" }} color={ui.titleText}>
									Quick Picks
								</ComposeText>
								<Sparkles color={themeColors.primary} size={18} />
							</Row>
							<FlowRow
								modifiers={[fillMaxWidth()]}
								horizontalArrangement={{ spacedBy: 6 }}
								verticalArrangement={{ spacedBy: 6 }}
							>
								{quickPicks.map((track, index) => (
									<Surface
										key={track.id}
										onClick={() => handleTrackPress(track.id)}
										color={ui.chipColors[index % ui.chipColors.length]}
										tonalElevation={2}
										modifiers={[padding(10, 8, 10, 8), border(1, ui.borderStrong)]}
									>
										<Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
											<Shape.Circle
												radius={0.45}
												color={index % 2 === 0 ? ui.accentB : ui.accentE}
												modifiers={[size(18, 18)]}
											/>
											<ComposeText style={{ typography: "labelMedium" }} color={ui.titleText}>
												{track.title}
											</ComposeText>
										</Row>
									</Surface>
								))}
							</FlowRow>
						</Column>

						<Surface
							onClick={() => router.push("/allsongs")}
							color={ui.heroSurface}
							tonalElevation={2}
							modifiers={[fillMaxWidth(), paddingAll(14), border(1, ui.heroBorder)]}
						>
							<Row horizontalArrangement="spaceBetween" verticalAlignment="center">
								<ComposeText style={{ typography: "titleMedium" }} color={ui.titleText}>
									Open full All Songs grid
								</ComposeText>
								<Shape.Star
									verticesCount={10}
									innerRadius={0.5}
									cornerRounding={0.2}
									color={themeColors.primary}
									modifiers={[size(24, 24)]}
								/>
							</Row>
						</Surface>

						{isLoading && (
							<View className="px-1 py-3">
								<Text className="opacity-60">Loading songs...</Text>
							</View>
						)}
					</Column>
				</Host>
			</ScrollView>
		</SafeAreaView>
	);
}

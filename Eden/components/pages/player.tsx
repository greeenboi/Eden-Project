import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatDuration, useTrackAudioPlayer } from "@/lib/AudioPlayer";
import { useTrackStore } from "@/lib/actions/tracks";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import {
	AlertCircle,
	ArrowLeft,
	Music,
	Pause,
	Play,
	Repeat,
	SkipBack,
	SkipForward,
	User,
	Volume2
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet } from "react-native";

type PlayingSongContentProps = {
	trackId?: string;
	showHeader?: boolean;
	onClose?: () => void;
	variant?: "full" | "compact" | "mini";
};

export function PlayingSongContent({
	trackId,
	showHeader = false,
	onClose,
	variant = "full",
}: PlayingSongContentProps) {
	const log = (...args: unknown[]) => console.log("[Player]", ...args);
	const {
		currentTrack,
		isLoading,
		error,
		fetchTrackById,
		getStreamingUrl,
		clearCurrentTrack,
	} = useTrackStore();
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	const {
		player,
		status,
		streamUrl,
		loadingStream,
		seekForward,
		seekBackward,
		toggleLoop,
		toggleMute,
		togglePlayback,
		isMuted,
	} = useTrackAudioPlayer({
		trackId,
		fetchStream: getStreamingUrl,
		enabled: Boolean(trackId && currentTrack && currentTrack.id === trackId),
		updateInterval: 100,
	});

	const [scrubValue, setScrubValue] = useState(0);
	const [isScrubbing, setIsScrubbing] = useState(false);

	useEffect(() => {
		if (!isScrubbing) {
			setScrubValue(status.currentTime ?? 0);
		}
	}, [status.currentTime, isScrubbing]);

	const sliderValue = useMemo(() => {
		return isScrubbing ? scrubValue : status.currentTime ?? 0;
	}, [isScrubbing, scrubValue, status.currentTime]);

	const sliderMax = useMemo(() => {
		return status.duration && status.duration > 0 ? status.duration : 1;
	}, [status.duration]);

	const safeSliderMax = useMemo(() => {
		if (!Number.isFinite(sliderMax) || sliderMax <= 0) return 1;
		return sliderMax;
	}, [sliderMax]);

	const safeSliderValue = useMemo(() => {
		if (!Number.isFinite(sliderValue)) return 0;
		return Math.min(safeSliderMax, Math.max(0, sliderValue));
	}, [safeSliderMax, sliderValue]);

	const handleSlidingStart = (value: number) => {
		setIsScrubbing(true);
		setScrubValue(Number.isFinite(value) ? value : 0);
	};

	const handleValueChange = (value: number) => {
		if (!Number.isFinite(value)) return;
		setScrubValue(value);
	};

	const handleSlidingComplete = (value: number) => {
		setIsScrubbing(false);
		if (!status.isLoaded || !Number.isFinite(value)) return;
		player.seekTo(Math.min(safeSliderMax, Math.max(0, value)));
	};

	// Localize loading to this track so list fetches elsewhere don't block the player UI
	const isTrackLoading = isLoading && (!currentTrack || currentTrack.id !== trackId);

	const handleClose = () => {
		log("handleClose");
		if (onClose) {
			onClose();
		} else {
			router.back();
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		log("track effect", { trackId });
		if (trackId) {
			fetchTrackById(trackId);
		} else {
			clearCurrentTrack();
		}

		return () => {
			log("cleanup track effect", { trackId });
			clearCurrentTrack();
		};
	}, [trackId, fetchTrackById, clearCurrentTrack]);

	if (!trackId) {
		return (
			<View style={styles.container} className="items-center justify-center px-8 bg-background">
				<Text className="text-center opacity-70">
					Select a track to start playing.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container} className="bg-background">
			{showHeader && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center justify-between p-4"
				>
					<Button variant="ghost" size="sm" onPress={handleClose}>
						<ArrowLeft size={24} />
					</Button>
					<Text className="text-lg font-semibold">Now Playing</Text>
					<View style={{ backgroundColor: "transparent" }} className="w-10" />
				</View>
			)}

			{error && (
				<View style={{ backgroundColor: "transparent" }} className="px-4 pb-2">
					<Alert variant="destructive" icon={AlertCircle}>
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</View>
			)}

			{isTrackLoading && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 px-8"
				>
					<Skeleton className="w-full aspect-square max-w-sm mx-auto mb-8" />
					<Skeleton className="h-8 w-3/4 mb-2" />
					<Skeleton className="h-6 w-1/2 mb-4" />
					<Skeleton className="h-4 w-full mb-2" />
					<Skeleton className="h-16 w-full" />
				</View>
			)}

			{!isTrackLoading && currentTrack && (
				<>
					{variant === "full" && (
						<>
							<View
								className="items-center justify-center flex-1 px-8 py-2"
							>
                                {/* Artwork */}
                                <View className="max-w-sm">
                                    {currentTrack.artworkUrl ? (
                                        <Image
                                            source={{ uri: currentTrack.artworkUrl }}
                                            style={{ width: "100%", height: "100%" }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Music size={120} className="text-primary opacity-50" />
                                    )}
                                    {currentTrack.explicit && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute top-4 right-4"
                                        >
                                            <Text>Explicit</Text>
                                        </Badge>
                                    )}
                                </View>

                                {/* Stream Fetch Status */}
								{loadingStream && (
									<View
										style={{ backgroundColor: "transparent" }}
										className="mt-4 flex-row items-center gap-2"
									>
										<ActivityIndicator size="small" color={themeColors.tint} />
										<Text className="text-sm opacity-70">Loading audio...</Text>
									</View>
								)}
								{status.isBuffering && (
									<View
										style={{ backgroundColor: "transparent" }}
										className="mt-4 flex-row items-center gap-2"
									>
										<ActivityIndicator size="small" color={themeColors.tint} />
										<Text className="text-sm opacity-70">Buffering...</Text>
									</View>
								)}
								{streamUrl && status.isLoaded && !status.playing && !loadingStream && (
									<View
										style={{ backgroundColor: "transparent" }}
										className="mt-4"
									>
										<Text className="text-sm opacity-70">Ready to play</Text>
									</View>
								)}
							</View>

							<View
								style={{ backgroundColor: "transparent" }}
								className="px-8 pb-4"
							>
								<View
									style={{ backgroundColor: "transparent" }}
									className="flex-row items-start justify-between mb-2"
								>
									<View
										style={{ backgroundColor: "transparent" }}
										className="flex-1 mr-4"
									>
										<Text className="text-2xl font-bold mb-1">
											{currentTrack.title}
										</Text>
										<Pressable
											onPress={() =>
												router.push(`/artist-detail?id=${currentTrack.artistId}`)
											}
										>
											<Text className="text-lg opacity-70 mb-1 underline">
												{currentTrack.artist.name}
											</Text>
										</Pressable>
									</View>
                                    {currentTrack.genre && (
                                        <Badge variant="secondary" className="self-start mt-2">
                                            <Text className="text-xs">{currentTrack.genre}</Text>
                                        </Badge>
                                    )}
								</View>
							</View>

							<View
								style={{ backgroundColor: "transparent" }}
								className="px-8 pb-8"
							>
								<View
									style={{ backgroundColor: "transparent" }}
									className="flex-row items-center justify-center gap-6 mb-4"
								>
									<Pressable onPress={toggleLoop}>
										<Repeat
											size={24}
											className={player.loop ? "text-primary" : "opacity-50"}
										/>
									</Pressable>

									<Pressable onPress={() => seekBackward()}>
										<SkipBack size={32} />
									</Pressable>

									<Pressable
										onPress={togglePlayback}
										disabled={!status.isLoaded || loadingStream}
									>
										<View
											style={{ backgroundColor: "transparent" }}
											className="w-16 h-16 rounded-full bg-primary items-center justify-center"
										>
											{status.playing ? (
												<Pause size={32} className="text-primary-foreground" />
											) : (
												<Play size={32} className="text-primary-foreground" />
											)}
										</View>
									</Pressable>

									<Pressable onPress={() => seekForward()}>
										<SkipForward size={32} />
									</Pressable>

									<Pressable onPress={toggleMute}>
										<Volume2 size={24} className={isMuted ? "opacity-50" : ""} />
									</Pressable>
								</View>

							</View>

							<View
								style={{ backgroundColor: "transparent" }}
								className="px-8 pb-6"
							>
								<Slider
									key={`slider-full-${trackId ?? "none"}`}
									style={{ width: "100%", height: 40 }}
									minimumValue={0}
									maximumValue={safeSliderMax}
									value={safeSliderValue}
									minimumTrackTintColor={themeColors.primary}
									maximumTrackTintColor={themeColors.muted}
									thumbTintColor={themeColors.primary}
									onSlidingStart={handleSlidingStart}
									onValueChange={handleValueChange}
									onSlidingComplete={handleSlidingComplete}
									disabled={!status.isLoaded || loadingStream}
								/>
								<View
									style={{ backgroundColor: "transparent" }}
									className="flex-row justify-between"
								>
									<Text className="text-sm opacity-50">
										{formatDuration(sliderValue)}
									</Text>
									<Text className="text-sm opacity-50">
										{formatDuration(status.duration)}
									</Text>
								</View>
							</View>
                            
                            {currentTrack.album ? (
                                <Pressable
                                    onPress={() =>
                                        currentTrack.albumId &&
                                        router.push(`/album-detail?id=${currentTrack.albumId}`)
                                    }
                                >
                                    <Text className="text-sm opacity-50 underline">
                                        {currentTrack.album.title}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text className="text-sm opacity-50">Single</Text>
                            )}

                            <Card className="mt-4">
                                <CardContent className="py-3">
                                    <View
                                        style={{ backgroundColor: "transparent" }}
                                        className="flex-row items-center gap-3"
                                    >
                                        <View
                                            style={{ backgroundColor: "transparent" }}
                                            className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center"
                                        >
                                            <User size={24} className="text-primary" />
                                        </View>
                                        <View
                                            style={{ backgroundColor: "transparent" }}
                                            className="flex-1"
                                        >
                                            <Text className="text-sm opacity-70">Artist</Text>
                                            <Text className="font-semibold">
                                                {currentTrack.artist.name}
                                            </Text>
                                        </View>
                                        {currentTrack.artist.verified && (
                                            <Badge variant="default">
                                                <Text className="text-xs">✓ Verified</Text>
                                            </Badge>
                                        )}
                                    </View>
                                </CardContent>
                            </Card>

                            {__DEV__ && (
                                <View
                                    style={{ backgroundColor: "transparent" }}
                                    className="mt-4 p-3 bg-primary/5 rounded"
                                >
                                    <Text className="text-xs opacity-50 mb-1">
                                        Status: {status.playing ? "Playing" : "Stopped"}
                                    </Text>
                                    <Text className="text-xs opacity-50 mb-1">
                                        Loaded: {status.isLoaded ? "Yes" : "No"}
                                    </Text>
                                    <Text className="text-xs opacity-50 mb-1">
                                        Buffering: {status.isBuffering ? "Yes" : "No"}
                                    </Text>
                                    <Text className="text-xs opacity-50 mb-1">
										Duration: {(status.duration ?? 0).toFixed(1)}s
                                    </Text>
                                    <Text className="text-xs opacity-50">
										Volume: {Math.round((player.volume ?? 0) * 100)}%
                                    </Text>
                                </View>
                            )}
						</>
					)}

					{variant === "compact" && (
						<View style={{ flex: 1 }} className="px-4 py-4 gap-4">
							<View
								style={{ backgroundColor: "transparent" }}
								className="items-center"
							>
								<Card className="w-11/12 aspect-square max-w-sm overflow-hidden">
									<CardContent className="flex-1 items-center justify-center bg-primary/10 p-0">
										{currentTrack.artworkUrl ? (
											<Image
												source={{ uri: currentTrack.artworkUrl }}
												style={{ width: "100%", height: "100%" }}
												resizeMode="cover"
											/>
										) : (
											<Music size={96} className="text-primary opacity-50" />
										)}
									</CardContent>
								</Card>
								<Text className="mt-3 text-lg font-semibold" numberOfLines={1}>
									{currentTrack.title}
								</Text>
								<Text className="text-sm opacity-70" numberOfLines={1}>
									{currentTrack.artist.name}
								</Text>
							</View>

							<View className="px-2">
								<Slider
									key={`slider-compact-${trackId ?? "none"}`}
									style={{ width: "100%", height: 36 }}
									minimumValue={0}
									maximumValue={safeSliderMax}
									value={safeSliderValue}
									minimumTrackTintColor={themeColors.primary}
									maximumTrackTintColor={themeColors.muted}
									thumbTintColor={themeColors.primary}
									onSlidingStart={handleSlidingStart}
									onValueChange={handleValueChange}
									onSlidingComplete={handleSlidingComplete}
									disabled={!status.isLoaded || loadingStream}
								/>
								<View className="flex-row justify-between">
									<Text className="text-xs opacity-50">
										{formatDuration(sliderValue)}
									</Text>
									<Text className="text-xs opacity-50">
										{formatDuration(status.duration)}
									</Text>
								</View>
							</View>

							<View className="flex-row items-center justify-center gap-6">
								<Pressable onPress={() => seekBackward()}>
									<SkipBack size={28} />
								</Pressable>
								<Pressable
									onPress={togglePlayback}
									disabled={!status.isLoaded || loadingStream}
								>
									<View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
										{status.playing ? (
											<Pause size={30} className="text-primary-foreground" />
										) : (
											<Play size={30} className="text-primary-foreground" />
										)}
									</View>
								</Pressable>
								<Pressable onPress={() => seekForward()}>
									<SkipForward size={28} />
								</Pressable>
							</View>
						</View>
					)}

					{variant === "mini" && (
						<View
							style={{ backgroundColor: "transparent" }}
							className="flex-row items-center gap-3 px-4 py-3"
						>
							<Card className="w-14 h-14 overflow-hidden">
								<CardContent className="p-0 w-full h-full bg-primary/10">
									{currentTrack.artworkUrl ? (
										<Image
											source={{ uri: currentTrack.artworkUrl }}
											style={{ width: "100%", height: "100%" }}
											resizeMode="cover"
										/>
									) : (
										<Music size={28} className="text-primary opacity-60" />
									)}
								</CardContent>
							</Card>
							<View className="flex-1">
								<Text className="font-semibold" numberOfLines={1}>
									{currentTrack.title}
								</Text>
								<Text className="text-xs opacity-70" numberOfLines={1}>
									{currentTrack.artist.name}
								</Text>
								<Slider
									key={`slider-mini-${trackId ?? "none"}`}
									style={{ width: "100%", height: 32 }}
									minimumValue={0}
									maximumValue={safeSliderMax}
									value={safeSliderValue}
									minimumTrackTintColor={themeColors.primary}
									maximumTrackTintColor={themeColors.muted}
									thumbTintColor={themeColors.primary}
									onSlidingStart={handleSlidingStart}
									onValueChange={handleValueChange}
									onSlidingComplete={handleSlidingComplete}
									disabled={!status.isLoaded || loadingStream}
								/>
							</View>
							<View className="flex-row items-center gap-3">
								<Pressable onPress={() => seekBackward()}>
									<SkipBack size={22} />
								</Pressable>
								<Pressable
									onPress={togglePlayback}
									disabled={!status.isLoaded || loadingStream}
								>
									<View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
										{status.playing ? (
											<Pause size={24} className="text-primary-foreground" />
										) : (
											<Play size={24} className="text-primary-foreground" />
										)}
									</View>
								</Pressable>
								<Pressable onPress={() => seekForward()}>
									<SkipForward size={22} />
								</Pressable>
							</View>
						</View>
					)}
				</>
			)}

			{!isTrackLoading && !currentTrack && !error && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 items-center justify-center px-8 bg-background"
				>
					<AlertCircle size={64} className="opacity-30 mb-4" />
					<Text className="text-xl font-semibold mb-2">Track Not Found</Text>
					<Text className="text-center opacity-70 mb-6">
						The track you're looking for doesn't exist or has been removed.
					</Text>
					<Button onPress={handleClose}>
						<Text>Go Back</Text>
					</Button>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useTrackStore } from "@/lib/actions/tracks";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import {
	AlertCircle,
	ArrowLeft,
	Heart,
	Music,
	Pause,
	Play,
	Repeat,
	SkipBack,
	SkipForward,
	User,
	Volume2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet } from "react-native";

export default function PlayingSongScreen() {
	const { id } = useLocalSearchParams();
	const {
		currentTrack,
		isLoading,
		error,
		fetchTrackById,
		getStreamingUrl,
		clearCurrentTrack,
	} = useTrackStore();
	
	const [streamUrl, setStreamUrl] = useState<string | null>(null);
	const [loadingStream, setLoadingStream] = useState(false);
	const [isFavorite, setIsFavorite] = useState(false);

	// Initialize player - pass null initially
	const player = useAudioPlayer(null, {
		updateInterval: 100,
	});
	const status = useAudioPlayerStatus(player);

	// Fetch track details
	useEffect(() => {
		if (id) {
			fetchTrackById(id as string);
		}
		return () => {
			clearCurrentTrack();
		};
	}, [id, fetchTrackById, clearCurrentTrack]);

	// Get streaming URL when track is loaded
	useEffect(() => {
		if (currentTrack && !streamUrl && !loadingStream) {
			setLoadingStream(true);
			getStreamingUrl(currentTrack.id)
				.then((response) => {
					console.log("✅ Got streaming URL");
					setStreamUrl(response.streamUrl);
				})
				.catch((err) => {
					console.error("❌ Failed to get streaming URL:", err);
				})
				.finally(() => setLoadingStream(false));
		}
	}, [currentTrack, streamUrl, loadingStream, getStreamingUrl]);

	// Load audio when stream URL is available
	useEffect(() => {
		if (streamUrl) {
			console.log("🎵 Loading audio source");
			player.replace(streamUrl);
		}
	}, [streamUrl, player]);

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const getProgress = () => {
		if (!status.duration || status.duration === 0) return 0;
		return (status.currentTime / status.duration) * 100;
	};

	const togglePlayback = () => {
		if (status.playing) {
			player.pause();
		} else {
			player.play();
		}
	};

	const handleSeek = (seconds: number) => {
		player.seekTo(seconds);
	};

	const toggleLoop = () => {
		player.loop = !player.loop;
	};

	const skip10Forward = () => {
		const newTime = Math.min(status.currentTime + 10, status.duration);
		player.seekTo(newTime);
	};

	const skip10Back = () => {
		const newTime = Math.max(status.currentTime - 10, 0);
		player.seekTo(newTime);
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row items-center justify-between p-4"
			>
				<Button variant="ghost" size="sm" onPress={() => router.back()}>
					<ArrowLeft size={24} />
				</Button>
				<Text className="text-lg font-semibold">Now Playing</Text>
				<View style={{ backgroundColor: "transparent" }} className="w-10" />
			</View>

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
			{isLoading && (
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

			{/* Track Content */}
			{!isLoading && currentTrack && (
				<>
					{/* Album Art */}
					<View
						style={{ backgroundColor: "transparent" }}
						className="items-center justify-center flex-1 px-8"
					>
						<Card className="w-full aspect-square max-w-sm overflow-hidden">
							<CardContent className="flex-1 items-center justify-center bg-primary/10 p-0">
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
							</CardContent>
						</Card>

						{/* Audio Status Indicators */}
						{loadingStream && (
							<View
								style={{ backgroundColor: "transparent" }}
								className="mt-4 flex-row items-center gap-2"
							>
								<ActivityIndicator size="small" color="#8b5cf6" />
								<Text className="text-sm opacity-70">Loading audio...</Text>
							</View>
						)}
						{status.isBuffering && (
							<View
								style={{ backgroundColor: "transparent" }}
								className="mt-4 flex-row items-center gap-2"
							>
								<ActivityIndicator size="small" color="#8b5cf6" />
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

					{/* Song Info */}
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
								{currentTrack.genre && (
									<Badge variant="secondary" className="self-start mt-2">
										<Text className="text-xs">{currentTrack.genre}</Text>
									</Badge>
								)}
							</View>
							<Pressable onPress={() => setIsFavorite(!isFavorite)}>
								<Heart
									size={32}
									fill={isFavorite ? "currentColor" : "none"}
									className={
										isFavorite ? "text-destructive" : "text-foreground"
									}
								/>
							</Pressable>
						</View>
					</View>

					{/* Progress Bar */}
					<View
						style={{ backgroundColor: "transparent" }}
						className="px-8 pb-6"
					>
						<Progress value={getProgress()} className="mb-2" />
						<View
							style={{ backgroundColor: "transparent" }}
							className="flex-row justify-between"
						>
							<Text className="text-sm opacity-50">
								{formatDuration(status.currentTime)}
							</Text>
							<Text className="text-sm opacity-50">
								{formatDuration(status.duration)}
							</Text>
						</View>
					</View>

					{/* Playback Controls */}
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

							<Pressable onPress={skip10Back}>
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

							<Pressable onPress={skip10Forward}>
								<SkipForward size={32} />
							</Pressable>

							<Pressable
								onPress={() => {
									player.volume = player.volume > 0 ? 0 : 1;
								}}
							>
								<Volume2
									size={24}
									className={player.volume === 0 ? "opacity-50" : ""}
								/>
							</Pressable>
						</View>

						{/* Artist Info Card */}
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

						{/* Audio Info Debug */}
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
									Duration: {status.duration.toFixed(1)}s
								</Text>
								<Text className="text-xs opacity-50">
									Volume: {Math.round(player.volume * 100)}%
								</Text>
							</View>
						)}
					</View>
				</>
			)}

			{/* Not Found State */}
			{!isLoading && !currentTrack && !error && (
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-1 items-center justify-center px-8"
				>
					<AlertCircle size={64} className="opacity-30 mb-4" />
					<Text className="text-xl font-semibold mb-2">Track Not Found</Text>
					<Text className="text-center opacity-70 mb-6">
						The track you're looking for doesn't exist or has been removed.
					</Text>
					<Button onPress={() => router.back()}>
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

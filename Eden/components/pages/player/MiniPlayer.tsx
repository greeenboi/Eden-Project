import { Music, Pause, Play, SkipBack, SkipForward } from "lucide-react-native";
import { ActivityIndicator, Image, Pressable } from "react-native";
import { View } from "@/components/Themed";
import { Card, CardContent } from "@/components/ui/card";
import { MarqueeText } from "@/components/ui/MarqueeText";
import { Text } from "@/components/ui/text";

interface MiniPlayerProps {
	trackId?: string;
	artworkUrl?: string | null;
	title: string;
	artistName: string;
	isPlaying: boolean;
	isLoaded: boolean;
	loadingStream: boolean;
	sliderValue: number;
	sliderMax: number;
	themeColors: {
		primary: string;
		muted: string;
		tint: string;
	};
	/** Whether there's a next track available in the queue */
	hasNext?: boolean;
	/** Whether there's a previous track available in the queue */
	hasPrevious?: boolean;
	/** Called when the mini player is tapped to expand */
	onExpand?: () => void;
	onTogglePlayback: () => void;
	/** Skip to next track in queue */
	onSkipNext?: () => void;
	/** Skip to previous track in queue */
	onSkipPrevious?: () => void;
	onSlidingStart: (value: number) => void;
	onValueChange: (value: number) => void;
	onSlidingComplete: (value: number) => void;
}

export function MiniPlayer({
	trackId,
	artworkUrl,
	title,
	artistName,
	isPlaying,
	isLoaded,
	loadingStream,
	sliderValue,
	sliderMax,
	themeColors,
	hasNext = false,
	hasPrevious = false,
	onExpand,
	onTogglePlayback,
	onSkipNext,
	onSkipPrevious,
	onSlidingStart,
	onValueChange,
	onSlidingComplete,
}: MiniPlayerProps) {
	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="flex-row items-center gap-3 px-4 py-3"
		>
			<Pressable
				onPress={onExpand}
				style={{ flexDirection: "row", flex: 1, alignItems: "center", gap: 12 }}
			>
				<Card className="w-14 h-14 p-0 overflow-hidden">
					<CardContent className="p-0 w-full h-full bg-primary/10">
						{artworkUrl ? (
							<Image
								source={{ uri: artworkUrl }}
								style={{ width: "100%", height: "100%" }}
								resizeMode="cover"
							/>
						) : (
							<Music size={28} className="text-primary opacity-60" />
						)}
					</CardContent>
				</Card>
				<View className="flex-1">
					<MarqueeText
						text={title}
						className="font-semibold text-foreground text-2xl"
						speed={40}
						delay={2500}
					/>
					<Text className="text-xs opacity-70" numberOfLines={1}>
						{artistName}
					</Text>
				</View>
			</Pressable>
			<View className="flex-row items-center gap-3">
				<Pressable
					onPress={onSkipPrevious}
					disabled={!hasPrevious}
					style={{ opacity: hasPrevious ? 1 : 0.4 }}
				>
					<SkipBack color={themeColors.tint} size={22} />
				</Pressable>
				<Pressable
					onPress={onTogglePlayback}
					disabled={!isLoaded || loadingStream}
				>
					<View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
						{isLoaded ? (
							isPlaying ? (
								<Pause
									color={themeColors.tint}
									size={24}
									className="text-primary-foreground"
								/>
							) : (
								<Play
									color={themeColors.tint}
									size={24}
									className="text-primary-foreground"
								/>
							)
						) : (
							<ActivityIndicator size="large" color={themeColors.tint} />
						)}
					</View>
				</Pressable>
				<Pressable
					onPress={onSkipNext}
					disabled={!hasNext}
					style={{ opacity: hasNext ? 1 : 0.4 }}
				>
					<SkipForward color={themeColors.tint} size={22} />
				</Pressable>
			</View>
		</View>
	);
}

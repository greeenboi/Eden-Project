import { View } from "@/components/Themed";
import {
	Pause,
	Play,
	Repeat,
	Shuffle,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from "lucide-react-native";
import { ActivityIndicator, Pressable } from "react-native";

interface PlayerControlsProps {
	isLoaded: boolean;
	isPlaying: boolean;
	isLooping: boolean;
	isMuted: boolean;
	loadingStream: boolean;
	themeColors: {
		tint: string;
		primary: string;
	};
	/** Whether there's a next track available in the queue */
	hasNext?: boolean;
	/** Whether there's a previous track available in the queue */
	hasPrevious?: boolean;
	/** Whether shuffle is enabled */
	isShuffled?: boolean;
	onTogglePlayback: () => void;
	onToggleLoop: () => void;
	onToggleMute: () => void;
	onToggleShuffle?: () => void;
	/** Skip to next track in queue */
	onSkipNext?: () => void;
	/** Skip to previous track in queue */
	onSkipPrevious?: () => void;
}

export function PlayerControls({
	isLoaded,
	isPlaying,
	isLooping,
	isMuted,
	loadingStream,
	themeColors,
	hasNext = false,
	hasPrevious = false,
	isShuffled = false,
	onTogglePlayback,
	onToggleLoop,
	onToggleMute,
	onToggleShuffle,
	onSkipNext,
	onSkipPrevious,
}: PlayerControlsProps) {
	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="flex-row items-center justify-center gap-6 mb-4"
		>
			<Pressable android_ripple={{ borderless: false, foreground: true }} onPress={onToggleShuffle}>
				<Shuffle
					size={24}
					color={isShuffled ? themeColors.primary : themeColors.tint}
					style={{ opacity: isShuffled ? 1 : 0.5 }}
				/>
			</Pressable>

			<Pressable android_ripple={{ borderless: false, foreground: true }} onPress={onToggleLoop}>
				<Repeat
					size={24}
					color={isLooping ? themeColors.primary : themeColors.tint}
					style={{ opacity: isLooping ? 1 : 0.5 }}
				/>
			</Pressable>

			<Pressable 
				android_ripple={{ borderless: false, foreground: true }}  
				onPress={onSkipPrevious} 
				disabled={!hasPrevious}
				style={{ opacity: hasPrevious ? 1 : 0.4 }}
			>
				<SkipBack color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable android_ripple={{ borderless: false, foreground: true }}   onPress={onTogglePlayback} disabled={!isLoaded || loadingStream}>
				<View
					style={{ backgroundColor: "transparent" }}
					className="w-16 h-16 rounded-full bg-primary items-center justify-center"
				>
					{isLoaded ? (
						isPlaying ? (
							<Pause
								size={32}
								color={themeColors.tint}
								className="text-primary-foreground"
							/>
						) : (
							<Play
								size={32}
								color={themeColors.tint}
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
				android_ripple={{ borderless: false, foreground: true }} 
				disabled={!hasNext}
				style={{ opacity: hasNext ? 1 : 0.4 }}
			>
				<SkipForward color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable android_ripple={{ borderless: false, foreground: true }}   onPress={onToggleMute}>
				{
					isMuted ?
						<VolumeX
							color={themeColors.tint}
							size={24}
							className={"opacity-50"}
						/>
					:
						<Volume2
							color={themeColors.tint}
							size={24}
						/>
				}
			</Pressable>
		</View>
	);
}

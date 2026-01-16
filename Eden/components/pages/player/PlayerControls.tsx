import { View } from "@/components/Themed";
import type { RepeatMode } from "@/lib/actions/queue";
import {
	Pause,
	Play,
	Repeat,
	Repeat1,
	Shuffle,
	SkipBack,
	SkipForward,
} from "lucide-react-native";
import { ActivityIndicator, Pressable } from "react-native";

interface PlayerControlsProps {
	isLoaded: boolean;
	isPlaying: boolean;
	isMuted?: boolean;
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
	/** Current repeat mode */
	repeatMode?: RepeatMode;
	onTogglePlayback: () => void;
	/** Toggle repeat mode (off -> all -> one -> off) */
	onToggleRepeat?: () => void;
	onToggleMute?: () => void;
	onToggleShuffle?: () => void;
	/** Skip to next track in queue */
	onSkipNext?: () => void;
	/** Skip to previous track in queue */
	onSkipPrevious?: () => void;
}

export function PlayerControls({
	isLoaded,
	isPlaying,
	isMuted,
	loadingStream,
	themeColors,
	hasNext = false,
	hasPrevious = false,
	isShuffled = false,
	repeatMode = "off",
	onTogglePlayback,
	onToggleRepeat,
	onToggleMute,
	onToggleShuffle,
	onSkipNext,
	onSkipPrevious,
}: PlayerControlsProps) {
	// Determine repeat icon and color based on repeat mode
	const isRepeatActive = repeatMode !== "off";
	const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="flex-row items-center justify-center gap-6 mb-4"
		>
			<Pressable onPress={onToggleRepeat} style={{  }}>
				{
					isRepeatActive ? 
					<Repeat1
						size={24}
						color={isRepeatActive ? themeColors.primary : themeColors.tint}
						style={{ opacity: isRepeatActive ? 1 : 0.8 }}
					/>
					:
					<RepeatIcon
						size={24}
						color={isRepeatActive ? themeColors.primary : themeColors.tint}
						style={{ opacity: isRepeatActive ? 1 : 0.8 }}
					/>
				}
			</Pressable>

			<Pressable
				
				onPress={onSkipPrevious}
				disabled={!hasPrevious}
				style={{ opacity: hasPrevious ? 1 : 0.5 }}
			>
				<SkipBack color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable
				
				onPress={onTogglePlayback}
				disabled={!isLoaded || loadingStream}
			>
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
				
				disabled={!hasNext}
				style={{ opacity: hasNext ? 1 : 0.4 }}
			>
				<SkipForward color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable onPress={onToggleShuffle}>
				<Shuffle
					size={24}
					color={isShuffled ? themeColors.primary : themeColors.tint}
					style={{ opacity: isShuffled ? 1 : 0.8 }}
				/>
			</Pressable>

			{/* <Pressable    onPress={onToggleMute}>
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
			</Pressable> */}
		</View>
	);
}

import { View } from "@/components/Themed";
import {
    Pause,
    Play,
    Repeat,
    SkipBack,
    SkipForward,
    Volume2,
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
	};
	onTogglePlayback: () => void;
	onToggleLoop: () => void;
	onToggleMute: () => void;
	onSeekForward: () => void;
	onSeekBackward: () => void;
}

export function PlayerControls({
	isLoaded,
	isPlaying,
	isLooping,
	isMuted,
	loadingStream,
	themeColors,
	onTogglePlayback,
	onToggleLoop,
	onToggleMute,
	onSeekForward,
	onSeekBackward,
}: PlayerControlsProps) {
	return (
		<View
			style={{ backgroundColor: "transparent" }}
			className="flex-row items-center justify-center gap-6 mb-4"
		>
			<Pressable onPress={onToggleLoop}>
				<Repeat
					size={24}
					color={themeColors.tint}
					className={isLooping ? "text-primary" : "opacity-50"}
				/>
			</Pressable>

			<Pressable onPress={onSeekBackward}>
				<SkipBack color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable onPress={onTogglePlayback} disabled={!isLoaded || loadingStream}>
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

			<Pressable onPress={onSeekForward}>
				<SkipForward color={themeColors.tint} size={32} />
			</Pressable>

			<Pressable onPress={onToggleMute}>
				<Volume2
					color={themeColors.tint}
					size={24}
					className={isMuted ? "opacity-50" : ""}
				/>
			</Pressable>
		</View>
	);
}

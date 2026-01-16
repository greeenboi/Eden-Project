import Slider from "@react-native-community/slider";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { formatDuration } from "@/lib/utils";

interface PlayerSliderProps {
	trackId?: string;
	sliderValue: number;
	sliderMax: number;
	duration?: number | null;
	isLoaded: boolean;
	loadingStream: boolean;
	themeColors: {
		primary: string;
		muted: string;
	};
	onSlidingStart: (value: number) => void;
	onValueChange: (value: number) => void;
	onSlidingComplete: (value: number) => void;
	variant?: "full" | "mini";
}

export function PlayerSlider({
	trackId,
	sliderValue,
	sliderMax,
	duration,
	isLoaded,
	loadingStream,
	themeColors,
	onSlidingStart,
	onValueChange,
	onSlidingComplete,
	variant = "full",
}: PlayerSliderProps) {
	if (variant === "mini") {
		return (
			<Slider
				key={`slider-mini-${trackId ?? "none"}`}
				style={{ width: "100%", height: 32 }}
				minimumValue={0}
				maximumValue={sliderMax}
				value={sliderValue}
				minimumTrackTintColor={themeColors.primary}
				maximumTrackTintColor={themeColors.muted}
				thumbTintColor={themeColors.primary}
				onSlidingStart={onSlidingStart}
				onValueChange={onValueChange}
				onSlidingComplete={onSlidingComplete}
				disabled={!isLoaded || loadingStream}
			/>
		);
	}

	return (
		<View style={{ backgroundColor: "transparent" }} className="px-8 pb-6">
			<Slider
				key={`slider-full-${trackId ?? "none"}`}
				style={{ width: "100%", height: 40 }}
				minimumValue={0}
				maximumValue={sliderMax}
				value={sliderValue}
				minimumTrackTintColor={themeColors.primary}
				maximumTrackTintColor={themeColors.muted}
				thumbTintColor={themeColors.primary}
				onSlidingStart={onSlidingStart}
				onValueChange={onValueChange}
				onSlidingComplete={onSlidingComplete}
				disabled={!isLoaded || loadingStream}
			/>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row justify-between"
			>
				<Text className="text-sm opacity-50">
					{formatDuration(sliderValue)}
				</Text>
				<Text className="text-sm opacity-50">
					{/* biome-ignore lint/style/noNonNullAssertion: <explanation> */}
					{formatDuration(duration!)}
				</Text>
			</View>
		</View>
	);
}

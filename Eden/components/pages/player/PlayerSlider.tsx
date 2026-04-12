import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { formatDuration } from "@/lib/utils";
import { Box, Host, Slider } from "@expo/ui/jetpack-compose";
import { Shapes, background, clip, fillMaxWidth, size } from "@expo/ui/jetpack-compose/modifiers";

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
		tint: string;
		accent: string;
	};
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
	onSlidingComplete,
	variant = "full",
}: PlayerSliderProps) {
	if (process.env.EXPO_OS !== "android") {
		return null;
	}

	const safeMax = Math.max(0, sliderMax || 0);
	const safeValue = Math.min(Math.max(sliderValue, 0), safeMax);
	const log = (...args: unknown[]) => console.log("[PlayerSlider]", ...args);

	const renderNativeSlider = (height: number) => {
		return (
			<Host matchContents style={{ width: "100%", height }}>
				<Box contentAlignment="center" modifiers={[fillMaxWidth(0.8)]}>
					<Slider
						value={safeValue}
						min={0}
						max={safeMax}
						enabled={isLoaded && !loadingStream && safeMax > 0}
						colors={{
							thumbColor: themeColors.primary,
							activeTickColor: themeColors.primary,
							inactiveTickColor: themeColors.muted,
							activeTrackColor: themeColors.primary,
							inactiveTrackColor: themeColors.muted,
						}}
						onValueChange={() => {}}
						onValueChangeFinished={(value?: number) => {
							const finalValue =
								typeof value === "number" && Number.isFinite(value)
									? Math.min(safeMax, Math.max(0, value))
									: safeValue;
							log("touch end", { trackId, finalValue });
							onSlidingComplete(finalValue);
						}}
					>
						<Slider.Thumb>
							<Box modifiers={[size(22, 22), clip(Shapes.Circle), background(themeColors.primary)]} />
						</Slider.Thumb>
					</Slider>
				</Box>
			</Host>
		);
	};

	if (variant === "mini") {
		return (
			<View key={`slider-mini-${trackId ?? "none"}`} style={{ width: "100%" }}>
				{renderNativeSlider(32)}
			</View>
		);
	}

	return (
		<View style={{ backgroundColor: "transparent" }} className="px-8 pb-6">
			<View key={`slider-full-${trackId ?? "none"}`}>{renderNativeSlider(40)}</View>
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

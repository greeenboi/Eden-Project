import { Text } from "@/components/ui/text";
import { formatDuration } from "@/lib/utils";
import { Box, Host, Slider } from "@expo/ui/jetpack-compose";
import { Shapes, background, clip, fillMaxWidth, size } from "@expo/ui/jetpack-compose/modifiers";
import { useProgress } from "@rntp/player";
import { useRef } from "react";
import { View } from "react-native";

interface PlayerSliderProps {
	trackId?: string;
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

// Poll progress at 250ms (4/sec) — smooth enough for a progress bar without the
// 10/sec re-render churn the old 100ms top-level subscription caused. Crucially
// this subscription lives HERE, in the leaf, so progress ticks no longer
// re-render PlayingSongContent / AnimatedPlayerContent / the controls.
const PROGRESS_INTERVAL_SECONDS = 0.25;

export function PlayerSlider({
	trackId,
	isLoaded,
	loadingStream,
	themeColors,
	onSlidingComplete,
	variant = "full",
}: PlayerSliderProps) {
	const { position, duration } = useProgress(PROGRESS_INTERVAL_SECONDS);
	const safeMax = Math.max(0, duration || 0);
	const safeValue = Math.min(Math.max(position, 0), safeMax);
	// onValueChangeFinished maps to Material3's no-arg callback, so it carries no
	// value. Capture the latest value from onValueChange during the drag and read
	// it back when the gesture finishes.
	const latestValueRef = useRef(safeValue);
	const log = (...args: unknown[]) => console.log("[PlayerSlider]", ...args);

	if (process.env.EXPO_OS !== "android") {
		return null;
	}

	const renderNativeSlider = (height: number) => {
		return (
			// useViewportSizeMeasurement gives Compose a *bounded* width to fill.
			// With matchContents the host measured at UNSPECIFIED width, so
			// fillMaxWidth collapsed to ~0 and only the fixed-size thumb showed.
			<Host useViewportSizeMeasurement style={{ width: "100%", height }}>
				<Box contentAlignment="center" modifiers={[fillMaxWidth()]}>
					<Slider
						value={safeValue}
						min={0}
						max={safeMax}
						enabled={isLoaded && !loadingStream && safeMax > 0}
						modifiers={[fillMaxWidth()]}
						colors={{
							thumbColor: themeColors.primary,
							activeTickColor: themeColors.primary,
							inactiveTickColor: themeColors.muted,
							activeTrackColor: themeColors.primary,
							inactiveTrackColor: themeColors.muted,
						}}
						onValueChange={(value) => {
							latestValueRef.current = Math.min(safeMax, Math.max(0, value));
						}}
						onValueChangeFinished={() => {
							const finalValue = latestValueRef.current;
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
			<View key={`slider-mini-${trackId ?? "none"}`} style={{ width: "100%", paddingBottom: 2 }}>
				{renderNativeSlider(32)}
			</View>
		);
	}

	return (
		<View style={{ backgroundColor: "transparent" }} className="px-8 pb-6">
			<View key={`slider-full-${trackId ?? "none"}`} style={{ backgroundColor: "transparent" }}>{renderNativeSlider(40)}</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row justify-between"
			>
				<Text
					className="text-sm opacity-50"
					style={{ fontVariant: ["tabular-nums"] }}
				>
					{formatDuration(safeValue)}
				</Text>
				<Text
					className="text-sm opacity-50"
					style={{ fontVariant: ["tabular-nums"] }}
				>
					{formatDuration(safeMax)}
				</Text>
			</View>
		</View>
	);
}

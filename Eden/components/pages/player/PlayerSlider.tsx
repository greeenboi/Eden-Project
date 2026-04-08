import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { formatDuration } from "@/lib/utils";
import { Box, Host, Shape, Slider } from "@expo/ui/jetpack-compose";
import { size, width } from "@expo/ui/jetpack-compose/modifiers";
import { useEffect, useRef } from "react";

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
	if (process.env.EXPO_OS !== "android") {
		return null;
	}

	const lastKnownValueRef = useRef(sliderValue);
	const safeMax = Math.max(0, sliderMax || 0);
	const safeValue = Math.min(Math.max(sliderValue, 0), safeMax);

	useEffect(() => {
		lastKnownValueRef.current = sliderValue;
	}, [sliderValue]);

	const handleValueChange = (value: number) => {
		lastKnownValueRef.current = value;
		onValueChange(value);
	};

	const isEditingRef = useRef(false);

	const renderNativeSlider = (height: number) => {
		return (
			<Host matchContents>
				<Box contentAlignment="center" modifiers={[width(280)]}>
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
						onValueChange={(value: number) => {
							if (!isEditingRef.current) {
								isEditingRef.current = true;
								onSlidingStart(value);
							}
							handleValueChange(value);
						}}
						onValueChangeFinished={() => {
							if (!isEditingRef.current) {
								return;
							}
							isEditingRef.current = false;
							onSlidingComplete(lastKnownValueRef.current);
						}}
					>
						<Slider.Thumb>
							<Shape.Circle radius={2} color={themeColors.primary} modifiers={[size(12, 12)]} />
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

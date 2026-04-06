import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { formatDuration } from "@/lib/utils";
import { type ComponentType, useEffect, useMemo, useRef } from "react";

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
	const lastKnownValueRef = useRef(sliderValue);

	useEffect(() => {
		lastKnownValueRef.current = sliderValue;
	}, [sliderValue]);

	const handleValueChange = (value: number) => {
		lastKnownValueRef.current = value;
		onValueChange(value);
	};

	const isEditingRef = useRef(false);

	const composeSlider =
		process.env.EXPO_OS === "android"
			? (require("@expo/ui/jetpack-compose").Slider as ComponentType<{
					value?: number;
					min?: number;
					max?: number;
					enabled?: boolean;
					colors?: {
						thumbColor?: string;
						activeTrackColor?: string;
						inactiveTrackColor?: string;
					};
					onValueChange?: (value: number) => void;
					onValueChangeFinished?: () => void;
					style?: { width: "100%"; height: number };
			  }>)
			: null;

	const swiftSlider = useMemo(
		() =>
			process.env.EXPO_OS === "ios"
				? (require("@expo/ui/swift-ui").Slider as ComponentType<{
						value?: number;
						min?: number;
						max?: number;
						onValueChange?: (value: number) => void;
						onEditingChanged?: (isEditing: boolean) => void;
						style?: { width: "100%"; height: number };
				  }>)
				: null,
		[],
	);

	const renderNativeSlider = (height: number) => {
		if (composeSlider) {
			const ComposeSlider = composeSlider;
			return (
				<ComposeSlider
					value={sliderValue}
					min={0}
					max={sliderMax}
					enabled={isLoaded && !loadingStream}
					colors={{
						thumbColor: themeColors.primary,
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
						isEditingRef.current = false;
						onSlidingComplete(lastKnownValueRef.current);
					}}
					style={{ width: "100%", height }}
				/>
			);
		}

		if (swiftSlider) {
			const SwiftSlider = swiftSlider;
			return (
				<SwiftSlider
					value={sliderValue}
					min={0}
					max={sliderMax}
					onValueChange={handleValueChange}
					onEditingChanged={(isEditing: boolean) => {
						if (isEditing) {
							onSlidingStart(lastKnownValueRef.current);
							return;
						}
						onSlidingComplete(lastKnownValueRef.current);
					}}
					style={{ width: "100%", height }}
				/>
			);
		}

		return null;
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

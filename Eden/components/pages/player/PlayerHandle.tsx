import Colors from "@/constants/Colors";
import type { BottomSheetHandleProps } from "@gorhom/bottom-sheet";
import type React from "react";
import {
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
	useColorScheme,
} from "react-native";

type PlayerHandleProps = BottomSheetHandleProps & {
	style?: StyleProp<ViewStyle>;
};

/**
 * Minimal drag handle for the player sheet. The progress slider that used to
 * live here was moved into the mini player content (AnimatedPlayerContent),
 * where dragging to seek no longer competes with the sheet's pan gesture.
 */
const PlayerHandle: React.FC<PlayerHandleProps> = ({ style }) => {
	const colorScheme = useColorScheme();
	const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;

	return (
		<View
			style={[
				styles.header,
				{
					backgroundColor: themeColors.card,
					borderBottomColor: themeColors.border,
				},
				style,
			]}
		>
			<View
				style={[styles.grabber, { backgroundColor: themeColors.mutedForeground }]}
			/>
		</View>
	);
};

export default PlayerHandle;

const styles = StyleSheet.create({
	header: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	grabber: {
		width: 36,
		height: 4,
		borderRadius: 2,
		opacity: 0.5,
	},
});

import { BlurView, type BlurViewProps } from "expo-blur";
import { forwardRef } from "react";
import useIsDark from "@/lib/hooks/isdark";

export interface BlurSurfaceProps extends Omit<BlurViewProps, "tint"> {
	/** Override intensity. Defaults to 40. */
	intensity?: number;
	/** Override tint. Defaults to the active color scheme. */
	tint?: BlurViewProps["tint"];
}

export const BlurSurface = forwardRef<BlurView, BlurSurfaceProps>(
	function BlurSurface({ intensity = 40, tint, style, children, ...rest }, ref) {
		const isDark = useIsDark();
		const resolvedTint: BlurViewProps["tint"] =
			tint ?? (isDark ? "dark" : "light");

		return (
			<BlurView
				ref={ref}
				intensity={intensity}
				tint={resolvedTint}
				style={style}
				{...rest}
			>
				{children}
			</BlurView>
		);
	},
);

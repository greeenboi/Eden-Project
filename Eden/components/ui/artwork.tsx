import { Image, type ImageProps } from "expo-image";

/**
 * Shared artwork image. A thin wrapper over expo-image that applies the app's
 * caching + fit defaults so every cover / thumbnail behaves consistently:
 * disk+memory caching (no re-decode on scroll), cover fit, and a subtle
 * cross-fade. Every expo-image prop passes through and overrides the defaults
 * — e.g. `contentFit="contain"`, `blurRadius`, `placeholder`, or `recyclingKey`
 * (pass the track/album id as `recyclingKey` inside FlashLists to avoid the
 * previous image flashing during cell recycling).
 */
export function Artwork({
	contentFit = "cover",
	cachePolicy = "memory-disk",
	transition = 150,
	...props
}: ImageProps) {
	return (
		<Image
			contentFit={contentFit}
			cachePolicy={cachePolicy}
			transition={transition}
			{...props}
		/>
	);
}

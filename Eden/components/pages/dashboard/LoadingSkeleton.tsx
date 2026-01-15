import { View } from "@/components/Themed";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
	return (
		<View style={{ backgroundColor: "transparent" }} className="flex-1 p-4">
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<Skeleton className="flex-1 h-64" />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<Skeleton className="flex-1 h-44" />
				<Skeleton className="flex-1 h-44" />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2 mb-2"
			>
				<Skeleton className="flex-1 h-64" />
			</View>
			<View
				style={{ backgroundColor: "transparent" }}
				className="flex-row gap-2"
			>
				<Skeleton className="flex-1 h-44" />
				<Skeleton className="flex-1 h-44" />
			</View>
		</View>
	);
}

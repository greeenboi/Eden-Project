import { View } from "@/components/Themed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { User } from "lucide-react-native";

interface ArtistCardProps {
	artistName: string;
	verified?: boolean;
}

export function ArtistCard({ artistName, verified }: ArtistCardProps) {
	return (
		<Card className="mt-4">
			<CardContent className="py-3">
				<View
					style={{ backgroundColor: "transparent" }}
					className="flex-row items-center gap-3"
				>
					<View
						style={{ backgroundColor: "transparent" }}
						className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center"
					>
						<User size={24} className="text-primary" />
					</View>
					<View
						style={{ backgroundColor: "transparent" }}
						className="flex-1"
					>
						<Text className="text-sm opacity-70">Artist</Text>
						<Text className="font-semibold">{artistName}</Text>
					</View>
					{verified && (
						<Badge variant="default">
							<Text className="text-xs">✓ Verified</Text>
						</Badge>
					)}
				</View>
			</CardContent>
		</Card>
	);
}

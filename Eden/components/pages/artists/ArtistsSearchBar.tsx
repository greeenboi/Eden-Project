import { X } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {View} from "react-native";

interface ArtistsSearchBarProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onClear: () => void;
	isSearchMode: boolean;
}

export function ArtistsSearchBar({
	searchQuery,
	onSearchChange,
	onClear,
}: ArtistsSearchBarProps) {
	return (
		<View className="bg-transparent flex-row items-center gap-2">
			<Input
				placeholder="Search artists..."
				value={searchQuery}
				onChangeText={onSearchChange}
				className="flex-1"
			/>
			{searchQuery.length > 0 && (
				<Button variant="ghost" size="sm" onPress={onClear}>
					<X size={20} />
				</Button>
			)}
		</View>
	);
}

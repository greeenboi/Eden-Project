import { View } from "@/components/Themed";
import {
	ArtistCard,
	ArtistsHeader,
	ArtistsSearchBar,
} from "@/components/pages/artists";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Toggle, ToggleIcon } from "@/components/ui/toggle";
import {
	type Artist,
	type ArtistPagination,
	fetchArtists,
	searchArtists,
} from "@/lib/actions/artists";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { AlertCircle, LayoutGrid, LayoutList } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ArtistsScreen() {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [showNames, setShowNames] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Local state instead of store
	const [artists, setArtists] = useState<Artist[]>([]);
	const [searchResults, setSearchResults] = useState<Artist[]>([]);
	const [pagination, setPagination] = useState<ArtistPagination | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const loadArtists = useCallback(async (page = 1) => {
		// Cancel previous request
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsLoading(true);
		setError(null);

		try {
			const data = await fetchArtists(page, 20, null, controller.signal);
			setArtists((prev) =>
				page === 1 ? data.artists : [...prev, ...data.artists],
			);
			setPagination(data.pagination);
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(err instanceof Error ? err.message : "Failed to fetch artists");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const doSearch = useCallback(async (query: string) => {
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsLoading(true);
		setError(null);

		try {
			const data = await searchArtists(query, 20, controller.signal);
			setSearchResults(data.artists);
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(err instanceof Error ? err.message : "Failed to search artists");
			setSearchResults([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadArtists();
		return () => abortControllerRef.current?.abort();
	}, [loadArtists]);

	// Debounced search
	useEffect(() => {
		if (searchQuery.trim().length > 0) {
			const timer = setTimeout(() => {
				setIsSearchMode(true);
				doSearch(searchQuery);
			}, 500);
			return () => clearTimeout(timer);
		}
		setIsSearchMode(false);
		setSearchResults([]);
	}, [searchQuery, doSearch]);

	const displayArtists = isSearchMode ? searchResults : artists;

	const handleArtistPress = useCallback((artistId: string) => {
		router.push(`/artist-detail?id=${artistId}`);
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchQuery("");
		setIsSearchMode(false);
		setSearchResults([]);
	}, []);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			if (isSearchMode && searchQuery.trim().length > 0) {
				await doSearch(searchQuery);
			} else {
				await loadArtists(1);
			}
		} finally {
			setIsRefreshing(false);
		}
	}, [isSearchMode, searchQuery, doSearch, loadArtists]);

	const handleLoadMore = useCallback(() => {
		if (
			!isSearchMode &&
			pagination &&
			pagination.page * pagination.limit < pagination.total &&
			!isLoading
		) {
			loadArtists(pagination.page + 1);
		}
	}, [isSearchMode, pagination, isLoading, loadArtists]);

	const renderArtist = useCallback(
		({ item }: { item: Artist }) => (
			<ArtistCard
				artist={item}
				onPress={handleArtistPress}
				showName={showNames}
			/>
		),
		[handleArtistPress, showNames],
	);

	const renderHeader = useCallback(
		() => (
			<View className="bg-transparent py-2">
				{/* Error Alert */}
				{error && (
					<Alert icon={AlertCircle} variant="destructive" className="mb-3">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Search Bar */}
				<ArtistsSearchBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					onClear={handleClearSearch}
					isSearchMode={isSearchMode}
				/>

				{/* Results count and toggle */}
				{!isLoading && displayArtists.length > 0 && (
					<View className="flex-row items-center justify-between mt-2 mb-1 px-1.5 bg-transparent">
						<Text className="text-sm opacity-60">
							{isSearchMode
								? `${displayArtists.length} result${displayArtists.length !== 1 ? "s" : ""}`
								: `${pagination?.total ?? displayArtists.length} artists`}
						</Text>
						<Toggle
							aria-label="Toggle view mode"
							pressed={showNames}
							onPressedChange={setShowNames}
							variant="outline"
							size="sm"
						>
							<ToggleIcon as={showNames ? LayoutList : LayoutGrid} size={18} />
						</Toggle>
					</View>
				)}
			</View>
		),
		[
			error,
			searchQuery,
			handleClearSearch,
			isSearchMode,
			isLoading,
			displayArtists.length,
			pagination?.total,
			showNames,
		],
	);

	const renderFooter = useCallback(() => {
		if (isLoading && displayArtists.length > 0) {
			return (
				<View className="flex-row justify-center py-4 gap-3">
					<Skeleton className="flex-1 min-w-[150px] h-[140px] rounded-xl" />
					<Skeleton className="flex-1 min-w-[150px] h-[140px] rounded-xl" />
				</View>
			);
		}

		if (
			!isSearchMode &&
			pagination &&
			pagination.page * pagination.limit < pagination.total
		) {
			return (
				<View className="flex-row justify-center py-4 gap-3">
					<Button variant="outline" onPress={handleLoadMore}>
						<Text>Load More</Text>
					</Button>
				</View>
			);
		}

		return null;
	}, [
		isLoading,
		displayArtists.length,
		isSearchMode,
		pagination,
		handleLoadMore,
	]);

	const renderEmpty = useCallback(() => {
		if (isLoading) {
			return (
				<View className="flex-row flex-wrap px-1.5 gap-3">
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
					<Skeleton className="flex-1 min-w-[150px] h-[160px] rounded-full" />
				</View>
			);
		}

		return (
			<View className="flex-1 items-center justify-center py-12">
				<Text className="text-base opacity-60 text-center">
					{searchQuery
						? "No artists found matching your search"
						: "No artists available"}
				</Text>
			</View>
		);
	}, [isLoading, searchQuery]);

	return (
		<SafeAreaView className="flex-1">
			<View className="flex-1">
				<ArtistsHeader />
				<FlashList
					key={showNames ? "list" : "grid"}
					data={displayArtists}
					renderItem={renderArtist}
					keyExtractor={(item) => item.id}
					numColumns={showNames ? 1 : 2}
					ListHeaderComponent={renderHeader}
					ListFooterComponent={renderFooter}
					ListEmptyComponent={renderEmpty}
					contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 100 }}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={handleRefresh}
						/>
					}
					// estimatedItemSize={showNames ? 70 : 180}
				/>
			</View>
		</SafeAreaView>
	);
}

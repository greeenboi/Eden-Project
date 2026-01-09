import { PlayingSongContent } from "@/components/pages/PlayingSongContent";
import PlayerHandle from "@/components/ui/PlayerHandle";
import { type QueueSource, type QueueTrack, type RepeatMode, type ShuffleMode, useQueueStore } from "@/lib/actions/queue";
import useIsDark from "@/lib/hooks/isdark";
import { THEME } from "@/lib/theme";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetScrollView,
	useBottomSheet,
} from "@gorhom/bottom-sheet";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

interface GlobalPlayerContextValue {
	/** Currently selected track ID */
	selectedTrackId: string | null;
	/** Current sheet snap index (0 = mini, 1 = full) */
	sheetIndex: number;
	/** Whether the player is visible */
	isPlayerVisible: boolean;
	/** Play a track by ID - opens the player sheet (single track, no queue) */
	playTrack: (trackId: string) => void;
	/** Play a track with queue context */
	playTrackWithQueue: (track: QueueTrack, queue: QueueTrack[], startIndex?: number, source?: QueueSource) => void;
	/** Skip to next track in queue */
	skipToNext: () => void;
	/** Skip to previous track in queue */
	skipToPrevious: () => void;
	/** Add a track to end of queue */
	addToQueue: (track: QueueTrack) => void;
	/** Add a track to play next */
	addNext: (track: QueueTrack) => void;
	/** Remove a track from queue by ID */
	removeFromQueue: (trackId: string) => void;
	/** Toggle shuffle mode */
	toggleShuffle: () => void;
	/** Toggle repeat mode */
	toggleRepeat: () => void;
	/** Dismiss the player sheet */
	dismissPlayer: () => void;
	/** Expand the player to full view */
	expandPlayer: () => void;
	/** Collapse the player to mini view */
	collapsePlayer: () => void;
	/** Toggle between mini and full view */
	togglePlayerExpand: () => void;
	/** Check if there's a next track */
	hasNext: boolean;
	/** Check if there's a previous track */
	hasPrevious: boolean;
	/** Handle track end - for auto-advancement */
	onTrackEnd: () => void;
	/** Current queue of tracks */
	queue: QueueTrack[];
	/** Current index in queue */
	currentIndex: number;
	/** Upcoming tracks in queue */
	upcomingTracks: QueueTrack[];
	/** Current repeat mode */
	repeatMode: RepeatMode;
	/** Current shuffle mode */
	shuffleMode: ShuffleMode;
	/** Queue source context */
	queueSource: QueueSource | null;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextValue | null>(null);

/**
 * Hook to access the global player context
 * Must be used within a GlobalPlayerProvider
 */
export function useGlobalPlayer() {
	const context = useContext(GlobalPlayerContext);
	if (!context) {
		throw new Error("useGlobalPlayer must be used within a GlobalPlayerProvider");
	}
	return context;
}

/**
 * Hook to safely access global player (returns null if not in provider)
 * Use this when you're not sure if you're in a provider context
 */
export function useGlobalPlayerSafe() {
	return useContext(GlobalPlayerContext);
}

interface GlobalPlayerProviderProps {
	children: ReactNode;
}

// Auto-expand the sheet to the target snap point when the content mounts
function AutoExpandOnMount({ targetIndex }: { targetIndex: number }) {
	const { snapToIndex } = useBottomSheet();

	useEffect(() => {
		snapToIndex(targetIndex);
	}, [snapToIndex, targetIndex]);

	return null;
}

/**
 * Provider component that wraps the app with global player functionality.
 * Renders a BottomSheetModal that persists across route navigations.
 */
export function GlobalPlayerProvider({ children }: GlobalPlayerProviderProps) {
	const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
	const [sheetIndex, setSheetIndex] = useState(0);
	const [isPlayerVisible, setIsPlayerVisible] = useState(false);
	const [isSheetMounted, setIsSheetMounted] = useState(false);
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const isDark = useIsDark();

	// Queue store integration
	const queueStore = useQueueStore();

	const snapPoints = useMemo(() => ["20%", "98%"], []);
	const FULL_SNAP_INDEX = snapPoints.length - 1;
	const MINI_SNAP_INDEX = 0;

	// Mount the sheet on first render so it's ready when needed
	useEffect(() => {
		if (!isSheetMounted) {
			bottomSheetRef.current?.present();
			setIsSheetMounted(true);
		}
	}, [isSheetMounted]);

	const playTrack = useCallback(
		(trackId: string) => {
			setSelectedTrackId(trackId);
			setIsPlayerVisible(true);
			bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
		},
		[FULL_SNAP_INDEX]
	);

	const playTrackWithQueue = useCallback(
		(track: QueueTrack, queue: QueueTrack[], startIndex = 0, source?: QueueSource) => {
			// Set the queue first with source context
			queueStore.setQueue(queue, startIndex, source);
			// Then play the track
			setSelectedTrackId(track.id);
			setIsPlayerVisible(true);
			bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
		},
		[FULL_SNAP_INDEX, queueStore]
	);

	const skipToNext = useCallback(() => {
		const nextTrack = queueStore.skipToNext();
		if (nextTrack) {
			setSelectedTrackId(nextTrack.id);
		}
	}, [queueStore]);

	const skipToPrevious = useCallback(() => {
		const prevTrack = queueStore.skipToPrevious();
		if (prevTrack) {
			setSelectedTrackId(prevTrack.id);
		}
	}, [queueStore]);

	const addToQueue = useCallback((track: QueueTrack) => {
		queueStore.addToQueue(track);
	}, [queueStore]);

	const addNext = useCallback((track: QueueTrack) => {
		queueStore.addNext(track);
	}, [queueStore]);

	const removeFromQueue = useCallback((trackId: string) => {
		queueStore.removeFromQueueById(trackId);
	}, [queueStore]);

	const toggleShuffle = useCallback(() => {
		queueStore.toggleShuffle();
	}, [queueStore]);

	const toggleRepeat = useCallback(() => {
		queueStore.toggleRepeatMode();
	}, [queueStore]);

	const onTrackEnd = useCallback(() => {
		// Auto-advance to next track when current track ends
		const nextTrack = queueStore.skipToNext();
		if (nextTrack) {
			setSelectedTrackId(nextTrack.id);
		} else {
			// Queue finished, collapse to mini player
			bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
		}
	}, [queueStore]);

	const hasNext = queueStore.hasNext();
	const hasPrevious = queueStore.hasPrevious();
	const queue = queueStore.queue;
	const currentIndex = queueStore.currentIndex;
	const upcomingTracks = queueStore.getUpcoming();
	const repeatMode = queueStore.repeatMode;
	const shuffleMode = queueStore.shuffleMode;
	const queueSource = queueStore.queueSource;

	// Get next/previous track artwork for swipe preview
	const nextTrackArtwork = hasNext && currentIndex < queue.length - 1 
		? queue[currentIndex + 1]?.artworkUrl 
		: null;
	const previousTrackArtwork = hasPrevious && currentIndex > 0 
		? queue[currentIndex - 1]?.artworkUrl 
		: null;

	const dismissPlayer = useCallback(() => {
		bottomSheetRef.current?.dismiss();
		setIsPlayerVisible(false);
		setSelectedTrackId(null);
		setSheetIndex(0);
		queueStore.clearQueue();
	}, [queueStore]);

	const expandPlayer = useCallback(() => {
		bottomSheetRef.current?.expand();
	}, []);

	const collapsePlayer = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
	}, []);

	const togglePlayerExpand = useCallback(() => {
		if (sheetIndex === FULL_SNAP_INDEX) {
			collapsePlayer();
		} else {
			expandPlayer();
		}
	}, [sheetIndex, FULL_SNAP_INDEX, collapsePlayer, expandPlayer]);

	const handleSheetChange = useCallback((index: number) => {
		setSheetIndex(index);
		if (index === -1) {
			setIsPlayerVisible(false);
		}
	}, []);

	const handleSheetDismiss = useCallback(() => {
		setIsPlayerVisible(false);
		setSelectedTrackId(null);
		setSheetIndex(0);
	}, []);

	const contextValue = useMemo<GlobalPlayerContextValue>(
		() => ({
			selectedTrackId,
			sheetIndex,
			isPlayerVisible,
			playTrack,
			playTrackWithQueue,
			skipToNext,
			skipToPrevious,
			addToQueue,
			addNext,
			removeFromQueue,
			toggleShuffle,
			toggleRepeat,
			dismissPlayer,
			expandPlayer,
			collapsePlayer,
			togglePlayerExpand,
			hasNext,
			hasPrevious,
			onTrackEnd,
			queue,
			currentIndex,
			upcomingTracks,
			repeatMode,
			shuffleMode,
			queueSource,
		}),
		[
			selectedTrackId,
			sheetIndex,
			isPlayerVisible,
			playTrack,
			playTrackWithQueue,
			skipToNext,
			skipToPrevious,
			addToQueue,
			addNext,
			removeFromQueue,
			toggleShuffle,
			toggleRepeat,
			dismissPlayer,
			expandPlayer,
			collapsePlayer,
			togglePlayerExpand,
			hasNext,
			hasPrevious,
			onTrackEnd,
			queue,
			currentIndex,
			upcomingTracks,
			repeatMode,
			shuffleMode,
			queueSource,
		]
	);

	return (
		<GlobalPlayerContext.Provider value={contextValue}>
			<BottomSheetModalProvider>
				{children}
				<BottomSheetModal
					ref={bottomSheetRef}
					snapPoints={snapPoints}
					handleComponent={PlayerHandle}
					index={-1}
					overDragResistanceFactor={3}
					enablePanDownToClose={false}
					onChange={handleSheetChange}
					onDismiss={handleSheetDismiss}
					enableOverDrag={false}
					backgroundStyle={{
						backgroundColor: isDark
							? THEME.dark.background
							: THEME.light.background,
					}}
					handleIndicatorStyle={{
						backgroundColor: isDark
							? THEME.dark.primary
							: THEME.light.primary,
					}}
					animateOnMount
				>
					<BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
						{isPlayerVisible && (
							<>
								<AutoExpandOnMount targetIndex={FULL_SNAP_INDEX} />
								<PlayingSongContent
									trackId={selectedTrackId ?? undefined}
									onClose={dismissPlayer}
									onTrackEnd={onTrackEnd}
									variant={sheetIndex === MINI_SNAP_INDEX ? "mini" : "full"}
									onSkipNext={skipToNext}
									onSkipPrevious={skipToPrevious}
									onToggleShuffle={toggleShuffle}
									onExpand={expandPlayer}								onCollapse={collapsePlayer}									hasNext={hasNext}
									hasPrevious={hasPrevious}
									isShuffled={shuffleMode === "on"}
									nextArtworkUrl={nextTrackArtwork}
									previousArtworkUrl={previousTrackArtwork}
								/>
							</>
						)}
					</BottomSheetScrollView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GlobalPlayerContext.Provider>
	);
}

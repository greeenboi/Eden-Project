import { PlayingSongContent } from "@/components/pages/PlayingSongContent";
import PlayerHandle from "@/components/pages/player/PlayerHandle";
import {
	type QueueSource,
	type QueueTrack,
	type RepeatMode,
	type ShuffleMode,
	selectCurrentIndex,
	selectHasNext,
	selectHasPrevious,
	selectQueue,
	selectQueueSource,
	selectRepeatMode,
	selectShuffleMode,
	useQueueStore,
} from "@/lib/actions/queue";
import useIsDark from "@/lib/hooks/isdark";
import {
	rebuildRntpQueueWindow,
	shiftWindowToActive,
} from "@/lib/services/track-player-adapter";
import { THEME } from "@/lib/theme";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetScrollView,
	useBottomSheet,
} from "@gorhom/bottom-sheet";
import TrackPlayer, { Event } from "@rntp/player";
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
import { BackHandler } from "react-native";

interface GlobalPlayerActionsContextValue {
	/** Play a track by ID - opens the player sheet (single track, no queue) */
	playTrack: (trackId: string) => void;
	/** Play a track with queue context */
	playTrackWithQueue: (
		track: QueueTrack,
		queue: QueueTrack[],
		startIndex?: number,
		source?: QueueSource,
	) => void;
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
	/** Handle track end - for auto-advancement */
	onTrackEnd: () => void;
}

interface GlobalPlayerStateContextValue {
	/** Currently selected track ID */
	selectedTrackId: string | null;
	/** Current sheet snap index (0 = mini, 1 = full) */
	sheetIndex: number;
	/** Whether the player is visible */
	isPlayerVisible: boolean;
	/** Check if there's a next track */
	hasNext: boolean;
	/** Check if there's a previous track */
	hasPrevious: boolean;
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

type GlobalPlayerContextValue = GlobalPlayerActionsContextValue &
	GlobalPlayerStateContextValue;

const GlobalPlayerActionsContext =
	createContext<GlobalPlayerActionsContextValue | null>(null);
const GlobalPlayerStateContext =
	createContext<GlobalPlayerStateContextValue | null>(null);

/**
 * Hook to access the global player context
 * Must be used within a GlobalPlayerProvider
 */
export function useGlobalPlayer() {
	const actions = useContext(GlobalPlayerActionsContext);
	const state = useContext(GlobalPlayerStateContext);
	if (!actions || !state) {
		throw new Error(
			"useGlobalPlayer must be used within a GlobalPlayerProvider",
		);
	}

	return useMemo(
		() => ({ ...actions, ...state }),
		[actions, state],
	);
}

export function useGlobalPlayerActions() {
	const context = useContext(GlobalPlayerActionsContext);
	if (!context) {
		throw new Error(
			"useGlobalPlayerActions must be used within a GlobalPlayerProvider",
		);
	}
	return context;
}

export function useGlobalPlayerState() {
	const context = useContext(GlobalPlayerStateContext);
	if (!context) {
		throw new Error(
			"useGlobalPlayerState must be used within a GlobalPlayerProvider",
		);
	}
	return context;
}

/**
 * Hook to safely access global player (returns null if not in provider)
 * Use this when you're not sure if you're in a provider context
 */
export function useGlobalPlayerSafe() {
	const actions = useContext(GlobalPlayerActionsContext);
	const state = useContext(GlobalPlayerStateContext);
	if (!actions || !state) return null;
	return { ...actions, ...state };
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

	const setQueue = useQueueStore((state) => state.setQueue);
	const skipToNextInQueue = useQueueStore((state) => state.skipToNext);
	const skipToPreviousInQueue = useQueueStore((state) => state.skipToPrevious);
	const addTrackToQueue = useQueueStore((state) => state.addToQueue);
	const addTrackNext = useQueueStore((state) => state.addNext);
	const removeFromQueueById = useQueueStore(
		(state) => state.removeFromQueueById,
	);
	const toggleQueueShuffle = useQueueStore((state) => state.toggleShuffle);
	const toggleQueueRepeat = useQueueStore((state) => state.toggleRepeatMode);
	const clearQueue = useQueueStore((state) => state.clearQueue);

	const hasNext = useQueueStore(selectHasNext);
	const hasPrevious = useQueueStore(selectHasPrevious);
	const queue = useQueueStore(selectQueue);
	const currentIndex = useQueueStore(selectCurrentIndex);
	const repeatMode = useQueueStore(selectRepeatMode);
	const shuffleMode = useQueueStore(selectShuffleMode);
	const queueSource = useQueueStore(selectQueueSource);

	const snapPoints = useMemo(() => ["20%", "98%"], []);
	const FULL_SNAP_INDEX = snapPoints.length - 1;
	const MINI_SNAP_INDEX = 0;

	const handleHardwareBackPress = useCallback(() => {
		if (!isPlayerVisible) {
			// Let React Navigation/default Android back behavior run.
			return false;
		}

		if (sheetIndex === FULL_SNAP_INDEX) {
			bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
			return true;
		}

		if (sheetIndex === MINI_SNAP_INDEX) {
			// Alert.alert("Hold on!", "Do you want to exit the app?", [
			// 	{
			// 		text: "Cancel",
			// 		onPress: () => null,
			// 		style: "cancel",
			// 	},
			// 	{ text: "YES", onPress: () => BackHandler.exitApp() },
			// ]);
			// replace with something else later
			return false;
		}

		bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
		return true;
	}, [
		isPlayerVisible,
		sheetIndex,
		FULL_SNAP_INDEX,
	]);

	useEffect(() => {
		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			handleHardwareBackPress,
		);

		return () => backHandler.remove();
	}, [handleHardwareBackPress]);

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
			setSheetIndex(FULL_SNAP_INDEX);
			bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
		},
		[FULL_SNAP_INDEX],
	);

	const playTrackWithQueue = useCallback(
		(
			track: QueueTrack,
			queue: QueueTrack[],
			startIndex = 0,
			source?: QueueSource,
		) => {
			// Set the queue first with source context
			setQueue(queue, startIndex, source);
			// Then play the track
			setSelectedTrackId(track.id);
			setIsPlayerVisible(true);
			setSheetIndex(FULL_SNAP_INDEX);
			bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
		},
		[FULL_SNAP_INDEX, setQueue],
	);

	const skipToNext = useCallback(() => {
		// Prefer RNTP's native skip — MediaItemTransition will sync zustand and
		// reshape the window without resetting playback. Falls back to zustand
		// if we're at the edge of RNTP's window.
		const rntpQueue = TrackPlayer.getQueue();
		const activeIdx = TrackPlayer.getActiveMediaItemIndex();
		if (activeIdx !== null && activeIdx < rntpQueue.length - 1) {
			TrackPlayer.skipToNext();
			return;
		}
		const nextTrack = skipToNextInQueue();
		if (nextTrack) setSelectedTrackId(nextTrack.id);
	}, [skipToNextInQueue]);

	const skipToPrevious = useCallback(() => {
		const rntpQueue = TrackPlayer.getQueue();
		const activeIdx = TrackPlayer.getActiveMediaItemIndex();
		if (activeIdx !== null && activeIdx > 0) {
			TrackPlayer.skipToPrevious();
			return;
		}
		const prevTrack = skipToPreviousInQueue();
		if (prevTrack) setSelectedTrackId(prevTrack.id);
	}, [skipToPreviousInQueue]);

	const addToQueue = useCallback(
		(track: QueueTrack) => {
			addTrackToQueue(track);
		},
		[addTrackToQueue],
	);

	const addNext = useCallback(
		(track: QueueTrack) => {
			addTrackNext(track);
		},
		[addTrackNext],
	);

	const removeFromQueue = useCallback(
		(trackId: string) => {
			removeFromQueueById(trackId);
		},
		[removeFromQueueById],
	);

	const toggleShuffle = useCallback(() => {
		toggleQueueShuffle();
	}, [toggleQueueShuffle]);

	const toggleRepeat = useCallback(() => {
		toggleQueueRepeat();
	}, [toggleQueueRepeat]);

	const onTrackEnd = useCallback(() => {
		// Auto-advance to next track when current track ends
		const nextTrack = skipToNextInQueue();
		if (nextTrack) {
			setSelectedTrackId(nextTrack.id);
		} else {
			// Queue finished, collapse to mini player
			bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
		}
	}, [skipToNextInQueue]);

	const upcomingTracks = useMemo(
		() => queue.slice(currentIndex + 1),
		[queue, currentIndex],
	);

	// Get next/previous track artwork for swipe preview
	const nextTrackArtwork =
		hasNext && currentIndex < queue.length - 1
			? queue[currentIndex + 1]?.artworkUrl
			: null;
	const previousTrackArtwork =
		hasPrevious && currentIndex > 0
			? queue[currentIndex - 1]?.artworkUrl
			: null;

	// Sync zustand current → UI selectedTrackId (covers transitions driven from
	// the background-service while the app was locked).
	const currentTrackIdFromQueue = useQueueStore(
		(s) =>
			s.currentIndex >= 0 && s.currentIndex < s.queue.length
				? s.queue[s.currentIndex]?.id ?? null
				: null,
	);
	useEffect(() => {
		if (!currentTrackIdFromQueue) return;
		setSelectedTrackId(currentTrackIdFromQueue);
	}, [currentTrackIdFromQueue]);

	// RNTP queue mirrors a [prev?, current, next?] window of zustand so the
	// notification's Next/Previous buttons show (Media3 hides them when the
	// timeline has no successor/predecessor MediaItem) and native auto-advance
	// works on lockscreen. Only kicks in when zustand contains the track —
	// single-track playTrack mode falls through to useTrackAudioPlayer.
	const rebuildSignatureRef = useRef<string | null>(null);
	useEffect(() => {
		if (!isPlayerVisible || !selectedTrackId) return;
		const inZustandQueue = queue.some((t) => t.id === selectedTrackId);
		if (!inZustandQueue) return;
		// If RNTP is already playing this track (e.g. MediaItemTransition just
		// updated zustand → selectedTrackId), don't tear down the window.
		if (TrackPlayer.getActiveMediaItem()?.mediaId === selectedTrackId) {
			rebuildSignatureRef.current = `${selectedTrackId}|${queue.length}`;
			return;
		}
		const sig = `${selectedTrackId}|${queue.length}`;
		if (rebuildSignatureRef.current === sig) return;
		rebuildSignatureRef.current = sig;
		void rebuildRntpQueueWindow();
	}, [isPlayerVisible, selectedTrackId, queue]);

	// When the player transitions to a new MediaItem (native auto-advance at
	// track end, native Next/Previous, lockscreen buttons), reshape the window
	// without resetting playback.
	useEffect(() => {
		const sub = TrackPlayer.addEventListener(
			Event.MediaItemTransition,
			(e) => {
				if (e.index < 0) return;
				void shiftWindowToActive(e.index);
			},
		);
		return () => sub.remove();
	}, []);

	const dismissPlayer = useCallback(() => {
		setIsPlayerVisible(false);
		setSelectedTrackId(null);
		setSheetIndex(0);
		clearQueue();
		TrackPlayer.stop();
		TrackPlayer.clear();
	}, [clearQueue]);

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

	const actionsValue = useMemo<GlobalPlayerActionsContextValue>(
		() => ({
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
			onTrackEnd,
		}),
		[
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
			onTrackEnd,
		],
	);

	const stateValue = useMemo<GlobalPlayerStateContextValue>(
		() => ({
			selectedTrackId,
			sheetIndex,
			isPlayerVisible,
			hasNext,
			hasPrevious,
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
			hasNext,
			hasPrevious,
			queue,
			currentIndex,
			upcomingTracks,
			repeatMode,
			shuffleMode,
			queueSource,
		],
	);

	return (
		<GlobalPlayerActionsContext value={actionsValue}>
			<GlobalPlayerStateContext value={stateValue}>
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
						backgroundColor: isDark ? THEME.dark.primary : THEME.light.primary,
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
									onToggleRepeat={toggleRepeat}
									onExpand={expandPlayer}
									onCollapse={collapsePlayer}
									hasNext={hasNext}
									hasPrevious={hasPrevious}
									isShuffled={shuffleMode === "on"}
									repeatMode={repeatMode}
									nextArtworkUrl={nextTrackArtwork}
									previousArtworkUrl={previousTrackArtwork}
								/>
							</>
						)}
					</BottomSheetScrollView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
			</GlobalPlayerStateContext>
		</GlobalPlayerActionsContext>
	);
}

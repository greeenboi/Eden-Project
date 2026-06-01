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
	pushQueueToPlayer,
	skipInPlayerTo,
} from "@/lib/services/track-player-adapter";
import { THEME } from "@/lib/theme";
import {
	BottomSheetModal,
	BottomSheetModalProvider,
	BottomSheetScrollView,
	useBottomSheet,
} from "@gorhom/bottom-sheet";
import TrackPlayer, {
	Event,
	RepeatMode as RntpRepeatMode,
} from "@rntp/player";
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
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const isDark = useIsDark();

	const setQueue = useQueueStore((state) => state.setQueue);
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

	const playTrack = useCallback(
		(trackId: string) => {
			setSelectedTrackId(trackId);
			setIsPlayerVisible(true);
			setSheetIndex(FULL_SNAP_INDEX);
			// Modal must be (re)presented every time — `present()` is the only
			// way to add it to the stack after a dismiss, and snapToIndex is a
			// no-op on a dismissed modal.
			bottomSheetRef.current?.present();
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
			bottomSheetRef.current?.present();
			bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
		},
		[FULL_SNAP_INDEX, setQueue],
	);

	// User-initiated next/prev go straight to RNTP. RNTP advances natively,
	// fires PlaybackActiveTrackChanged, and the listener below writes the new
	// index back to zustand — keeping history and queue-source analytics.
	const skipToNext = useCallback(() => {
		TrackPlayer.skipToNext();
	}, []);

	const skipToPrevious = useCallback(() => {
		TrackPlayer.skipToPrevious();
	}, []);

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
		// When a queue is loaded, RNTP auto-advances and the MediaItemTransition
		// listener handles the rest. This callback only matters for the
		// no-queue / single-track playback path — there's nothing to advance to,
		// so just collapse the sheet.
		if (useQueueStore.getState().queue.length === 0) {
			bottomSheetRef.current?.snapToIndex(MINI_SNAP_INDEX);
		}
	}, []);

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
	// the background-service while the app was locked, and natural auto-advance).
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

	// ---- Sync wiring (adopted from CodeWithGionatha-Labs/music-player).
	// Single direction: zustand → RNTP on queue identity change (full push).
	// Reverse: RNTP's MediaItemTransition writes the new index back to zustand
	// via skipToIndex, which preserves history and queue-source analytics.
	useEffect(() => {
		// Initial push in case zustand was rehydrated from persistence.
		void pushQueueToPlayer();

		// 1. zustand → RNTP
		//    Identity sig changes when the queue array itself changes
		//    (setQueue / addToQueue / addNext / remove / move / shuffle).
		//    Position sig changes when only currentIndex moves.
		let lastIdentity: string | null = null;
		let lastPosition: number = -1;
		const unsubscribe = useQueueStore.subscribe((state) => {
			const identity = state.queue.map((t) => t.id).join("|");
			const position = state.currentIndex;
			if (identity !== lastIdentity) {
				lastIdentity = identity;
				lastPosition = position;
				void pushQueueToPlayer();
				return;
			}
			if (position !== lastPosition) {
				lastPosition = position;
				if (position >= 0 && position < state.queue.length) {
					skipInPlayerTo(position);
				}
			}
		});

		// 2. RNTP → zustand
		//    Lockscreen Next/Prev, BT headset, native auto-advance, and our
		//    own skipToNext/Previous calls all funnel through this event.
		const transition = TrackPlayer.addEventListener(
			Event.MediaItemTransition,
			(e) => {
				if (!e.item?.mediaId) return;
				const z = useQueueStore.getState();
				const newIdx = z.queue.findIndex(
					(t) => t.id === e.item?.mediaId,
				);
				if (newIdx >= 0 && newIdx !== z.currentIndex) {
					z.skipToIndex(newIdx);
				}
			},
		);

		return () => {
			unsubscribe();
			transition.remove();
		};
	}, []);

	// Mirror zustand's repeatMode into RNTP so lockscreen + native auto-advance
	// honor it without needing useTrackAudioPlayer mounted.
	// NOTE: `RntpRepeatMode.All` is the @rntp/player v5 name; legacy RNTP used
	// `Queue`. If typecheck complains, swap to `.Queue` here.
	useEffect(() => {
		const mapped =
			repeatMode === "one"
				? RntpRepeatMode.One
				: repeatMode === "all"
					? RntpRepeatMode.All
					: RntpRepeatMode.Off;
		TrackPlayer.setRepeatMode(mapped);
	}, [repeatMode]);

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

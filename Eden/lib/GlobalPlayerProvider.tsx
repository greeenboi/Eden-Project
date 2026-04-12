import { PlayingSongContent } from "@/components/pages/PlayingSongContent";
import PlayerHandle from "@/components/pages/player/PlayerHandle";
import {
	type QueueSource,
	type QueueTrack,
	type RepeatMode,
	type ShuffleMode,
	selectCurrentIndex,
	selectCurrentTrackId,
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
	addMediaNotificationResponseListener,
	dismissMediaNotification,
	setupMediaNotifications,
	showMediaNotification,
} from "@/lib/services/media-notifications";
import { usePlaybackStore } from "@/lib/stores/playback";
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
	const currentTrackId = useQueueStore(selectCurrentTrackId);

	// Playback store subscription scoped to isPlaying only
	const isPlaying = usePlaybackStore((state) => state.isPlaying);

	// Track if notifications are set up
	const notificationsSetupRef = useRef(false);

	// Set up notifications on mount
	useEffect(() => {
		if (notificationsSetupRef.current) {
			console.log("[GlobalPlayer] Notifications already set up, skipping");
			return;
		}
		notificationsSetupRef.current = true;

		console.log("[GlobalPlayer] Setting up notifications...");
		setupMediaNotifications()
			.then((success) => {
				console.log("[GlobalPlayer] Notification setup result:", success);
			})
			.catch((err) => {
				console.warn("[GlobalPlayer] Failed to setup notifications:", err);
			});
	}, []);

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
		const nextTrack = skipToNextInQueue();
		if (nextTrack) {
			setSelectedTrackId(nextTrack.id);
		}
	}, [skipToNextInQueue]);

	const skipToPrevious = useCallback(() => {
		const prevTrack = skipToPreviousInQueue();
		if (prevTrack) {
			setSelectedTrackId(prevTrack.id);
		}
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

	// Current track for notifications
	const currentTrack =
		currentIndex >= 0 && currentIndex < queue.length
			? queue[currentIndex]
			: null;

	const notificationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const lastNotificationSignatureRef = useRef<string | null>(null);

	// Update notification when track or playback state changes
	useEffect(() => {
		console.log("[GlobalPlayer] Notification effect triggered");
		console.log("[GlobalPlayer] - isPlayerVisible:", isPlayerVisible);
		console.log(
			"[GlobalPlayer] - currentTrack:",
			currentTrack?.title ?? "none",
		);
		console.log("[GlobalPlayer] - isPlaying:", isPlaying);
		console.log("[GlobalPlayer] - hasNext:", hasNext);
		console.log("[GlobalPlayer] - hasPrevious:", hasPrevious);

		if (!isPlayerVisible || !currentTrack) {
			console.log("[GlobalPlayer] No player or track, dismissing notification");
			if (notificationDebounceRef.current) {
				clearTimeout(notificationDebounceRef.current);
				notificationDebounceRef.current = null;
			}
			lastNotificationSignatureRef.current = null;
			// Dismiss notification when player is hidden
			dismissMediaNotification().catch(() => {});
			return;
		}

		const signature = [
			currentTrackId,
			isPlaying ? "1" : "0",
			hasNext ? "1" : "0",
			hasPrevious ? "1" : "0",
		].join("|");

		if (signature === lastNotificationSignatureRef.current) {
			return;
		}

		if (notificationDebounceRef.current) {
			clearTimeout(notificationDebounceRef.current);
		}

		notificationDebounceRef.current = setTimeout(() => {
			console.log("[GlobalPlayer] Showing notification for:", currentTrack.title);
			showMediaNotification({
				track: currentTrack,
				isPlaying,
				hasNext,
				hasPrevious,
			})
				.then(() => {
					lastNotificationSignatureRef.current = signature;
					console.log("[GlobalPlayer] showMediaNotification completed");
				})
				.catch((err) => {
					console.warn("[GlobalPlayer] Failed to show notification:", err);
				});
		}, 300);

		return () => {
			if (notificationDebounceRef.current) {
				clearTimeout(notificationDebounceRef.current);
				notificationDebounceRef.current = null;
			}
		};
	}, [
		currentTrackId,
		isPlaying,
		hasNext,
		hasPrevious,
		isPlayerVisible,
		currentTrack,
	]);

	// Listen for notification action responses (play/pause/next/previous)
	useEffect(() => {
		console.log("[GlobalPlayer] Setting up notification response listener");
		const subscription = addMediaNotificationResponseListener((action) => {
			console.log("[GlobalPlayer] Notification action received:", action);
			switch (action) {
				case "PLAY":
				case "PAUSE":
					// Toggle playback via the registered callback
					console.log("[GlobalPlayer] Toggling playback");
					usePlaybackStore.getState().togglePlayback?.();
					break;
				case "NEXT": {
					console.log("[GlobalPlayer] Skipping to next");
					skipToNextInQueue();
					const nextTrack = useQueueStore.getState().getCurrentTrack();
					if (nextTrack) {
						setSelectedTrackId(nextTrack.id);
					}
					break;
				}
				case "PREVIOUS": {
					console.log("[GlobalPlayer] Skipping to previous");
					skipToPreviousInQueue();
					const prevTrack = useQueueStore.getState().getCurrentTrack();
					if (prevTrack) {
						setSelectedTrackId(prevTrack.id);
					}
					break;
				}
			}
		});

		return () => {
			console.log("[GlobalPlayer] Removing notification response listener");
			subscription.remove();
		};
	}, [skipToNextInQueue, skipToPreviousInQueue]);

	const dismissPlayer = useCallback(() => {
		setIsPlayerVisible(false);
		setSelectedTrackId(null);
		setSheetIndex(0);
		clearQueue();
		// Dismiss notification when player is dismissed
		dismissMediaNotification().catch(() => {});
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

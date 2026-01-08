import { PlayingSongContent } from "@/components/pages/PlayingSongContent";
import PlayerHandle from "@/components/ui/PlayerHandle";
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
	/** Play a track by ID - opens the player sheet */
	playTrack: (trackId: string) => void;
	/** Dismiss the player sheet */
	dismissPlayer: () => void;
	/** Expand the player to full view */
	expandPlayer: () => void;
	/** Collapse the player to mini view */
	collapsePlayer: () => void;
	/** Toggle between mini and full view */
	togglePlayerExpand: () => void;
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
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const isDark = useIsDark();

	const snapPoints = useMemo(() => ["20%", "98%"], []);
	const FULL_SNAP_INDEX = snapPoints.length - 1;
	const MINI_SNAP_INDEX = 0;

	const playTrack = useCallback(
		(trackId: string) => {
			setSelectedTrackId(trackId);
			setIsPlayerVisible(true);
			bottomSheetRef.current?.present();
			requestAnimationFrame(() =>
				bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX)
			);
		},
		[FULL_SNAP_INDEX]
	);

	const dismissPlayer = useCallback(() => {
		bottomSheetRef.current?.dismiss();
		setIsPlayerVisible(false);
		setSelectedTrackId(null);
		setSheetIndex(0);
	}, []);

	const expandPlayer = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(FULL_SNAP_INDEX);
	}, [FULL_SNAP_INDEX]);

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
			dismissPlayer,
			expandPlayer,
			collapsePlayer,
			togglePlayerExpand,
		}),
		[
			selectedTrackId,
			sheetIndex,
			isPlayerVisible,
			playTrack,
			dismissPlayer,
			expandPlayer,
			collapsePlayer,
			togglePlayerExpand,
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
					enablePanDownToClose={false}
					onChange={handleSheetChange}
					onDismiss={handleSheetDismiss}
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
									variant={sheetIndex === MINI_SNAP_INDEX ? "mini" : "full"}
								/>
							</>
						)}
					</BottomSheetScrollView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GlobalPlayerContext.Provider>
	);
}

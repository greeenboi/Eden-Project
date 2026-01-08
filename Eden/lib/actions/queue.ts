import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface QueueTrack {
	id: string;
	title: string;
	artistName: string;
	artworkUrl: string | null;
	duration: number | null;
}

export type RepeatMode = "off" | "all" | "one";
export type ShuffleMode = "off" | "on";

interface QueueState {
	/** The main queue of tracks */
	queue: QueueTrack[];
	/** The original queue order (for un-shuffling) */
	originalQueue: QueueTrack[];
	/** Index of the currently playing track in the queue */
	currentIndex: number;
	/** History of played tracks (for "previous" functionality) */
	history: QueueTrack[];
	/** Maximum history size */
	maxHistorySize: number;
	/** Repeat mode: off, all (repeat queue), one (repeat current track) */
	repeatMode: RepeatMode;
	/** Shuffle mode */
	shuffleMode: ShuffleMode;
	/** Whether the queue is currently active/playing */
	isQueueActive: boolean;

	// Actions
	/** Set the queue with a new list of tracks, optionally starting at a specific index */
	setQueue: (tracks: QueueTrack[], startIndex?: number) => void;
	/** Add a track to the end of the queue */
	addToQueue: (track: QueueTrack) => void;
	/** Add a track to play next (after current track) */
	addNext: (track: QueueTrack) => void;
	/** Add multiple tracks to the queue */
	addMultipleToQueue: (tracks: QueueTrack[]) => void;
	/** Remove a track from the queue by index */
	removeFromQueue: (index: number) => void;
	/** Move a track within the queue */
	moveInQueue: (fromIndex: number, toIndex: number) => void;
	/** Clear the entire queue */
	clearQueue: () => void;
	/** Skip to next track, returns the next track or null if at end */
	skipToNext: () => QueueTrack | null;
	/** Go to previous track (from history or queue) */
	skipToPrevious: () => QueueTrack | null;
	/** Skip to a specific index in the queue */
	skipToIndex: (index: number) => QueueTrack | null;
	/** Toggle repeat mode: off -> all -> one -> off */
	toggleRepeatMode: () => void;
	/** Set repeat mode directly */
	setRepeatMode: (mode: RepeatMode) => void;
	/** Toggle shuffle mode on/off */
	toggleShuffle: () => void;
	/** Get the current track */
	getCurrentTrack: () => QueueTrack | null;
	/** Check if there's a next track available */
	hasNext: () => boolean;
	/** Check if there's a previous track available */
	hasPrevious: () => boolean;
	/** Get upcoming tracks (after current) */
	getUpcoming: () => QueueTrack[];
}

/**
 * Fisher-Yates shuffle algorithm
 */
const shuffleArray = <T>(array: T[]): T[] => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

export const useQueueStore = create<QueueState>()(
	persist(
		(set, get) => ({
			queue: [],
			originalQueue: [],
			currentIndex: -1,
			history: [],
			maxHistorySize: 50,
			repeatMode: "off",
			shuffleMode: "off",
			isQueueActive: false,

			setQueue: (tracks, startIndex = 0) => {
				const current = tracks[startIndex];
				set({
					queue: tracks,
					originalQueue: tracks,
					currentIndex: startIndex,
					isQueueActive: tracks.length > 0,
					// Add current track to history if there was one
					history: current
						? [...get().history, current].slice(-get().maxHistorySize)
						: get().history,
				});
			},

			addToQueue: (track) => {
				set((state) => ({
					queue: [...state.queue, track],
					originalQueue: [...state.originalQueue, track],
				}));
			},

			addNext: (track) => {
				set((state) => {
					const insertIndex = state.currentIndex + 1;
					const newQueue = [...state.queue];
					newQueue.splice(insertIndex, 0, track);
					return {
						queue: newQueue,
						originalQueue: [...state.originalQueue, track],
					};
				});
			},

			addMultipleToQueue: (tracks) => {
				set((state) => ({
					queue: [...state.queue, ...tracks],
					originalQueue: [...state.originalQueue, ...tracks],
				}));
			},

			removeFromQueue: (index) => {
				set((state) => {
					const newQueue = state.queue.filter((_, i) => i !== index);
					let newIndex = state.currentIndex;

					// Adjust current index if necessary
					if (index < state.currentIndex) {
						newIndex = state.currentIndex - 1;
					} else if (index === state.currentIndex) {
						// If removing current track, stay at same index (next track slides in)
						newIndex = Math.min(state.currentIndex, newQueue.length - 1);
					}

					return {
						queue: newQueue,
						currentIndex: newIndex,
						isQueueActive: newQueue.length > 0,
					};
				});
			},

			moveInQueue: (fromIndex, toIndex) => {
				set((state) => {
					const newQueue = [...state.queue];
					const [removed] = newQueue.splice(fromIndex, 1);
					newQueue.splice(toIndex, 0, removed);

					// Adjust current index
					let newIndex = state.currentIndex;
					if (fromIndex === state.currentIndex) {
						newIndex = toIndex;
					} else if (
						fromIndex < state.currentIndex &&
						toIndex >= state.currentIndex
					) {
						newIndex = state.currentIndex - 1;
					} else if (
						fromIndex > state.currentIndex &&
						toIndex <= state.currentIndex
					) {
						newIndex = state.currentIndex + 1;
					}

					return {
						queue: newQueue,
						currentIndex: newIndex,
					};
				});
			},

			clearQueue: () => {
				set({
					queue: [],
					originalQueue: [],
					currentIndex: -1,
					isQueueActive: false,
				});
			},

			skipToNext: () => {
				const state = get();
				const { queue, currentIndex, repeatMode } = state;

				if (queue.length === 0) return null;

				let nextIndex: number;

				if (repeatMode === "one") {
					// Repeat same track
					nextIndex = currentIndex;
				} else if (currentIndex >= queue.length - 1) {
					// At end of queue
					if (repeatMode === "all") {
						nextIndex = 0; // Loop back to start
					} else {
						return null; // No next track
					}
				} else {
					nextIndex = currentIndex + 1;
				}

				const nextTrack = queue[nextIndex];
				set({
					currentIndex: nextIndex,
					history: nextTrack
						? [...state.history, nextTrack].slice(-state.maxHistorySize)
						: state.history,
				});

				return nextTrack;
			},

			skipToPrevious: () => {
				const state = get();
				const { queue, currentIndex, history } = state;

				if (queue.length === 0) return null;

				let prevIndex: number;

				if (currentIndex > 0) {
					prevIndex = currentIndex - 1;
				} else if (state.repeatMode === "all") {
					prevIndex = queue.length - 1; // Loop to end
				} else {
					// At beginning, no previous - could restart current track
					prevIndex = 0;
				}

				const prevTrack = queue[prevIndex];
				set({
					currentIndex: prevIndex,
				});

				return prevTrack;
			},

			skipToIndex: (index) => {
				const state = get();
				const { queue } = state;

				if (index < 0 || index >= queue.length) return null;

				const track = queue[index];
				set({
					currentIndex: index,
					history: track
						? [...state.history, track].slice(-state.maxHistorySize)
						: state.history,
				});

				return track;
			},

			toggleRepeatMode: () => {
				set((state) => {
					const modes: RepeatMode[] = ["off", "all", "one"];
					const currentModeIndex = modes.indexOf(state.repeatMode);
					const nextMode = modes[(currentModeIndex + 1) % modes.length];
					return { repeatMode: nextMode };
				});
			},

			setRepeatMode: (mode) => {
				set({ repeatMode: mode });
			},

			toggleShuffle: () => {
				set((state) => {
					if (state.shuffleMode === "off") {
						// Turn on shuffle - shuffle remaining tracks after current
						const beforeCurrent = state.queue.slice(0, state.currentIndex + 1);
						const afterCurrent = state.queue.slice(state.currentIndex + 1);
						const shuffledAfter = shuffleArray(afterCurrent);

						return {
							shuffleMode: "on",
							originalQueue: state.queue, // Save original order
							queue: [...beforeCurrent, ...shuffledAfter],
						};
					}
					
					// Turn off shuffle - restore original order
					const currentTrack = state.queue[state.currentIndex];
					const originalIndex = state.originalQueue.findIndex(
						(t) => t.id === currentTrack?.id
					);

					return {
						shuffleMode: "off",
						queue: state.originalQueue,
						currentIndex: originalIndex >= 0 ? originalIndex : 0,
					};
				});
			},

			getCurrentTrack: () => {
				const { queue, currentIndex } = get();
				if (currentIndex < 0 || currentIndex >= queue.length) return null;
				return queue[currentIndex];
			},

			hasNext: () => {
				const { queue, currentIndex, repeatMode } = get();
				if (repeatMode === "one" || repeatMode === "all") return true;
				return currentIndex < queue.length - 1;
			},

			hasPrevious: () => {
				const { queue, currentIndex, repeatMode } = get();
				if (repeatMode === "all") return true;
				return currentIndex > 0;
			},

			getUpcoming: () => {
				const { queue, currentIndex } = get();
				return queue.slice(currentIndex + 1);
			},
		}),
		{
			name: "eden-queue-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				// Only persist these fields
				repeatMode: state.repeatMode,
				shuffleMode: state.shuffleMode,
				maxHistorySize: state.maxHistorySize,
			}),
		}
	)
);

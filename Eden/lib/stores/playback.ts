import { create } from "zustand";

interface PlaybackState {
	/** Current playback position in seconds */
	currentTime: number;
	/** Track duration in seconds */
	duration: number;
	/** Whether the audio is loaded and ready */
	isLoaded: boolean;
	/** Whether the audio is currently playing */
	isPlaying: boolean;
	/** Whether the stream is currently loading */
	isLoading: boolean;

	// Actions
	/** Update playback state */
	updatePlayback: (state: Partial<Omit<PlaybackState, "updatePlayback" | "seekTo" | "reset">>) => void;
	/** Seek callback - set by the player component */
	seekTo: ((time: number) => void) | null;
	/** Register seek callback */
	registerSeekCallback: (callback: (time: number) => void) => void;
	/** Unregister seek callback */
	unregisterSeekCallback: () => void;
	/** Reset playback state */
	reset: () => void;
}

const initialState = {
	currentTime: 0,
	duration: 0,
	isLoaded: false,
	isPlaying: false,
	isLoading: false,
	seekTo: null,
};

/**
 * Shared playback state store
 * Used to share audio playback state between player content and handle slider
 */
export const usePlaybackStore = create<PlaybackState>((set) => ({
	...initialState,

	updatePlayback: (state) => {
		set((prev) => ({ ...prev, ...state }));
	},

	registerSeekCallback: (callback) => {
		set({ seekTo: callback });
	},

	unregisterSeekCallback: () => {
		set({ seekTo: null });
	},

	reset: () => {
		set(initialState);
	},
}));

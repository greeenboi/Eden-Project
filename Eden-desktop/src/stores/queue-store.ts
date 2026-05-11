import { create } from "zustand";
import { readStorage, writeStorage } from "@/lib/storage";
import type { QueueSource, QueueTrack, RepeatMode, ShuffleMode } from "@/types/contracts";

const QUEUE_KEY = "eden-desktop-queue";

interface QueueSnapshot {
  queue: QueueTrack[];
  originalQueue: QueueTrack[];
  currentIndex: number;
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  queueSource: QueueSource | null;
}

interface QueueState extends QueueSnapshot {
  history: QueueTrack[];
  maxHistorySize: number;
  setQueue: (tracks: QueueTrack[], startIndex?: number, source?: QueueSource) => void;
  addToQueue: (track: QueueTrack) => void;
  addNext: (track: QueueTrack) => void;
  skipToNext: () => QueueTrack | null;
  skipToPrevious: () => QueueTrack | null;
  skipToIndex: (index: number) => QueueTrack | null;
  toggleRepeatMode: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
  currentTrack: () => QueueTrack | null;
  clearQueue: () => void;
}

const initialSnapshot: QueueSnapshot = {
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  repeatMode: "off",
  shuffleMode: "off",
  queueSource: null,
};

function loadSnapshot(): QueueSnapshot {
  return readStorage<QueueSnapshot>(QUEUE_KEY, initialSnapshot);
}

function persistSnapshot(state: QueueState): void {
  writeStorage<QueueSnapshot>(QUEUE_KEY, {
    queue: state.queue,
    originalQueue: state.originalQueue,
    currentIndex: state.currentIndex,
    repeatMode: state.repeatMode,
    shuffleMode: state.shuffleMode,
    queueSource: state.queueSource,
  });
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const restored = loadSnapshot();

export const useQueueStore = create<QueueState>((set, get) => ({
  ...restored,
  history: [],
  maxHistorySize: 50,

  setQueue: (tracks, startIndex = 0, source = { type: "custom", name: "Queue" }) => {
    set((state) => {
      const next: QueueState = {
        ...state,
        queue: tracks,
        originalQueue: tracks,
        currentIndex: tracks.length ? Math.min(startIndex, tracks.length - 1) : -1,
        queueSource: source,
        shuffleMode: "off",
      };
      persistSnapshot(next);
      return next;
    });
  },

  addToQueue: (track) => {
    set((state) => {
      const next: QueueState = {
        ...state,
        queue: [...state.queue, track],
        originalQueue: [...state.originalQueue, track],
      };
      persistSnapshot(next);
      return next;
    });
  },

  addNext: (track) => {
    set((state) => {
      const insertIndex = Math.max(state.currentIndex + 1, 0);
      const queue = [...state.queue];
      queue.splice(insertIndex, 0, track);
      const next: QueueState = {
        ...state,
        queue,
        originalQueue: [...state.originalQueue, track],
      };
      persistSnapshot(next);
      return next;
    });
  },

  skipToNext: () => {
    const state = get();
    if (!state.queue.length) {
      return null;
    }

    let nextIndex = state.currentIndex;
    if (state.repeatMode === "one") {
      nextIndex = state.currentIndex;
    } else if (state.currentIndex >= state.queue.length - 1) {
      if (state.repeatMode === "all") {
        nextIndex = 0;
      } else {
        return null;
      }
    } else {
      nextIndex = state.currentIndex + 1;
    }

    const nextTrack = state.queue[nextIndex];
    set((prev) => {
      const next: QueueState = {
        ...prev,
        currentIndex: nextIndex,
        history: nextTrack
          ? [...prev.history, nextTrack].slice(-prev.maxHistorySize)
          : prev.history,
      };
      persistSnapshot(next);
      return next;
    });

    return nextTrack;
  },

  skipToPrevious: () => {
    const state = get();
    if (!state.queue.length) {
      return null;
    }

    let previousIndex = state.currentIndex;
    if (state.currentIndex > 0) {
      previousIndex = state.currentIndex - 1;
    } else if (state.repeatMode === "all") {
      previousIndex = state.queue.length - 1;
    } else {
      previousIndex = 0;
    }

    const previousTrack = state.queue[previousIndex];
    set((prev) => {
      const next: QueueState = {
        ...prev,
        currentIndex: previousIndex,
      };
      persistSnapshot(next);
      return next;
    });

    return previousTrack;
  },

  skipToIndex: (index) => {
    const state = get();
    if (index < 0 || index >= state.queue.length) {
      return null;
    }

    const track = state.queue[index];
    set((prev) => {
      const next: QueueState = {
        ...prev,
        currentIndex: index,
        history: track ? [...prev.history, track].slice(-prev.maxHistorySize) : prev.history,
      };
      persistSnapshot(next);
      return next;
    });

    return track;
  },

  toggleRepeatMode: () => {
    set((state) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const currentModeIndex = modes.indexOf(state.repeatMode);
      const repeatMode = modes[(currentModeIndex + 1) % modes.length];
      const next: QueueState = { ...state, repeatMode };
      persistSnapshot(next);
      return next;
    });
  },

  setRepeatMode: (mode) => {
    set((state) => {
      const next: QueueState = { ...state, repeatMode: mode };
      persistSnapshot(next);
      return next;
    });
  },

  toggleShuffle: () => {
    set((state) => {
      if (state.shuffleMode === "off") {
        const beforeCurrent = state.queue.slice(0, state.currentIndex + 1);
        const afterCurrent = state.queue.slice(state.currentIndex + 1);
        const next: QueueState = {
          ...state,
          shuffleMode: "on",
          originalQueue: state.originalQueue.length ? state.originalQueue : state.queue,
          queue: [...beforeCurrent, ...shuffleArray(afterCurrent)],
        };
        persistSnapshot(next);
        return next;
      }

      const currentTrack = state.queue[state.currentIndex];
      const originalIndex = state.originalQueue.findIndex((track) => track.id === currentTrack?.id);
      const next: QueueState = {
        ...state,
        shuffleMode: "off",
        queue: state.originalQueue,
        currentIndex: originalIndex >= 0 ? originalIndex : 0,
      };
      persistSnapshot(next);
      return next;
    });
  },

  hasNext: () => {
    const state = get();
    if (state.repeatMode === "one" || state.repeatMode === "all") {
      return state.queue.length > 0;
    }
    return state.currentIndex < state.queue.length - 1;
  },

  hasPrevious: () => {
    const state = get();
    if (state.repeatMode === "all") {
      return state.queue.length > 0;
    }
    return state.currentIndex > 0;
  },

  currentTrack: () => {
    const state = get();
    if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) {
      return null;
    }
    return state.queue[state.currentIndex] ?? null;
  },

  clearQueue: () => {
    set((state) => {
      const next: QueueState = {
        ...state,
        ...initialSnapshot,
      };
      persistSnapshot(next);
      return next;
    });
  },
}));

import { create } from "zustand";
import { readStorage, writeStorage } from "@/lib/storage";
import type { QueueTrack } from "@/types/contracts";

const PLAYER_KEY = "eden-desktop-player";

interface PlayerPersisted {
  volume: number;
  muted: boolean;
  lastTrack: QueueTrack | null;
  lastTime: number;
}

interface PlayerState extends PlayerPersisted {
  currentTrack: QueueTrack | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  streamExpiresAt: string | null;
  setTrack: (track: QueueTrack | null) => void;
  setTiming: (currentTime: number, duration: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setBuffering: (isBuffering: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setStreamExpiry: (expiresAt: string | null) => void;
  setError: (message: string | null) => void;
}

const restored = readStorage<PlayerPersisted>(PLAYER_KEY, {
  volume: 0.8,
  muted: false,
  lastTrack: null,
  lastTime: 0,
});

function persist(state: PlayerState): void {
  writeStorage<PlayerPersisted>(PLAYER_KEY, {
    volume: state.volume,
    muted: state.muted,
    lastTrack: state.currentTrack,
    lastTime: state.currentTime,
  });
}

export const usePlayerStore = create<PlayerState>((set) => ({
  ...restored,
  currentTrack: restored.lastTrack,
  currentTime: restored.lastTime,
  duration: 0,
  isPlaying: false,
  isLoading: false,
  isBuffering: false,
  error: null,
  streamExpiresAt: null,

  setTrack: (track) => {
    set((state) => {
      const next: PlayerState = {
        ...state,
        currentTrack: track,
        currentTime: 0,
        duration: track?.duration ?? 0,
      };
      persist(next);
      return next;
    });
  },

  setTiming: (currentTime, duration) => {
    set((state) => {
      const next: PlayerState = {
        ...state,
        currentTime,
        duration,
      };
      persist(next);
      return next;
    });
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
  setLoading: (isLoading) => set({ isLoading }),
  setBuffering: (isBuffering) => set({ isBuffering }),

  setVolume: (volume) => {
    set((state) => {
      const next: PlayerState = {
        ...state,
        volume,
      };
      persist(next);
      return next;
    });
  },

  setMuted: (muted) => {
    set((state) => {
      const next: PlayerState = {
        ...state,
        muted,
      };
      persist(next);
      return next;
    });
  },

  setStreamExpiry: (expiresAt) => set({ streamExpiresAt: expiresAt }),
  setError: (message) => set({ error: message }),
}));

import { STREAM_REFRESH_SKEW_MS } from "@/config/env";
import { getTrackStream } from "@/services/api/playback";
import { usePlayerStore } from "@/stores/player-store";
import { useQueueStore } from "@/stores/queue-store";
import type { QueueTrack } from "@/types/contracts";

class AudioPlayerService {
  private audio: HTMLAudioElement;
  private isBound = false;
  private refreshInFlight = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
  }

  bind(): void {
    if (this.isBound) {
      return;
    }

    this.audio.addEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.addEventListener("loadedmetadata", this.handleMetadataLoaded);
    this.audio.addEventListener("play", this.handlePlay);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("waiting", this.handleWaiting);
    this.audio.addEventListener("canplay", this.handleCanPlay);
    this.audio.addEventListener("error", this.handleError);

    const player = usePlayerStore.getState();
    this.audio.volume = player.volume;
    this.audio.muted = player.muted;
    this.isBound = true;
  }

  async loadAndPlay(track: QueueTrack, startTime = 0): Promise<void> {
    const player = usePlayerStore.getState();
    player.setLoading(true);
    player.setError(null);
    player.setTrack(track);

    const stream = await getTrackStream(track.id);
    this.audio.src = stream.streamUrl;
    this.audio.currentTime = startTime;

    player.setStreamExpiry(stream.expiresAt);
    player.setLoading(false);

    await this.audio.play();
  }

  play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  async toggle(): Promise<void> {
    if (this.audio.paused) {
      await this.play();
      return;
    }
    this.pause();
  }

  seek(nextTime: number): void {
    this.audio.currentTime = nextTime;
  }

  setVolume(volume: number): void {
    this.audio.volume = volume;
    usePlayerStore.getState().setVolume(volume);
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted;
    usePlayerStore.getState().setMuted(muted);
  }

  private handleTimeUpdate = (): void => {
    const state = usePlayerStore.getState();
    state.setTiming(this.audio.currentTime, this.audio.duration || 0);

    if (!state.streamExpiresAt || this.refreshInFlight || !state.currentTrack) {
      return;
    }

    const expiresAtMs = Date.parse(state.streamExpiresAt);
    if (Number.isNaN(expiresAtMs)) {
      return;
    }

    if (expiresAtMs - Date.now() < STREAM_REFRESH_SKEW_MS) {
      this.refreshCurrentStream(state.currentTrack.id, this.audio.currentTime).catch(() => {
        // Ignore refresh errors, final retry happens on playback error.
      });
    }
  };

  private handleMetadataLoaded = (): void => {
    const state = usePlayerStore.getState();
    state.setTiming(this.audio.currentTime, this.audio.duration || 0);
  };

  private handlePlay = (): void => {
    usePlayerStore.getState().setPlaying(true);
  };

  private handlePause = (): void => {
    usePlayerStore.getState().setPlaying(false);
  };

  private handleWaiting = (): void => {
    usePlayerStore.getState().setBuffering(true);
  };

  private handleCanPlay = (): void => {
    usePlayerStore.getState().setBuffering(false);
  };

  private handleEnded = (): void => {
    const queue = useQueueStore.getState();
    const next = queue.skipToNext();

    if (!next) {
      usePlayerStore.getState().setPlaying(false);
      return;
    }

    this.loadAndPlay(next).catch((error) => {
      const message = error instanceof Error ? error.message : "Unable to play next track";
      usePlayerStore.getState().setError(message);
    });
  };

  private handleError = (): void => {
    const player = usePlayerStore.getState();
    const currentTrack = player.currentTrack;
    if (!currentTrack) {
      return;
    }

    this.refreshCurrentStream(currentTrack.id, this.audio.currentTime)
      .then(() => this.audio.play())
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Playback failed";
        usePlayerStore.getState().setError(message);
      });
  };

  private async refreshCurrentStream(trackId: string, currentTime: number): Promise<void> {
    if (this.refreshInFlight) {
      return;
    }

    this.refreshInFlight = true;
    try {
      const stream = await getTrackStream(trackId);
      this.audio.src = stream.streamUrl;
      this.audio.currentTime = currentTime;
      usePlayerStore.getState().setStreamExpiry(stream.expiresAt);
    } finally {
      this.refreshInFlight = false;
    }
  }
}

export const audioPlayer = new AudioPlayerService();

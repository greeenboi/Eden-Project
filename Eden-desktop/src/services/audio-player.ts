import { STREAM_REFRESH_SKEW_MS } from "@/config/env";
import { getTrackDetails } from "@/services/api/catalog";
import { getTrackStream } from "@/services/api/playback";
import { usePlayerStore } from "@/stores/player-store";
import { useQueueStore } from "@/stores/queue-store";
import type { QueueTrack } from "@/types/contracts";

class AudioPlayerService {
  private audio: HTMLAudioElement;
  private isBound = false;
  private refreshInFlight = false;
  private currentTrackId: string | null = null;
  private refreshAttempts = 0;
  private lastRefreshAt = 0;
  private loadToken = 0;

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
    const loadToken = this.nextLoadToken();
    const player = usePlayerStore.getState();
    player.setLoading(true);
    player.setError(null);
    player.setTrack(track);
    player.setStreamExpiry(null);
    this.resetStreamState(track.id);

    try {
      const stream = await getTrackStream(track.id);
      if (!this.isLatestLoad(loadToken)) {
        return;
      }

      const hydratedTrack: QueueTrack = {
        ...track,
        title: stream.track.title ?? track.title,
        artworkUrl: stream.track.artworkUrl ?? track.artworkUrl,
        duration: stream.track.duration ?? track.duration,
      };
      player.setTrack(hydratedTrack);

      // R2 presigned URLs serve audio without CORS headers — make sure we don't
      // upgrade the request with credentials and force a fresh fetch.
      this.audio.crossOrigin = null as unknown as string;
      this.audio.src = stream.streamUrl;
      this.audio.load();

      player.setStreamExpiry(stream.expiresAt);

      this.hydrateArtistName(hydratedTrack, loadToken).catch(() => undefined);

      if (startTime > 0) {
        await this.seekAfterMetadata(startTime);
      }

      if (this.isLatestLoad(loadToken)) {
        player.setLoading(false);
      }
      await this.audio.play();
    } catch (error) {
      if (this.isLatestLoad(loadToken)) {
        player.setLoading(false);
      }
      const message = error instanceof Error ? error.message : "Playback failed";
      player.setError(message);
      throw error;
    }
  }

  private seekAfterMetadata(seconds: number): Promise<void> {
    if (this.audio.readyState >= 1) {
      this.audio.currentTime = seconds;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const onReady = (): void => {
        this.audio.removeEventListener("loadedmetadata", onReady);
        this.audio.currentTime = seconds;
        resolve();
      };
      this.audio.addEventListener("loadedmetadata", onReady, { once: true });
    });
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

    if (expiresAtMs <= Date.now()) {
      state.setStreamExpiry(null);
      return;
    }

    if (expiresAtMs - Date.now() < STREAM_REFRESH_SKEW_MS) {
      if (!this.canRefresh(state.currentTrack.id)) {
        return;
      }
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

    if (!this.canRefresh(currentTrack.id)) {
      const message = player.error ?? "Playback failed";
      usePlayerStore.getState().setError(message);
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
    if (!this.canRefresh(trackId)) {
      return;
    }

    this.refreshInFlight = true;
    this.refreshAttempts += 1;
    this.lastRefreshAt = Date.now();
    try {
      const stream = await getTrackStream(trackId);
      this.audio.crossOrigin = null as unknown as string;
      this.audio.src = stream.streamUrl;
      this.audio.load();
      await this.seekAfterMetadata(currentTime);
      usePlayerStore.getState().setStreamExpiry(stream.expiresAt);
    } finally {
      this.refreshInFlight = false;
    }
  }

  private resetStreamState(trackId: string): void {
    this.currentTrackId = trackId;
    this.refreshAttempts = 0;
    this.lastRefreshAt = 0;
  }

  private nextLoadToken(): number {
    this.loadToken += 1;
    return this.loadToken;
  }

  private isLatestLoad(loadToken: number): boolean {
    return this.loadToken === loadToken;
  }

  private async hydrateArtistName(track: QueueTrack, loadToken: number): Promise<void> {
    if (track.artistName && track.artistName !== "Unknown Artist") {
      return;
    }

    const details = await getTrackDetails(track.id);
    if (!this.isLatestLoad(loadToken)) {
      return;
    }

    const artistName = details.artist?.name ?? track.artistName ?? "Unknown Artist";
    const updatedTrack: QueueTrack = {
      ...track,
      title: details.title ?? track.title,
      artworkUrl: details.artworkUrl ?? track.artworkUrl,
      duration: details.duration ?? track.duration,
      artistName,
    };

    const player = usePlayerStore.getState();
    player.setTrackMetadata(updatedTrack);
    useQueueStore.getState().updateTrackMetadata(updatedTrack);
  }

  private canRefresh(trackId: string): boolean {
    if (this.refreshInFlight) {
      return false;
    }
    if (this.currentTrackId !== trackId) {
      return false;
    }
    if (this.refreshAttempts >= 1) {
      return false;
    }
    if (Date.now() - this.lastRefreshAt < 5_000) {
      return false;
    }
    return true;
  }
}

export const audioPlayer = new AudioPlayerService();

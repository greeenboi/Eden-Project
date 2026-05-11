import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { audioPlayer } from "@/services/audio-player";
import { usePlayerStore } from "@/stores/player-store";
import { useQueueStore } from "@/stores/queue-store";
import { useMemo, useRef } from "react";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const player = usePlayerStore();
  const queue = useQueueStore();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const progressPercent = useMemo(() => {
    if (!player.duration) {
      return 0;
    }
    return Math.min((player.currentTime / player.duration) * 100, 100);
  }, [player.currentTime, player.duration]);

  const currentTrack = player.currentTrack;

  function handlePrev(): void {
    const previous = queue.skipToPrevious();
    if (previous) {
      audioPlayer.loadAndPlay(previous).catch(() => undefined);
    }
  }

  function handleNext(): void {
    const next = queue.skipToNext();
    if (next) {
      audioPlayer.loadAndPlay(next).catch(() => undefined);
    }
  }

  return (
    <footer className="eden-player-bar" aria-label="Now playing">
      <div className="eden-player-track" ref={trackRef}>
        <Cover
          src={currentTrack?.artworkUrl ?? null}
          alt={currentTrack?.title ?? "Eden"}
          size="md"
        />
        <div className="eden-player-track-meta">
          <p className="title">{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="artist">{currentTrack?.artistName ?? "Select a track from your library"}</p>
        </div>
      </div>

      <div className="eden-player-center">
        <div className="eden-player-controls">
          <button
            type="button"
            className={`btn-icon btn-ghost${queue.shuffleMode === "on" ? " is-on" : ""}`}
            aria-label="Toggle shuffle"
            aria-pressed={queue.shuffleMode === "on"}
            onClick={() => queue.toggleShuffle()}
            style={queue.shuffleMode === "on" ? { color: "var(--brand)" } : undefined}
          >
            <Icon name="shuffle" size={16} />
          </button>

          <button
            type="button"
            className="btn-icon btn-ghost"
            aria-label="Previous track"
            onClick={handlePrev}
          >
            <Icon name="prev" size={18} />
          </button>

          <button
            type="button"
            className="btn-play"
            aria-label={player.isPlaying ? "Pause" : "Play"}
            disabled={!currentTrack}
            onClick={() => {
              if (!currentTrack) {
                const head = queue.skipToIndex(queue.currentIndex < 0 ? 0 : queue.currentIndex);
                if (head) {
                  audioPlayer.loadAndPlay(head).catch(() => undefined);
                }
                return;
              }
              audioPlayer.toggle().catch(() => undefined);
            }}
          >
            <Icon name={player.isPlaying ? "pause" : "play"} size={18} />
          </button>

          <button
            type="button"
            className="btn-icon btn-ghost"
            aria-label="Next track"
            onClick={handleNext}
          >
            <Icon name="next" size={18} />
          </button>

          <button
            type="button"
            className="btn-icon btn-ghost"
            aria-label="Cycle repeat mode"
            onClick={() => queue.toggleRepeatMode()}
            style={queue.repeatMode !== "off" ? { color: "var(--brand)" } : undefined}
          >
            <Icon name="repeat" size={16} />
          </button>
        </div>

        <div className="eden-progress-wrap">
          <span className="eden-mono">{formatDuration(player.currentTime)}</span>
          <div className="eden-progress-track" aria-hidden="true">
            <div className="eden-progress-track-fill" style={{ width: `${progressPercent}%` }} />
            <input
              className="eden-progress-input"
              type="range"
              min={0}
              max={Math.max(player.duration, 1)}
              step={1}
              value={Math.min(player.currentTime, player.duration || 1)}
              onChange={(event) => audioPlayer.seek(Number(event.currentTarget.value))}
              aria-label="Seek"
            />
          </div>
          <span className="eden-mono">{formatDuration(player.duration)}</span>
        </div>
      </div>

      <div className="eden-player-right">
        <Icon name="volume" size={16} />
        <input
          id="volume"
          className="eden-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(event) => audioPlayer.setVolume(Number(event.currentTarget.value))}
          aria-label="Volume"
        />
      </div>
    </footer>
  );
}

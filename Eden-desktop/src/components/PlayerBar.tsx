import { useMemo } from "react";
import { audioPlayer } from "@/services/audio-player";
import { usePlayerStore } from "@/stores/player-store";
import { useQueueStore } from "@/stores/queue-store";

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

  const progressPercent = useMemo(() => {
    if (!player.duration) {
      return 0;
    }
    return Math.min((player.currentTime / player.duration) * 100, 100);
  }, [player.currentTime, player.duration]);

  const currentTrack = player.currentTrack ?? queue.currentTrack();

  return (
    <footer className="eden-player-bar">
      <div className="eden-player-track">
        <div className="eden-artwork-placeholder" />
        <div>
          <p>{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="eden-muted">{currentTrack?.artistName ?? "Select a track"}</p>
        </div>
      </div>

      <div className="eden-player-center">
        <div className="eden-player-controls">
          <button type="button" onClick={() => {
            const previous = queue.skipToPrevious();
            if (previous) {
              audioPlayer.loadAndPlay(previous).catch(() => undefined);
            }
          }}>
            Prev
          </button>

          <button
            type="button"
            onClick={() => {
              audioPlayer.toggle().catch(() => undefined);
            }}
          >
            {player.isPlaying ? "Pause" : "Play"}
          </button>

          <button type="button" onClick={() => {
            const next = queue.skipToNext();
            if (next) {
              audioPlayer.loadAndPlay(next).catch(() => undefined);
            }
          }}>
            Next
          </button>

          <button type="button" onClick={() => queue.toggleShuffle()}>
            Shuffle: {queue.shuffleMode}
          </button>

          <button type="button" onClick={() => queue.toggleRepeatMode()}>
            Repeat: {queue.repeatMode}
          </button>
        </div>

        <div className="eden-progress-wrap">
          <span>{formatDuration(player.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(player.duration, 1)}
            step={1}
            value={Math.min(player.currentTime, player.duration || 1)}
            onChange={(event) => audioPlayer.seek(Number(event.currentTarget.value))}
          />
          <span>{formatDuration(player.duration)}</span>
        </div>
        <div className="eden-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="eden-player-right">
        <label htmlFor="volume">Vol</label>
        <input
          id="volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(event) => audioPlayer.setVolume(Number(event.currentTarget.value))}
        />
      </div>
    </footer>
  );
}

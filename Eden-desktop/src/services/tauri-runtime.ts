import { emit, listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";

export async function announceAppReady(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await emit("eden-app-ready");
}

export async function setupTrayListeners(): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined;
  }

  const unlistenPlayPause = await listen("tray-play-pause", () => {
    audioPlayer.toggle().catch(() => undefined);
  });

  const unlistenNext = await listen("tray-next", () => {
    const next = useQueueStore.getState().skipToNext();
    if (next) {
      audioPlayer.loadAndPlay(next).catch(() => undefined);
    }
  });

  const unlistenPrevious = await listen("tray-previous", () => {
    const previous = useQueueStore.getState().skipToPrevious();
    if (previous) {
      audioPlayer.loadAndPlay(previous).catch(() => undefined);
    }
  });

  return () => {
    unlistenPlayPause();
    unlistenNext();
    unlistenPrevious();
  };
}

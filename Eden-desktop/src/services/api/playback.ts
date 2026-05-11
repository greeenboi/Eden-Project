import { apiRequest } from "@/services/http";
import type { StreamResponse } from "@/types/contracts";

export function getTrackStream(trackId: string, signal?: AbortSignal): Promise<StreamResponse> {
  return apiRequest<StreamResponse>(`/api/tracks/${trackId}/stream`, {
    method: "GET",
    authenticated: true,
    signal,
  });
}

interface PlaybackEventPayload {
  trackId: string;
  percentListened: number;
  duration: number;
}

// Placeholder for backend event endpoint when exposed.
export async function sendPlaybackEvent(_payload: PlaybackEventPayload): Promise<void> {
  return Promise.resolve();
}

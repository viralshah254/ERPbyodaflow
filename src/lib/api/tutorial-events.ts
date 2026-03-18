import { apiRequest, isApiConfigured } from "./client";

export type TutorialEvent =
  | "tutorial_viewed"
  | "tour_started"
  | "tour_completed"
  | "tour_skipped";

export interface TutorialEventPayload {
  event: TutorialEvent;
  tourId?: string;
  page?: string;
}

/**
 * Emit a tutorial analytics event. No-op when API is not configured.
 */
export async function emitTutorialEvent(payload: TutorialEventPayload): Promise<void> {
  if (!isApiConfigured()) return;
  try {
    await apiRequest("/api/me/tutorial-events", {
      method: "POST",
      body: payload,
    });
  } catch {
    // Fire-and-forget; don't disrupt UX
  }
}

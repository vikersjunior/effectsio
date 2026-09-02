export type PlaybackState = "stopped" | "playing" | "paused";

export interface AnimationTimelineState {
  playbackState: PlaybackState;
  currentTime: number; // In seconds (e.g. 0.00 to duration)
  duration: number; // In seconds (default 10.00)
  fps: number; // Nominal frame rate (default 60)
  loop: boolean; // Continuous loop playback
  speed: number; // Playback rate multiplier (0.25, 0.5, 1.0, 2.0)
}

export const DEFAULT_ANIMATION_STATE: AnimationTimelineState = {
  playbackState: "stopped",
  currentTime: 0,
  duration: 10.0,
  fps: 60,
  loop: true,
  speed: 1.0,
};

/**
 * Formats a time in seconds to a human-readable string "MM:SS.SS" or "SS.SSs".
 */
export function formatTimelineTime(timeInSeconds: number): string {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return "00:00.00";
  const mins = Math.floor(timeInSeconds / 60);
  const secs = timeInSeconds % 60;
  const minsStr = String(mins).padStart(2, "0");
  const secsStr = secs.toFixed(2).padStart(5, "0");
  return `${minsStr}:${secsStr}`;
}

/**
 * Normalizes a timeline position into the [0, duration] range based on loop settings.
 */
export function normalizeTimelineTime(time: number, duration: number, loop: boolean): number {
  if (!Number.isFinite(time) || duration <= 0) return 0;
  if (time < 0) return 0;
  if (loop) {
    return time % duration;
  }
  return Math.min(time, duration);
}

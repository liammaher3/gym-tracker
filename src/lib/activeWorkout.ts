/**
 * Pointer to the workout currently being logged, kept in localStorage so a
 * live session survives a page reload — iOS evicts a home-screen app that has
 * sat behind a locked screen for a while, and it cold-starts on unlock. The
 * exercises and sets themselves live in Supabase and are reloaded from there.
 */
export type ActiveWorkout = {
  userId: string;
  workoutId: string;
  /** Epoch ms the session started; the elapsed clock counts from this. */
  startTime: number;
  name: string;
  activeExerciseId: string | null;
};

const KEY = "teretana.activeWorkout";

/**
 * A session older than this was abandoned rather than paused; it is dropped
 * instead of reopening with a days-long clock. The workout stays in History.
 */
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** The signed-in user's active workout, or null if there isn't one. */
export function loadActiveWorkout(userId: string): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as ActiveWorkout;
    if (
      saved?.userId !== userId ||
      typeof saved.workoutId !== "string" ||
      typeof saved.startTime !== "number" ||
      typeof saved.name !== "string" ||
      (saved.activeExerciseId !== null &&
        typeof saved.activeExerciseId !== "string")
    )
      return null;
    if (Date.now() - saved.startTime > MAX_AGE_MS) {
      clearActiveWorkout();
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function saveActiveWorkout(workout: ActiveWorkout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(workout));
  } catch {
    // Storage unavailable (private mode, quota): the session just won't
    // survive a reload.
  }
}

export function clearActiveWorkout() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

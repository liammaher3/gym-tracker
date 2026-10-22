import type { Exercise, Workout, WorkoutSet } from "../../src/types";

export function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "w1",
    user_id: "user-1",
    name: "Push day",
    notes: null,
    duration_seconds: 3600,
    created_at: "2026-10-20T18:00:00.000Z",
    ...overrides,
  };
}

export function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "e1",
    workout_id: "w1",
    name: "Bench Press",
    created_at: "2026-10-20T18:05:00.000Z",
    ...overrides,
  };
}

export function set(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s1",
    exercise_id: "e1",
    set_number: 1,
    reps: 10,
    weight: 135,
    created_at: "2026-10-20T18:06:00.000Z",
    ...overrides,
  };
}

/** An ISO timestamp `days` days before now (fractional days allowed). */
export const daysAgo = (days: number) =>
  new Date(Date.now() - days * 864e5).toISOString();

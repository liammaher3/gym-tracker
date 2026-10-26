import { supabase } from "./supabaseClient";
import type { ExerciseWithSets } from "../types";

export type WorkoutWithExercises = {
  id: string;
  name: string | null;
  exercises: ExerciseWithSets[];
};

/**
 * A workout with its exercises (oldest first) and each exercise's sets, in
 * one round trip. A missing workout comes back as error code PGRST116.
 */
export async function fetchWorkoutWithExercises(workoutId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, exercises(*, sets(*))")
    .eq("id", workoutId)
    .order("created_at", { referencedTable: "exercises", ascending: true })
    .order("set_number", { referencedTable: "exercises.sets", ascending: true })
    .single();
  if (error || !data) return { data: null, error };
  const workout: WorkoutWithExercises = {
    id: data.id,
    name: data.name,
    exercises: ((data.exercises ?? []) as ExerciseWithSets[]).map((ex) => ({
      ...ex,
      sets: ex.sets ?? [],
    })),
  };
  return { data: workout, error: null };
}

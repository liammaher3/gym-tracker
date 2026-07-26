import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Workout, Exercise, WorkoutSet } from "../types";
import { Icon } from "./ui/Icons";

type Props = {
  workout: Workout;
  onBack: () => void;
};

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] };

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

export default function WorkoutViewer({ workout, onBack }: Props) {
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_id", workout.id)
        .order("created_at", { ascending: true });
      if (exerciseError) {
        console.error(exerciseError);
        setLoading(false);
        return;
      }
      const ids = (exerciseData ?? []).map((e) => e.id);
      const { data: setData, error: setError } = await supabase
        .from("sets")
        .select("*")
        .in("exercise_id", ids.length > 0 ? ids : [""])
        .order("set_number", { ascending: true });
      if (setError) {
        console.error(setError);
        setLoading(false);
        return;
      }
      setExercises(
        (exerciseData ?? []).map((ex) => ({
          ...ex,
          sets: (setData ?? []).filter((s) => s.exercise_id === ex.id),
        })),
      );
      setLoading(false);
    };
    load();
  }, [workout.id]);

  const deleteWorkout = async () => {
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workout.id);
    if (error) return console.error(error);
    onBack();
  };

  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const volume = exercises.reduce(
    (a, e) => a + e.sets.reduce((b, s) => b + s.weight * s.reps, 0),
    0,
  );
  const created = new Date(workout.created_at);

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none border-b border-line px-[22px] pb-4 pt-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[7px] py-1.5 font-body text-[11px] uppercase tracking-[.16em] text-dim hover:text-accent"
          >
            <Icon.ChevronLeft size={14} />
            History
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Rename workout"
              className="grid h-8 w-8 place-items-center border border-line text-dim hover:border-accent hover:text-accent"
            >
              <Icon.Pencil size={15} />
            </button>
            <button
              type="button"
              aria-label="Delete workout"
              onClick={() => setConfirming(true)}
              className="grid h-8 w-8 place-items-center border border-danger text-danger hover:bg-danger hover:text-white"
            >
              <Icon.Trash size={15} />
            </button>
          </div>
        </div>

        <div className="mt-3.5 font-head text-[34px] uppercase leading-none tracking-[.02em]">
          {workout.name ?? "Untitled workout"}
        </div>
        <div className="mt-2.5 font-body text-[11px] uppercase leading-none tracking-[.14em] text-dim">
          {created.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          {" · "}
          {created.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="mt-[18px] flex border-y border-line">
          <div className="flex-1 py-[11px]">
            <div className="tnum font-head text-[21px] leading-none">
              {formatDuration(workout.duration_seconds)}
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Duration
            </div>
          </div>
          <div className="flex-1 border-l border-line py-[11px] pl-3.5">
            <div className="tnum font-head text-[21px] leading-none">
              {totalSets}
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Sets
            </div>
          </div>
          <div className="flex-[1.3] border-l border-line py-[11px] pl-3.5">
            <div className="tnum font-head text-[21px] leading-none">
              {volume.toLocaleString()}
              <span className="text-[12px] text-dim"> lb</span>
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Volume
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-[22px] pb-24 pt-[18px]">
        {loading ? (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            Loading exercises…
          </p>
        ) : exercises.length === 0 ? (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            No exercises logged for this workout.
          </p>
        ) : (
          exercises.map((ex) => (
            <div key={ex.id} className="mb-6">
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="font-head text-[19px] uppercase leading-none tracking-[.05em]">
                  {ex.name}
                </span>
                <span className="font-body text-[10px] uppercase tracking-[.14em] text-dim">
                  {ex.sets.length} sets
                </span>
              </div>
              <table className="w-full border-collapse font-body text-[14px]">
                <thead>
                  <tr>
                    {["#", "Weight", "Reps", "Vol"].map((h, i) => (
                      <th
                        key={h}
                        className={[
                          "border-b border-line py-1.5 font-body text-[11px] uppercase tracking-[.08em] text-dim",
                          i === 3 ? "pr-0.5 text-right" : "pl-0.5 text-left",
                        ].join(" ")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((s) => (
                    <tr key={s.id}>
                      <td className="tnum border-b border-line py-1.5 pl-0.5 text-accent">
                        {s.set_number}
                      </td>
                      <td className="tnum border-b border-line py-1.5">
                        {s.weight} lb
                      </td>
                      <td className="tnum border-b border-line py-1.5">
                        {s.reps}
                      </td>
                      <td className="tnum border-b border-line py-1.5 pr-0.5 text-right text-dim">
                        {(s.weight * s.reps).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6">
          <div className="w-full max-w-sm border border-line bg-ground p-5">
            <div className="font-head text-[22px] uppercase tracking-[.04em]">
              Delete workout
            </div>
            <p className="mt-2 font-body text-[13px] text-dim">
              This removes the workout and every exercise and set in it. It
              cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-11 flex-1 border border-line font-body text-[11px] uppercase tracking-[.16em] text-dim hover:text-ink"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={deleteWorkout}
                className="h-11 flex-1 bg-danger font-head text-[15px] uppercase tracking-[.16em] text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

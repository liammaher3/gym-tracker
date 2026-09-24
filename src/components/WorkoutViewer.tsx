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
  const [name, setName] = useState(workout.name);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draft, setDraft] = useState<ExerciseWithSets[]>([]);
  const [saving, setSaving] = useState(false);

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

  const startEditing = () => {
    setDraftName(name ?? "");
    setDraft(exercises);
    setEditing(true);
  };

  const removeExercise = (exerciseId: string) =>
    setDraft((d) => d.filter((e) => e.id !== exerciseId));

  const removeSet = (exerciseId: string, setId: string) =>
    setDraft((d) =>
      d.map((e) =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e,
      ),
    );

  const saveEdits = async () => {
    setSaving(true);
    // An exercise with every set removed is dropped too.
    const kept = draft.filter((e) => e.sets.length > 0);
    const keptExerciseIds = new Set(kept.map((e) => e.id));
    const keptSetIds = new Set(kept.flatMap((e) => e.sets.map((s) => s.id)));
    const removedExerciseIds = exercises
      .filter((e) => !keptExerciseIds.has(e.id))
      .map((e) => e.id);
    const removedSetIds = exercises
      .flatMap((e) => e.sets)
      .filter((s) => !keptSetIds.has(s.id))
      .map((s) => s.id);
    // Close gaps left by removed sets so numbering stays 1..n.
    const renumbered = kept.map((e) => ({
      ...e,
      sets: e.sets.map((s, i) => ({ ...s, set_number: i + 1 })),
    }));
    const renumberUpdates = kept.flatMap((e) =>
      e.sets
        .map((s, i) => ({ id: s.id, from: s.set_number, to: i + 1 }))
        .filter((r) => r.from !== r.to),
    );
    const newName = draftName.trim() || null;

    const fail = (error: unknown) => {
      console.error(error);
      setSaving(false);
    };

    if (newName !== name) {
      const { error } = await supabase
        .from("workouts")
        .update({ name: newName })
        .eq("id", workout.id);
      if (error) return fail(error);
    }
    if (removedSetIds.length > 0) {
      const { error } = await supabase
        .from("sets")
        .delete()
        .in("id", removedSetIds);
      if (error) return fail(error);
    }
    if (removedExerciseIds.length > 0) {
      const { error } = await supabase
        .from("exercises")
        .delete()
        .in("id", removedExerciseIds);
      if (error) return fail(error);
    }
    const results = await Promise.all(
      renumberUpdates.map((r) =>
        supabase.from("sets").update({ set_number: r.to }).eq("id", r.id),
      ),
    );
    const renumberError = results.find((r) => r.error)?.error;
    if (renumberError) return fail(renumberError);

    setName(newName);
    setExercises(renumbered);
    setEditing(false);
    setSaving(false);
  };

  const shown = editing ? draft : exercises;
  const totalSets = shown.reduce((a, e) => a + e.sets.length, 0);
  const volume = shown.reduce(
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
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Cancel editing"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="grid h-8 w-8 place-items-center border border-line text-dim hover:text-ink disabled:opacity-50"
              >
                <Icon.X size={15} />
              </button>
              <button
                type="button"
                aria-label="Save changes"
                onClick={saveEdits}
                disabled={saving}
                className="grid h-8 w-8 place-items-center border border-accent text-accent hover:bg-accent hover:text-ground disabled:opacity-50"
              >
                <Icon.Check size={15} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Edit workout"
                onClick={startEditing}
                disabled={loading}
                className="grid h-8 w-8 place-items-center border border-line text-dim hover:border-accent hover:text-accent disabled:opacity-50"
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
          )}
        </div>

        {editing ? (
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Untitled workout"
            aria-label="Workout name"
            autoFocus
            className="mt-3.5 w-full border-b border-accent bg-transparent pb-1 font-head text-[34px] uppercase leading-none tracking-[.02em] text-ink placeholder:text-dim focus:outline-none"
          />
        ) : (
          <div className="mt-3.5 font-head text-[34px] uppercase leading-none tracking-[.02em]">
            {name ?? "Untitled workout"}
          </div>
        )}
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
        ) : shown.length === 0 ? (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            No exercises logged for this workout.
          </p>
        ) : (
          shown.map((ex) => (
            <div key={ex.id} className="mb-6">
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="font-head text-[19px] uppercase leading-none tracking-[.05em]">
                  {ex.name}
                </span>
                {editing ? (
                  <button
                    type="button"
                    aria-label={"Remove " + ex.name}
                    onClick={() => removeExercise(ex.id)}
                    className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-[.14em] text-danger"
                  >
                    <Icon.Trash size={13} />
                    Remove
                  </button>
                ) : (
                  <span className="font-body text-[10px] uppercase tracking-[.14em] text-dim">
                    {ex.sets.length} sets
                  </span>
                )}
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
                    {editing ? (
                      <th className="w-8 border-b border-line" />
                    ) : null}
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
                      {editing ? (
                        <td className="border-b border-line py-1 text-right">
                          <button
                            type="button"
                            aria-label={"Remove set " + s.set_number}
                            onClick={() => removeSet(ex.id, s.id)}
                            className="inline-grid h-7 w-7 place-items-center text-danger hover:bg-danger hover:text-white"
                          >
                            <Icon.X size={14} />
                          </button>
                        </td>
                      ) : null}
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

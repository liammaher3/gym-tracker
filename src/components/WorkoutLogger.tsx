import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Exercise, WorkoutSet } from "../types";
import WorkoutTimer from "./WorkoutTimer";
import RestTimer from "./RestTimer";
import ExercisePicker from "./ExercisePicker";
import SetEntryPanel from "./SetEntryPanel";
import SetRow from "./SetRow";
import { Icon } from "./ui/Icons";

type Props = {
  userId: string;
  onFinish: () => void;
  onBack: () => void;
};

type ExerciseWithSets = Exercise & { sets: WorkoutSet[] };

export default function WorkoutLogger({ userId, onFinish, onBack }: Props) {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [starting, setStarting] = useState(false);

  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const [setForm, setSetForm] = useState({ reps: 10, weight: 0 });
  const [savingSet, setSavingSet] = useState(false);
  const [openSetId, setOpenSetId] = useState<string | null>(null);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restMinutes, setRestMinutes] = useState(2);
  const [restSeconds, setRestSeconds] = useState(30);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (workoutId && startTime) {
      timerRef.current = setInterval(
        () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000)),
        1000,
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutId, startTime]);

  const startWorkout = async () => {
    setStarting(true);
    const { data, error } = await supabase
      .from("workouts")
      .insert({ user_id: userId, name: workoutName || null })
      .select()
      .single();
    if (error) {
      console.error(error);
      setStarting(false);
      return;
    }
    setWorkoutId(data.id);
    setStartTime(Date.now());
    setStarting(false);
  };

  const handleFinish = async () => {
    if (workoutId && startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const { error } = await supabase
        .from("workouts")
        .update({ duration_seconds: duration })
        .eq("id", workoutId);
      if (error) console.error("Duration save error:", error);
    }
    onFinish();
  };

  const addExerciseToWorkout = async (name: string, libraryId: string) => {
    if (!workoutId) return;
    const { data, error } = await supabase
      .from("exercises")
      .insert({ workout_id: workoutId, name, library_id: libraryId })
      .select()
      .single();
    if (error) {
      console.error(error);
      return;
    }
    const next: ExerciseWithSets = { ...data, sets: [] };
    setExercises((prev) => [...prev, next]);
    setActiveExerciseId(next.id);
    setPicking(false);
    setSetForm({ reps: 10, weight: 0 });
  };

  const deleteExercise = async (exerciseId: string) => {
    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exerciseId);
    if (error) return console.error(error);
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    if (activeExerciseId === exerciseId) setActiveExerciseId(null);
  };

  const deleteSet = async (setId: string, exerciseId: string) => {
    const { error } = await supabase.from("sets").delete().eq("id", setId);
    if (error) return console.error(error);
    setOpenSetId(null);
    setExercises((prev) =>
      prev.map((e) =>
        e.id !== exerciseId
          ? e
          : {
              ...e,
              sets: e.sets
                .filter((s) => s.id !== setId)
                .map((s, i) => ({ ...s, set_number: i + 1 })),
            },
      ),
    );
  };

  const addSet = async () => {
    if (!activeExerciseId) return;
    const exercise = exercises.find((e) => e.id === activeExerciseId);
    if (!exercise) return;

    setSavingSet(true);
    const { data, error } = await supabase
      .from("sets")
      .insert({
        exercise_id: activeExerciseId,
        set_number: exercise.sets.length + 1,
        reps: setForm.reps,
        weight: setForm.weight,
      })
      .select()
      .single();
    setSavingSet(false);
    if (error) return console.error(error);

    setOpenSetId(null);
    setExercises((prev) =>
      prev.map((e) =>
        e.id === activeExerciseId ? { ...e, sets: [...e.sets, data] } : e,
      ),
    );
    setShowRestTimer(true);
  };

  /* ── pre-flight: name the workout ─────────────────────────────── */
  if (!workoutId) {
    return (
      <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
        <div className="relative flex-none border-b border-line px-[22px] pb-3.5 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[7px] py-1.5 font-body text-[11px] uppercase tracking-[.16em] text-dim hover:text-accent"
          >
            <Icon.ChevronLeft size={14} />
            Back
          </button>
          <div className="mt-3.5 font-head text-[34px] uppercase leading-none tracking-[.02em]">
            New workout
          </div>
        </div>
        <div className="relative flex-1 px-[22px] pt-6">
          <label className="font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
            Name · optional
          </label>
          <input
            type="text"
            placeholder="Push day"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="mt-2.5 h-[46px] w-full border border-line bg-slab px-3.5 font-body text-[15px] text-ink placeholder:text-dim focus-visible:border-accent"
          />
          <button
            type="button"
            onClick={startWorkout}
            disabled={starting}
            className="mt-5 h-[54px] w-full bg-accent font-head text-[17px] uppercase tracking-[.16em] text-on-accent hover:bg-accent-hot disabled:opacity-45"
          >
            {starting ? "Starting…" : "Start workout"}
          </button>
        </div>
      </div>
    );
  }

  const activeExercise =
    exercises.find((e) => e.id === activeExerciseId) ?? null;
  const lastSet = activeExercise?.sets.at(-1) ?? null;
  const others = exercises.filter((e) => e.id !== activeExerciseId);
  const volume = (activeExercise?.sets ?? []).reduce(
    (a, s) => a + s.weight * s.reps,
    0,
  );

  if (picking) {
    return (
      <ExercisePicker
        userId={userId}
        onAdd={addExerciseToWorkout}
        onCancel={() => setPicking(false)}
      />
    );
  }

  /* ── the logger ───────────────────────────────────────────────── */
  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <header className="relative flex flex-none items-center justify-between border-b border-line px-[22px] pb-3.5 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="grid h-[30px] w-[30px] place-items-center border border-line text-dim hover:border-accent hover:text-accent"
          >
            <Icon.ChevronLeft size={15} />
          </button>
          <div>
            <div className="font-head text-[9px] uppercase leading-none tracking-[.28em] text-accent">
              Session live
            </div>
            <div className="mt-1 font-head text-[22px] uppercase leading-[1.05] tracking-[.02em]">
              {workoutName || "Untitled workout"}
            </div>
          </div>
        </div>
        <WorkoutTimer elapsedSeconds={elapsedSeconds} compact />
      </header>

      <div className="relative flex-1 overflow-auto px-[22px] pb-2 pt-[18px]">
        {activeExercise ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-head text-[20px] uppercase leading-none tracking-[.05em]">
                {activeExercise.name}
              </span>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="p-1 font-body text-[10px] font-semibold uppercase tracking-[.14em] text-dim hover:text-accent"
              >
                Swap
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className="font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
                Logged
              </span>
              <span className="font-body text-[9px] uppercase leading-none tracking-[.14em] text-dim">
                {volume.toLocaleString()} lb
              </span>
            </div>
            <div className="border-t border-line">
              {activeExercise.sets.map((s) => (
                <SetRow
                  key={s.id}
                  index={s.set_number}
                  weight={s.weight}
                  reps={s.reps}
                  open={openSetId === s.id}
                  onToggle={() =>
                    setOpenSetId((id) => (id === s.id ? null : s.id))
                  }
                  onDelete={() => deleteSet(s.id, activeExercise.id)}
                />
              ))}
            </div>

            <SetEntryPanel
              weight={setForm.weight}
              reps={setForm.reps}
              setNumber={activeExercise.sets.length + 1}
              last={
                lastSet ? { weight: lastSet.weight, reps: lastSet.reps } : null
              }
              saving={savingSet}
              onChange={(next) => setSetForm(next)}
              onLog={addSet}
            />
          </>
        ) : (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            Add an exercise to start logging sets.
          </p>
        )}

        {others.length > 0 ? (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-3 font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
              Also this session
            </div>
            {others.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 border-b border-line px-1 py-[11px] hover:bg-slab"
              >
                <button
                  type="button"
                  onClick={() => setActiveExerciseId(e.id)}
                  className="flex-1 text-left font-body text-[14px] text-dim hover:text-ink"
                >
                  {e.name}
                </button>
                <span className="font-body text-[11px] uppercase tracking-[.1em] text-dim">
                  {e.sets.length} sets
                </span>
                <button
                  type="button"
                  aria-label={"Delete " + e.name}
                  onClick={() => deleteExercise(e.id)}
                  className="text-dim hover:text-danger"
                >
                  <Icon.Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-3.5 flex h-[46px] w-full items-center justify-center gap-2 border border-dashed border-line font-body text-[12px] font-semibold uppercase tracking-[.16em] text-accent hover:border-solid hover:bg-accent-soft"
        >
          <Icon.Plus size={15} />
          Add exercise
        </button>
        <button
          type="button"
          onClick={handleFinish}
          className="mb-1 mt-2.5 h-10 w-full font-body text-[11px] uppercase tracking-[.2em] text-dim hover:text-ink"
        >
          Finish workout
        </button>
      </div>

      {showRestTimer ? (
        <RestTimer
          initialMinutes={restMinutes}
          initialSeconds={restSeconds}
          upNext={
            activeExercise
              ? {
                  exercise: activeExercise.name,
                  setNumber: activeExercise.sets.length + 1,
                  weight: setForm.weight,
                  reps: setForm.reps,
                }
              : null
          }
          onStart={(m, s) => {
            setRestMinutes(m);
            setRestSeconds(s);
          }}
          onDismiss={() => setShowRestTimer(false)}
        />
      ) : null}
    </div>
  );
}

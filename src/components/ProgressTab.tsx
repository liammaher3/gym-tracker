import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { groupForMuscles, MUSCLE_GROUPS, OTHER_GROUP } from "../lib/muscleGroups";
import type { WeightPoint } from "./WeightChart";
import ExerciseProgress from "./ExerciseProgress";
import Blueprint from "./ui/Blueprint";
import { Icon } from "./ui/Icons";

type Props = {
  userId: string;
  refreshKey?: number;
};

type ExerciseSummary = {
  name: string;
  group: string;
  points: WeightPoint[];
};

const GROUP_ORDER = [...MUSCLE_GROUPS, OTHER_GROUP];

export default function ProgressTab({ userId, refreshKey }: Props) {
  const [summaries, setSummaries] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExerciseSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: workouts, error: wErr } = await supabase
        .from("workouts")
        .select("id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (wErr) {
        console.error(wErr);
        setLoading(false);
        return;
      }

      const workoutIds = (workouts ?? []).map((w) => w.id);
      const workoutDate = new Map((workouts ?? []).map((w) => [w.id, w.created_at]));

      const { data: exercises, error: eErr } = await supabase
        .from("exercises")
        .select("id, workout_id, name, library_id")
        .in("workout_id", workoutIds.length > 0 ? workoutIds : [""]);
      if (eErr) {
        console.error(eErr);
        setLoading(false);
        return;
      }

      const libraryIds = Array.from(
        new Set((exercises ?? []).map((e) => e.library_id).filter(Boolean)),
      );
      const { data: libraryRows, error: lErr } = await supabase
        .from("exercise_library")
        .select("id, primary_muscles")
        .in("id", libraryIds.length > 0 ? libraryIds : [""]);
      if (lErr) console.error(lErr);
      const musclesByLibraryId = new Map(
        (libraryRows ?? []).map((r) => [r.id, r.primary_muscles as string[] | null]),
      );
      const groupByName = new Map<string, string>();
      for (const ex of exercises ?? []) {
        if (groupByName.has(ex.name)) continue;
        groupByName.set(ex.name, groupForMuscles(musclesByLibraryId.get(ex.library_id)));
      }

      const exerciseIds = (exercises ?? []).map((e) => e.id);
      const { data: sets, error: sErr } = await supabase
        .from("sets")
        .select("exercise_id, weight, reps")
        .in("exercise_id", exerciseIds.length > 0 ? exerciseIds : [""]);
      if (sErr) {
        console.error(sErr);
        setLoading(false);
        return;
      }

      const topByExercise = new Map<string, { weight: number; reps: number }>();
      for (const s of sets ?? []) {
        const cur = topByExercise.get(s.exercise_id);
        if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          topByExercise.set(s.exercise_id, { weight: s.weight, reps: s.reps });
        }
      }

      const byName = new Map<string, WeightPoint[]>();
      for (const ex of exercises ?? []) {
        const top = topByExercise.get(ex.id);
        const date = workoutDate.get(ex.workout_id);
        if (!top || !date) continue;
        if (!byName.has(ex.name)) byName.set(ex.name, []);
        byName.get(ex.name)!.push({ date, weight: top.weight, reps: top.reps });
      }

      const built = Array.from(byName.entries())
        .map(([name, points]) => ({
          name,
          group: groupByName.get(name) ?? OTHER_GROUP,
          points: points.sort((a, b) => a.date.localeCompare(b.date)),
        }))
        .sort(
          (a, b) =>
            GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
            a.name.localeCompare(b.name),
        );

      setSummaries(built);
      setLoading(false);
    };
    load();
  }, [userId, refreshKey]);

  if (selected) {
    return (
      <ExerciseProgress
        name={selected.name}
        points={selected.points}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none px-[22px] pb-3.5 pt-2.5">
        <div className="font-head text-[9px] uppercase leading-none tracking-[.32em] text-accent">
          Teretana
        </div>
        <div className="mt-1.5 font-head text-[34px] uppercase leading-none tracking-[.01em]">
          Progress
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-[22px] pb-24">
        {loading ? (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            Loading progress…
          </p>
        ) : summaries.length === 0 ? (
          <p className="py-16 text-center font-body text-[13px] text-dim">
            No exercises logged yet. Finish a workout to start tracking.
          </p>
        ) : (
          <div className="flex flex-col gap-[11px] pt-1">
            {summaries.map((s, i) => {
              const latest = s.points[s.points.length - 1];
              const change = latest.weight - s.points[0].weight;
              const showHeader = i === 0 || summaries[i - 1].group !== s.group;
              return (
                <div key={s.name}>
                  {showHeader ? (
                    <div
                      className={[
                        "mb-2.5 font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim",
                        i === 0 ? "" : "mt-2.5",
                      ].join(" ")}
                    >
                      {s.group}
                    </div>
                  ) : null}
                  <Blueprint
                    onClick={() => setSelected(s)}
                    className="flex items-center gap-3.5 px-4 py-[15px]"
                  >
                    <Icon.Dumbbell size={18} className="flex-none text-accent" />
                    <div className="flex-1">
                      <div className="font-head text-[19px] uppercase leading-none tracking-[.05em]">
                        {s.name}
                      </div>
                      <div className="mt-[7px] font-body text-[11px] uppercase leading-none tracking-[.1em] text-dim">
                        {s.points.length} session{s.points.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tnum font-head text-[19px] leading-none">
                        {latest.weight}
                        <span className="text-[11px] text-dim"> lb × {latest.reps}</span>
                      </div>
                      {change !== 0 ? (
                        <div
                          className={[
                            "tnum mt-[7px] font-body text-[11px] leading-none",
                            change > 0 ? "text-success" : "text-danger",
                          ].join(" ")}
                        >
                          {change > 0 ? "+" : ""}
                          {change} lb
                        </div>
                      ) : null}
                    </div>
                    <Icon.ChevronRight size={15} className="text-accent" />
                  </Blueprint>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

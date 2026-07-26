import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Workout } from "../types";
import Blueprint from "./ui/Blueprint";
import WorkoutViewer from "./WorkoutViewer";
import { Icon } from "./ui/Icons";

type Props = {
  userId: string;
  refreshKey?: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function HistoryTab({ userId, refreshKey }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Workout | null>(null);

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setWorkouts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  if (viewing) {
    return (
      <WorkoutViewer
        workout={viewing}
        onBack={() => {
          setViewing(null);
          fetchWorkouts();
        }}
      />
    );
  }

  /* Week strip: last 7 days, bar height scaled to that day's duration. */
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const match = workouts.find(
      (w) => new Date(w.created_at).toDateString() === d.toDateString(),
    );
    return {
      date: d,
      minutes: match ? Math.round((match.duration_seconds ?? 0) / 60) : 0,
    };
  });
  const peak = Math.max(60, ...week.map((d) => d.minutes));

  /* Group by month for the section labels. */
  const groups = workouts.reduce<Record<string, Workout[]>>((acc, w) => {
    const d = new Date(w.created_at);
    const key =
      MONTHS[d.getMonth()] +
      (d.getFullYear() === today.getFullYear() ? "" : " " + d.getFullYear());
    (acc[key] ||= []).push(w);
    return acc;
  }, {});

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none px-[22px] pb-3.5 pt-2.5">
        <div className="font-head text-[9px] uppercase leading-none tracking-[.32em] text-accent">
          Teretana
        </div>
        <div className="mt-1.5 font-head text-[34px] uppercase leading-none tracking-[.01em]">
          History
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-[22px] pb-24">
        <div className="mb-[18px] flex h-14 items-end gap-[5px] border-b border-line">
          {week.map((d, i) => (
            <div
              key={i}
              title={DAYS[d.date.getDay()] + " · " + d.minutes + "m"}
              className={[
                "flex-1 border-t-2 bg-accent-soft",
                d.minutes > 0 ? "border-accent" : "border-line",
              ].join(" ")}
              style={{ height: Math.max(6, (d.minutes / peak) * 100) + "%" }}
            />
          ))}
        </div>

        {loading ? (
          <p className="py-10 text-center font-body text-[13px] text-dim">
            Loading workouts…
          </p>
        ) : workouts.length === 0 ? (
          <p className="py-16 text-center font-body text-[13px] text-dim">
            No workouts yet. Start one.
          </p>
        ) : (
          Object.entries(groups).map(([month, list]) => (
            <div key={month} className="mb-6">
              <div className="mb-3 font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
                {month}
              </div>
              <div className="flex flex-col gap-[11px]">
                {list.map((w) => {
                  const d = new Date(w.created_at);
                  return (
                    <Blueprint
                      key={w.id}
                      onClick={() => setViewing(w)}
                      className="flex items-center gap-3.5 px-4 py-[15px]"
                    >
                      <div className="w-11 flex-none border-r border-line pr-3 text-center">
                        <div className="tnum font-head text-[22px] leading-none">
                          {d.getDate()}
                        </div>
                        <div className="mt-[5px] font-body text-[8.5px] uppercase leading-none tracking-[.16em] text-dim">
                          {DAYS[d.getDay()]}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-head text-[19px] uppercase leading-none tracking-[.05em]">
                          {w.name ?? "Untitled workout"}
                        </div>
                        <div className="mt-[7px] font-body text-[11px] uppercase leading-none tracking-[.1em] text-dim">
                          {w.duration_seconds
                            ? Math.floor(w.duration_seconds / 60) + "m"
                            : "No duration"}
                        </div>
                      </div>
                      <Icon.ChevronRight size={15} className="text-accent" />
                    </Blueprint>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

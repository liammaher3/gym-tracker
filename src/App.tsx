import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import type { Workout } from "./types";
import AuthPage from "./components/Auth";
import BottomNav, { type Tab } from "./components/BottomNav";
import WorkoutTab from "./components/WorkoutTab";
import HistoryTab from "./components/HistoryTab";
import ProgressTab from "./components/ProgressTab";
import { useTheme } from "./theme/useTheme";

export default function App() {
  useTheme(); // owns data-theme on <html>

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("workout");
  const [logging, setLogging] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [recent, setRecent] = useState<Workout[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  /* Home-screen stat strip. */
  useEffect(() => {
    if (!session) return;
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setRecent(data ?? []));
  }, [session, logging, historyRefreshKey]);

  const stats = useMemo(() => {
    if (recent.length === 0)
      return { thisWeek: 0, daysSince: null, avgMinutes: null };
    const weekAgo = Date.now() - 7 * 864e5;
    const thisWeek = recent.filter(
      (w) => new Date(w.created_at).getTime() > weekAgo,
    ).length;
    const daysSince = Math.floor(
      (Date.now() - new Date(recent[0].created_at).getTime()) / 864e5,
    );
    const durations = recent
      .map((w) => w.duration_seconds ?? 0)
      .filter(Boolean);
    const avgMinutes = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)
      : null;
    return { thisWeek, daysSince, avgMinutes };
  }, [recent]);

  const handleTabChange = (tab: Tab) => {
    if (tab === "history") setHistoryRefreshKey((k) => k + 1);
    if (tab === "progress") setProgressRefreshKey((k) => k + 1);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="grid-backdrop relative grid min-h-screen place-items-center bg-ground">
        <p className="font-body text-[11px] uppercase tracking-[.24em] text-dim">
          Loading
        </p>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <div className="min-h-screen bg-ground text-ink">
      <div className={activeTab === "workout" ? "block" : "hidden"}>
        <WorkoutTab
          userId={session.user.id}
          logging={logging}
          setLogging={setLogging}
          onSignOut={() => supabase.auth.signOut()}
          stats={stats}
        />
      </div>
      <div className={activeTab === "history" ? "block" : "hidden"}>
        <HistoryTab userId={session.user.id} refreshKey={historyRefreshKey} />
      </div>
      <div className={activeTab === "progress" ? "block" : "hidden"}>
        <ProgressTab userId={session.user.id} refreshKey={progressRefreshKey} />
      </div>

      {/* Nav stays up during a live workout so the user can duck into
          History (e.g. to check a past lift) without losing the session —
          tapping "Workout" always returns to whatever is currently active. */}
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}

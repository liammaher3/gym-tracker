import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSupabase } from "../helpers/supabase";
import WorkoutTab from "../../src/components/WorkoutTab";
import type { ActiveWorkout } from "../../src/lib/activeWorkout";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

type Stats = { thisWeek: number; daysSince: number | null; avgMinutes: number | null };

function setup({
  logging = false,
  stats,
  activeWorkout = null,
}: { logging?: boolean; stats?: Stats; activeWorkout?: ActiveWorkout | null } = {}) {
  const setLogging = vi.fn();
  const onActiveWorkoutChange = vi.fn();
  const onSignOut = vi.fn();
  render(
    <WorkoutTab
      userId="user-1"
      logging={logging}
      setLogging={setLogging}
      activeWorkout={activeWorkout}
      onActiveWorkoutChange={onActiveWorkoutChange}
      onSignOut={onSignOut}
      stats={stats}
    />,
  );
  return { setLogging, onActiveWorkoutChange, onSignOut };
}

const stat = (label: string) => screen.getByText(label).previousElementSibling!;

describe("WorkoutTab", () => {
  beforeEach(() => resetSupabase());

  it("shows the home screen when not logging", () => {
    setup();
    expect(screen.getByText("Ready to train")).toBeInTheDocument();
  });

  it("shows the stats strip", () => {
    setup({ stats: { thisWeek: 3, daysSince: 1, avgMinutes: 52 } });
    expect(stat("This week")).toHaveTextContent("3");
    expect(stat("Since last")).toHaveTextContent("1d");
    expect(stat("Avg length")).toHaveTextContent("52m");
  });

  it("shows today as 0d, not a dash", () => {
    setup({ stats: { thisWeek: 1, daysSince: 0, avgMinutes: 0 } });
    expect(stat("Since last")).toHaveTextContent("0d");
    expect(stat("Avg length")).toHaveTextContent("0m");
  });

  it("shows dashes for missing stats", () => {
    setup({ stats: { thisWeek: 0, daysSince: null, avgMinutes: null } });
    expect(stat("This week")).toHaveTextContent("0");
    expect(stat("Since last")).toHaveTextContent("—");
    expect(stat("Avg length")).toHaveTextContent("—");
  });

  it("treats no stats at all as empty", () => {
    setup();
    expect(stat("This week")).toHaveTextContent("0");
    expect(stat("Since last")).toHaveTextContent("—");
  });

  it("starts a workout", () => {
    const { setLogging } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
    expect(setLogging).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("signs out", () => {
    const { onSignOut } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  describe("while logging", () => {
    it("shows the logger instead", () => {
      setup({ logging: true });
      expect(screen.getByText("New workout")).toBeInTheDocument();
      expect(screen.queryByText("Ready to train")).toBeNull();
    });

    it("stops logging when the logger goes back", () => {
      const { setLogging } = setup({ logging: true });
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(setLogging).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe("with a session still running", () => {
    const activeWorkout = { userId: "user-1", workoutId: "w1", startTime: Date.now(), name: "", activeExerciseId: null };

    it("offers to resume it", () => {
      const { setLogging } = setup({ activeWorkout });
      expect(screen.getByText("Session running")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Resume workout" }));
      expect(setLogging).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("can discard it without opening the logger", () => {
      const { setLogging, onActiveWorkoutChange } = setup({ activeWorkout });
      fireEvent.click(screen.getByRole("button", { name: "Discard session" }));
      expect(onActiveWorkoutChange).toHaveBeenCalledExactlyOnceWith(null);
      expect(setLogging).not.toHaveBeenCalled();
    });
  });

  it("offers no discard when nothing is running", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Discard session" })).toBeNull();
  });
});

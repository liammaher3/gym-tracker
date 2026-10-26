import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workout } from "../helpers/fixtures";
import { filterValue, on, queriesFor, resetSupabase } from "../helpers/supabase";
import type { Workout } from "../../src/types";
import HistoryTab from "../../src/components/HistoryTab";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

// "Today" is Thursday 22 Oct 2026, 12:00 local time. Dates below are built in
// local time so the tests pass in any timezone.
const NOW = new Date(2026, 9, 22, 12, 0);
const at = (y: number, m: number, d: number, h = 18) => new Date(y, m, d, h).toISOString();

const workouts: Workout[] = [
  workout({ id: "w-today", name: "Pull day", created_at: at(2026, 9, 22, 9), duration_seconds: 45 * 60 }),
  workout({ id: "w-mon", name: null, created_at: at(2026, 9, 19), duration_seconds: 90 * 60 }),
  workout({ id: "w-sep", name: "Legs", created_at: at(2026, 8, 3), duration_seconds: null }),
  workout({ id: "w-2025", name: "Old one", created_at: at(2025, 11, 30), duration_seconds: 59 }),
];

function setup(data: Workout[] = workouts, refreshKey = 0) {
  on("workouts", "select", { data });
  return render(<HistoryTab userId="user-1" refreshKey={refreshKey} />);
}

/** The clickable Blueprint card holding the given workout name. */
const card = (name: string) => screen.getByText(name).closest(".cursor-pointer");
const bars = () => [...document.querySelectorAll<HTMLElement>("[title]")];

describe("HistoryTab", () => {
  beforeEach(() => {
    resetSupabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("loads the user's workouts, newest first", async () => {
    setup();
    expect(screen.getByText("Loading workouts…")).toBeInTheDocument();
    await screen.findByText("Pull day");
    const [q] = queriesFor("workouts", "select");
    expect(filterValue(q, "eq", "user_id")).toBe("user-1");
    expect(filterValue(q, "order", "created_at")).toEqual({ ascending: false });
  });

  it("invites a first workout when there are none", async () => {
    setup([]);
    expect(await screen.findByText("No workouts yet. Start one.")).toBeInTheDocument();
  });

  it("logs a failed load and shows the empty state", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    on("workouts", "select", { error: { message: "offline" } });
    render(<HistoryTab userId="user-1" />);
    expect(await screen.findByText("No workouts yet. Start one.")).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith({ message: "offline" });
  });

  it("groups by month, adding the year only for past years", async () => {
    setup();
    await screen.findByText("Pull day");
    const labels = [...document.querySelectorAll(".mb-6 > div:first-child")].map((d) => d.textContent);
    expect(labels).toEqual(["October", "September", "December 2025"]);
  });

  describe("workout cards", () => {
    it("show the date, weekday, name and duration", async () => {
      setup();
      await screen.findByText("Pull day");
      const today = card("Pull day");
      expect(today).toHaveTextContent("22");
      expect(today).toHaveTextContent("Thu");
      expect(today).toHaveTextContent("45m");
    });

    it("fall back to Untitled and No duration", async () => {
      setup();
      await screen.findByText("Pull day");
      expect(card("Untitled workout")).toHaveTextContent("90m");
      expect(card("Legs")).toHaveTextContent("No duration");
    });

    it("round durations down to whole minutes", async () => {
      setup();
      await screen.findByText("Pull day");
      expect(card("Old one")).toHaveTextContent("0m");
    });
  });

  describe("week strip", () => {
    it("has a bar for each of the last seven days, ending today", async () => {
      setup();
      await screen.findByText("Pull day");
      expect(bars().map((b) => b.title.split(" · ")[0])).toEqual([
        "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu",
      ]);
    });

    it("scales bars to the longest day, with a 60 minute floor", async () => {
      setup();
      await screen.findByText("Pull day");
      const [, , , mon, , , thu] = bars();
      expect(mon.title).toBe("Mon · 90m");
      expect(mon.style.height).toBe("100%");
      expect(mon).toHaveClass("border-accent");
      expect(thu.title).toBe("Thu · 45m");
      expect(thu.style.height).toBe("50%");
    });

    it("keeps empty days as a short stub", async () => {
      setup([workouts[0]]);
      await screen.findByText("Pull day");
      const [fri, , , , , , thu] = bars();
      expect(fri.title).toBe("Fri · 0m");
      expect(fri.style.height).toBe("6%");
      expect(fri).toHaveClass("border-line");
      expect(thu.style.height).toBe("75%"); // 45 of the 60 minute floor
    });
  });

  it("opens a workout, and reloads the list on the way back", async () => {
    setup();
    fireEvent.click(await screen.findByText("Pull day"));
    expect(await screen.findByRole("button", { name: "Edit workout" })).toBeInTheDocument();
    const loads = queriesFor("workouts", "select").filter((q) => q.single);
    expect(loads.map((q) => filterValue(q, "eq", "id"))).toEqual(["w-today"]);

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("Pull day")).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(queriesFor("workouts", "select").filter((q) => !q.single)).toHaveLength(2),
    );
  });

  it("reloads when the refresh key changes", async () => {
    const { rerender } = setup();
    await screen.findByText("Pull day");
    rerender(<HistoryTab userId="user-1" refreshKey={1} />);
    await vi.waitFor(() => expect(queriesFor("workouts", "select")).toHaveLength(2));
  });
});

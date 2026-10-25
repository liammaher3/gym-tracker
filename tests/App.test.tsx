import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { saveActiveWorkout } from "../src/lib/activeWorkout";
import { daysAgo, workout } from "./helpers/fixtures";
import { setColorScheme } from "./helpers/matchMedia";
import {
  auth,
  authListenerCount,
  emitAuthChange,
  filterValue,
  makeSession,
  on,
  queriesFor,
  resetSupabase,
  setSession,
} from "./helpers/supabase";

vi.mock("../src/lib/supabaseClient", async () => (await import("./helpers/supabase")).supabaseModule);
vi.mock("../src/components/Auth", () => ({ default: () => <p>Sign-in screen</p> }));

async function signedIn() {
  setSession(makeSession("user-1"));
  const utils = render(<App />);
  await screen.findByText("Ready to train");
  return utils;
}

const nav = (tab: string) =>
  fireEvent.click(screen.getAllByRole("button", { name: tab }).find((b) => b.closest("nav"))!);

/** Whether the tab panel containing this text is the one shown. */
const shown = (text: string) =>
  !screen.getAllByText(text)[0].closest(".block, .hidden")!.classList.contains("hidden");

const stat = (label: string) => screen.getByText(label).previousElementSibling!;

describe("App", () => {
  beforeEach(() => resetSupabase());

  describe("auth", () => {
    it("shows a loading screen until the session is known", () => {
      render(<App />);
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    it("shows sign-in without a session", async () => {
      render(<App />);
      expect(await screen.findByText("Sign-in screen")).toBeInTheDocument();
    });

    it("opens the app with a session", async () => {
      await signedIn();
      expect(screen.queryByText("Sign-in screen")).toBeNull();
      expect(shown("Ready to train")).toBe(true);
    });

    it("opens the app when the user signs in", async () => {
      render(<App />);
      await screen.findByText("Sign-in screen");
      act(() => emitAuthChange("SIGNED_IN", makeSession()));
      expect(await screen.findByText("Ready to train")).toBeInTheDocument();
    });

    it("signs out from the Workout tab", async () => {
      await signedIn();
      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      expect(auth.signOut).toHaveBeenCalledOnce();
      act(() => emitAuthChange("SIGNED_OUT", null));
      expect(screen.getByText("Sign-in screen")).toBeInTheDocument();
    });

    it("stops listening for auth changes on unmount", async () => {
      const { unmount } = await signedIn();
      expect(authListenerCount()).toBe(1);
      unmount();
      expect(authListenerCount()).toBe(0);
    });
  });

  it("sets the theme on <html> from the OS", async () => {
    await signedIn();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    setColorScheme("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  describe("home stats", () => {
    it("come from the user's 20 most recent workouts", async () => {
      await signedIn();
      const [q] = queriesFor("workouts", "select");
      expect(filterValue(q, "eq", "user_id")).toBe("user-1");
      expect(filterValue(q, "order", "created_at")).toEqual({ ascending: false });
      expect(q.filters).toContainEqual(["limit", 20]);
    });

    it("count this week, days since the last workout and average length", async () => {
      on("workouts", "select", {
        data: [
          workout({ id: "a", created_at: daysAgo(2.5), duration_seconds: 50 * 60 }),
          workout({ id: "b", created_at: daysAgo(4), duration_seconds: null }),
          workout({ id: "c", created_at: daysAgo(6.9), duration_seconds: 0 }),
          workout({ id: "d", created_at: daysAgo(8), duration_seconds: 71 * 60 }),
        ],
      });
      await signedIn();
      await vi.waitFor(() => expect(stat("This week")).toHaveTextContent("3"));
      expect(stat("Since last")).toHaveTextContent("2d");
      // Workouts with no recorded duration are left out of the average.
      expect(stat("Avg length")).toHaveTextContent("61m");
    });

    it("show dashes with no workouts", async () => {
      await signedIn();
      expect(stat("This week")).toHaveTextContent("0");
      expect(stat("Since last")).toHaveTextContent("—");
      expect(stat("Avg length")).toHaveTextContent("—");
    });

    it("show a dash for average length when no workout has a duration", async () => {
      on("workouts", "select", { data: [workout({ created_at: daysAgo(0.1), duration_seconds: null })] });
      await signedIn();
      await vi.waitFor(() => expect(stat("Since last")).toHaveTextContent("0d"));
      expect(stat("Avg length")).toHaveTextContent("—");
    });
  });

  describe("tabs", () => {
    it("start on Workout", async () => {
      await signedIn();
      expect(shown("Ready to train")).toBe(true);
      expect(shown("History")).toBe(false);
    });

    it("switch to History, reloading it each visit", async () => {
      await signedIn();
      const before = queriesFor("workouts", "select").length;
      nav("History");
      expect(shown("History")).toBe(true);
      expect(shown("Ready to train")).toBe(false);
      await vi.waitFor(() => expect(queriesFor("workouts", "select").length).toBeGreaterThan(before));
    });

    it("switch to Progress, reloading it each visit", async () => {
      await signedIn();
      const before = queriesFor("exercises", "select").length;
      nav("Progress");
      expect(shown("Progress")).toBe(true);
      await vi.waitFor(() => expect(queriesFor("exercises", "select").length).toBe(before + 1));
      nav("Workout");
      nav("Progress");
      await vi.waitFor(() => expect(queriesFor("exercises", "select").length).toBe(before + 2));
    });

    it("keep a live workout running while browsing other tabs", async () => {
      on("workouts", "insert", { data: { id: "w-live" } });
      await signedIn();
      fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
      fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
      await screen.findByText("Session live");

      nav("History");
      expect(shown("Session live")).toBe(false);
      nav("Workout");
      expect(shown("Session live")).toBe(true);
    });
  });

  it("reopens straight into a workout that was live before a reload", async () => {
    saveActiveWorkout({
      userId: "user-1",
      workoutId: "w-live",
      startTime: Date.now() - 60_000,
      name: "Push day",
      activeExerciseId: null,
    });
    on("workouts", "select", (q) => ({ data: q.single ? { id: "w-live" } : [] }));
    setSession(makeSession("user-1"));
    render(<App />);
    await screen.findByText("Session live");
    expect(screen.getByText("Push day")).toBeInTheDocument();
    expect(queriesFor("workouts", "insert")).toHaveLength(0);
  });

  it("returns home and refreshes stats after finishing a workout", async () => {
    on("workouts", "insert", { data: { id: "w-live" } });
    await signedIn();
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
    fireEvent.click(screen.getByRole("button", { name: "Start workout" }));
    await screen.findByText("Session live");

    on("workouts", "select", { data: [workout({ created_at: daysAgo(0), duration_seconds: 30 * 60 })] });
    fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
    await screen.findByText("Ready to train");
    await vi.waitFor(() => expect(stat("This week")).toHaveTextContent("1"));
    expect(filterValue(queriesFor("workouts", "update")[0], "eq", "id")).toBe("w-live");
  });
});

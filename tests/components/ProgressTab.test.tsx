import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterValue, on, queriesFor, resetSupabase, type Query } from "../helpers/supabase";
import ProgressTab from "../../src/components/ProgressTab";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

type Row = Record<string, unknown>;

const workouts = [
  { id: "w1", created_at: "2026-09-01T18:00:00.000Z" },
  { id: "w2", created_at: "2026-09-08T18:00:00.000Z" },
  { id: "w3", created_at: "2026-09-15T18:00:00.000Z" },
];

const exercises = [
  { id: "x3", workout_id: "w3", name: "Bench Press", library_id: "lib-bench" },
  { id: "x2", workout_id: "w2", name: "Bench Press", library_id: "lib-bench" },
  { id: "x1", workout_id: "w1", name: "Bench Press", library_id: "lib-bench" },
  { id: "x4", workout_id: "w1", name: "Squat", library_id: "lib-squat" },
  { id: "x5", workout_id: "w2", name: "Squat", library_id: "lib-squat" },
  { id: "x6", workout_id: "w1", name: "Bicep Curl", library_id: "lib-curl" },
  { id: "x7", workout_id: "w2", name: "Mystery Move", library_id: null },
  { id: "x8", workout_id: "w3", name: "Plank", library_id: "lib-plank" },
  { id: "x9", workout_id: "w1", name: "Incline Press", library_id: "lib-bench" },
];

const library = [
  { id: "lib-bench", primary_muscles: ["chest"] },
  { id: "lib-squat", primary_muscles: ["quadriceps"] },
  { id: "lib-curl", primary_muscles: ["biceps"] },
  { id: "lib-plank", primary_muscles: ["abdominals"] },
];

const s = (exercise_id: string, weight: number, reps: number) => ({ exercise_id, weight, reps });
const sets = [
  s("x1", 135, 10), s("x1", 135, 8),
  s("x2", 145, 5), s("x2", 145, 8), s("x2", 140, 10),
  s("x3", 155, 3),
  s("x4", 225, 5),
  s("x5", 215, 5),
  s("x6", 30, 12),
  s("x7", 50, 10),
  s("x9", 95, 10),
  // x8 (Plank) has no sets.
];

/** Answer `.in(column, ids)` selects with just the matching rows. */
const serveIn = (table: string, rows: Row[], column: string) =>
  on(table, "select", (q: Query) => ({
    data: rows.filter((r) => (filterValue(q, "in", column) as unknown[]).includes(r[column])),
  }));

function serve() {
  on("workouts", "select", { data: workouts });
  serveIn("exercises", exercises, "workout_id");
  serveIn("exercise_library", library, "id");
  serveIn("sets", sets, "exercise_id");
}

async function setup() {
  const utils = render(<ProgressTab userId="user-1" />);
  await vi.waitFor(() => expect(screen.queryByText("Loading progress…")).toBeNull());
  return utils;
}

/** Group headers and exercise names, top to bottom. */
const listing = () =>
  [...document.querySelectorAll(".pt-1 > div")].flatMap((row) => {
    const header = row.children.length === 2 ? [`[${row.firstElementChild!.textContent}]`] : [];
    return [...header, row.querySelector(".font-head")!.textContent!];
  });

const card = (name: string) => screen.getByText(name).closest(".cursor-pointer")!;
const search = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText("Search exercises"), { target: { value: text } });
const silenceErrors = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("ProgressTab", () => {
  beforeEach(() => {
    resetSupabase();
    serve();
  });

  it("shows a loading message first", () => {
    render(<ProgressTab userId="user-1" />);
    expect(screen.getByText("Loading progress…")).toBeInTheDocument();
  });

  it("walks workouts → exercises → library → sets", async () => {
    await setup();
    const [w] = queriesFor("workouts", "select");
    expect(filterValue(w, "eq", "user_id")).toBe("user-1");
    expect(filterValue(w, "order", "created_at")).toEqual({ ascending: true });
    expect(filterValue(queriesFor("exercises")[0], "in", "workout_id")).toEqual(["w1", "w2", "w3"]);
    expect(filterValue(queriesFor("exercise_library")[0], "in", "id")).toEqual([
      "lib-bench", "lib-squat", "lib-curl", "lib-plank",
    ]);
    expect(filterValue(queriesFor("sets")[0], "in", "exercise_id")).toEqual(exercises.map((e) => e.id));
  });

  it("groups exercises by muscle group, Other last, alphabetical within", async () => {
    await setup();
    expect(listing()).toEqual([
      "[Chest]", "Bench Press", "Incline Press",
      "[Legs]", "Squat",
      "[Arms]", "Bicep Curl",
      "[Other]", "Mystery Move",
    ]);
  });

  it("leaves out exercises with no sets", async () => {
    await setup();
    expect(screen.queryByText("Plank")).toBeNull();
  });

  describe("cards", () => {
    it("show the latest top set, session count and gain", async () => {
      await setup();
      const bench = card("Bench Press");
      expect(bench).toHaveTextContent("3 sessions");
      expect(bench).toHaveTextContent("155 lb × 3");
      expect(screen.getByText("+20 lb")).toHaveClass("text-success");
    });

    it("show a loss in red", async () => {
      await setup();
      expect(card("Squat")).toHaveTextContent("2 sessions");
      expect(screen.getByText("-10 lb")).toHaveClass("text-danger");
    });

    it("show no change for a single session", async () => {
      await setup();
      expect(card("Bicep Curl")).toHaveTextContent("1 session");
      expect(card("Bicep Curl")).not.toHaveTextContent("1 sessions");
      expect(card("Bicep Curl")).not.toHaveTextContent(/[+-]\d+ lb/);
    });
  });

  describe("search", () => {
    it("filters by name, ignoring case and spaces", async () => {
      await setup();
      search("  PRESS ");
      expect(listing()).toEqual(["[Chest]", "Bench Press", "Incline Press"]);
    });

    it("starts each visible group with its header", async () => {
      await setup();
      search("u");
      expect(listing()).toEqual(["[Legs]", "Squat", "[Arms]", "Bicep Curl"]);
    });

    it("says when nothing matches", async () => {
      await setup();
      search(" deadlift ");
      expect(screen.getByText("No exercises match “deadlift”.")).toBeInTheDocument();
    });

    it("clears", async () => {
      await setup();
      expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
      search("squat");
      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      expect(screen.getByPlaceholderText("Search exercises")).toHaveValue("");
      expect(listing()).toHaveLength(9);
    });
  });

  it("opens an exercise's progress and comes back", async () => {
    await setup();
    fireEvent.click(card("Bench Press"));
    expect(screen.getByText("Current top set").previousElementSibling).toHaveTextContent("155 lb × 3");
    expect(screen.getByText("Best").previousElementSibling).toHaveTextContent("155 lb × 3");
    expect(screen.getByText("Sessions (3)")).toBeInTheDocument();
    // The middle session's top set is the heaviest weight, tie broken on reps.
    expect(screen.getByText("145 lb × 8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByPlaceholderText("Search exercises")).toBeInTheDocument();
  });

  describe("with nothing logged", () => {
    it("explains how to start and hides search", async () => {
      on("workouts", "select", { data: [] });
      await setup();
      expect(screen.getByText(/No exercises logged yet/)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Search exercises")).toBeNull();
    });

    it("queries with a placeholder id rather than an empty list", async () => {
      on("workouts", "select", { data: [] });
      await setup();
      expect(filterValue(queriesFor("exercises")[0], "in", "workout_id")).toEqual([""]);
      expect(filterValue(queriesFor("exercise_library")[0], "in", "id")).toEqual([""]);
      expect(filterValue(queriesFor("sets")[0], "in", "exercise_id")).toEqual([""]);
    });
  });

  describe("errors", () => {
    it.each(["workouts", "exercises", "sets"])("a failed %s load shows the empty state", async (table) => {
      const error = silenceErrors();
      on(table, "select", { error: { message: "offline" } });
      await setup();
      expect(error).toHaveBeenCalledWith({ message: "offline" });
      expect(screen.getByText(/No exercises logged yet/)).toBeInTheDocument();
    });

    it("a failed library load still lists everything, under Other", async () => {
      const error = silenceErrors();
      on("exercise_library", "select", { error: { message: "offline" } });
      await setup();
      expect(error).toHaveBeenCalled();
      expect(listing()[0]).toBe("[Other]");
      expect(listing()).toHaveLength(6);
    });
  });

  it("reloads when the refresh key changes", async () => {
    const { rerender } = await setup();
    rerender(<ProgressTab userId="user-1" refreshKey={1} />);
    await vi.waitFor(() => expect(queriesFor("workouts")).toHaveLength(2));
  });
});

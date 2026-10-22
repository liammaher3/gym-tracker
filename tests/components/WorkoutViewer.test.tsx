import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exercise, set, workout } from "../helpers/fixtures";
import { deferred, filterValue, on, queriesFor, resetSupabase } from "../helpers/supabase";
import type { Workout, WorkoutSet } from "../../src/types";
import WorkoutViewer from "../../src/components/WorkoutViewer";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

const exercises = [
  exercise({ id: "e1", name: "Bench Press" }),
  exercise({ id: "e2", name: "Squat", created_at: "2026-10-20T18:30:00.000Z" }),
];
const sets: WorkoutSet[] = [
  set({ id: "s1", exercise_id: "e1", set_number: 1, weight: 135, reps: 10 }),
  set({ id: "s2", exercise_id: "e1", set_number: 2, weight: 155, reps: 8 }),
  set({ id: "s3", exercise_id: "e1", set_number: 3, weight: 175, reps: 5 }),
  set({ id: "s4", exercise_id: "e2", set_number: 1, weight: 225, reps: 5 }),
];

function serve(ex = exercises, st = sets) {
  on("exercises", "select", { data: ex });
  on("sets", "select", (q) => ({
    data: st.filter((s) => (filterValue(q, "in", "exercise_id") as string[]).includes(s.exercise_id)),
  }));
}

async function setup(w: Workout = workout({ duration_seconds: 3900 })) {
  const onBack = vi.fn();
  render(<WorkoutViewer workout={w} onBack={onBack} />);
  await screen.findByText(/Loading exercises…|Bench Press|No exercises/);
  await vi.waitFor(() => expect(screen.queryByText("Loading exercises…")).toBeNull());
  return { onBack };
}

const btn = (name: string | RegExp) => screen.getByRole("button", { name });
const stat = (label: string) => screen.getByText(label).previousElementSibling!;
const silenceErrors = () => vi.spyOn(console, "error").mockImplementation(() => {});

/** Each exercise's table rows as "set# weight reps volume". */
const tableOf = (name: string) =>
  within(screen.getByText(name).closest(".mb-6")!.querySelector("table")!)
    .getAllByRole("row")
    .slice(1)
    .map((r) => [...r.querySelectorAll("td")].map((td) => td.textContent).filter(Boolean).join(" "));

describe("WorkoutViewer", () => {
  beforeEach(() => {
    resetSupabase();
    serve();
  });

  describe("viewing", () => {
    it("loads the workout's exercises in order, then their sets", async () => {
      await setup();
      const [exQ] = queriesFor("exercises", "select");
      expect(filterValue(exQ, "eq", "workout_id")).toBe("w1");
      expect(filterValue(exQ, "order", "created_at")).toEqual({ ascending: true });
      const [setQ] = queriesFor("sets", "select");
      expect(filterValue(setQ, "in", "exercise_id")).toEqual(["e1", "e2"]);
      expect(filterValue(setQ, "order", "set_number")).toEqual({ ascending: true });
    });

    it("shows each exercise with its sets", async () => {
      await setup();
      expect(tableOf("Bench Press")).toEqual([
        "1 135 lb 10 " + (1350).toLocaleString(),
        "2 155 lb 8 " + (1240).toLocaleString(),
        "3 175 lb 5 875",
      ]);
      expect(tableOf("Squat")).toEqual(["1 225 lb 5 " + (1125).toLocaleString()]);
      expect(screen.getByText("3 sets")).toBeInTheDocument();
      expect(screen.getByText("1 sets")).toBeInTheDocument();
    });

    it("shows the name, date and time", async () => {
      const w = workout({ name: "Push day" });
      await setup(w);
      expect(screen.getByText("Push day")).toBeInTheDocument();
      const created = new Date(w.created_at);
      const when =
        created.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
        " · " +
        created.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      expect(screen.getByText(when)).toBeInTheDocument();
    });

    it("calls an unnamed workout Untitled", async () => {
      await setup(workout({ name: null }));
      expect(screen.getByText("Untitled workout")).toBeInTheDocument();
    });

    it("totals sets and volume", async () => {
      await setup();
      expect(stat("Sets")).toHaveTextContent("4");
      expect(stat("Volume")).toHaveTextContent((4590).toLocaleString() + " lb");
    });

    it.each([
      [3900, "1h 5m"],
      [2700, "45m"],
      [59, "0m"],
      [0, "—"],
      [null, "—"],
    ])("formats a %s second duration as %s", async (secs, text) => {
      await setup(workout({ duration_seconds: secs }));
      expect(stat("Duration")).toHaveTextContent(text);
    });

    it("says when nothing was logged, without querying a set list", async () => {
      serve([], []);
      await setup();
      expect(screen.getByText("No exercises logged for this workout.")).toBeInTheDocument();
      expect(filterValue(queriesFor("sets", "select")[0], "in", "exercise_id")).toEqual([""]);
    });

    it.each(["exercises", "sets"])("logs a failed %s load and shows nothing", async (table) => {
      const error = silenceErrors();
      on(table, "select", { error: { message: "offline" } });
      await setup();
      expect(error).toHaveBeenCalledWith({ message: "offline" });
      expect(screen.getByText("No exercises logged for this workout.")).toBeInTheDocument();
    });

    it("goes back to History", async () => {
      const { onBack } = await setup();
      fireEvent.click(btn("History"));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  describe("deleting", () => {
    it("asks first, and can be called off", async () => {
      await setup();
      fireEvent.click(btn("Delete workout"));
      expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
      fireEvent.click(btn("Keep it"));
      expect(screen.queryByText(/cannot be undone/)).toBeNull();
      expect(queriesFor("workouts", "delete")).toHaveLength(0);
    });

    it("deletes the workout and goes back", async () => {
      const { onBack } = await setup();
      fireEvent.click(btn("Delete workout"));
      fireEvent.click(btn("Delete"));
      await vi.waitFor(() => expect(onBack).toHaveBeenCalledOnce());
      expect(filterValue(queriesFor("workouts", "delete")[0], "eq", "id")).toBe("w1");
    });

    it("stays if the delete fails", async () => {
      const error = silenceErrors();
      on("workouts", "delete", { error: { message: "nope" } });
      const { onBack } = await setup();
      fireEvent.click(btn("Delete workout"));
      fireEvent.click(btn("Delete"));
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(onBack).not.toHaveBeenCalled();
    });
  });

  describe("editing", () => {
    it("is unavailable until the exercises load", async () => {
      const pending = deferred();
      on("exercises", "select", pending.promise);
      render(<WorkoutViewer workout={workout()} onBack={() => {}} />);
      expect(btn("Edit workout")).toBeDisabled();
      await act(async () => pending.resolve({ data: exercises }));
      await vi.waitFor(() => expect(btn("Edit workout")).toBeEnabled());
    });

    it("shows a name field and remove buttons", async () => {
      await setup(workout({ name: "Push day" }));
      fireEvent.click(btn("Edit workout"));
      expect(screen.getByLabelText("Workout name")).toHaveValue("Push day");
      expect(screen.getByLabelText("Workout name")).toHaveFocus();
      expect(btn("Remove Bench Press")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^Remove set/ })).toHaveLength(4);
      expect(screen.queryByRole("button", { name: "Delete workout" })).toBeNull();
    });

    it("starts the name field empty for an unnamed workout", async () => {
      await setup(workout({ name: null }));
      fireEvent.click(btn("Edit workout"));
      expect(screen.getByLabelText("Workout name")).toHaveValue("");
    });

    it("updates totals live as sets are removed", async () => {
      await setup();
      fireEvent.click(btn("Edit workout"));
      fireEvent.click(within(screen.getByText("Squat").closest(".mb-6")!).getByRole("button", { name: "Remove set 1" }));
      expect(stat("Sets")).toHaveTextContent("3");
      expect(stat("Volume")).toHaveTextContent((3465).toLocaleString());
    });

    it("throws away changes on cancel", async () => {
      await setup(workout({ name: "Push day" }));
      fireEvent.click(btn("Edit workout"));
      fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "Renamed" } });
      fireEvent.click(btn("Remove Bench Press"));
      fireEvent.click(btn("Cancel editing"));

      expect(screen.getByText("Push day")).toBeInTheDocument();
      expect(tableOf("Bench Press")).toHaveLength(3);
      expect(queriesFor("workouts", "update")).toHaveLength(0);
      expect(queriesFor("sets", "delete")).toHaveLength(0);
    });

    describe("saving", () => {
      it("renames the workout", async () => {
        await setup(workout({ name: "Push day" }));
        fireEvent.click(btn("Edit workout"));
        fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "  Chest day " } });
        fireEvent.click(btn("Save changes"));

        await screen.findByText("Chest day");
        const [update] = queriesFor("workouts", "update");
        expect(update.payload).toEqual({ name: "Chest day" });
        expect(filterValue(update, "eq", "id")).toBe("w1");
      });

      it("clears a blanked-out name to Untitled", async () => {
        await setup(workout({ name: "Push day" }));
        fireEvent.click(btn("Edit workout"));
        fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "   " } });
        fireEvent.click(btn("Save changes"));
        await screen.findByText("Untitled workout");
        expect(queriesFor("workouts", "update")[0].payload).toEqual({ name: null });
      });

      it("writes nothing when nothing changed", async () => {
        await setup();
        fireEvent.click(btn("Edit workout"));
        fireEvent.click(btn("Save changes"));
        await screen.findByRole("button", { name: "Edit workout" });
        expect(queriesFor("workouts", "update")).toHaveLength(0);
        expect(queriesFor("sets", "delete")).toHaveLength(0);
        expect(queriesFor("sets", "update")).toHaveLength(0);
        expect(queriesFor("exercises", "delete")).toHaveLength(0);
      });

      it("deletes removed sets and renumbers the rest", async () => {
        await setup();
        fireEvent.click(btn("Edit workout"));
        const bench = screen.getByText("Bench Press").closest(".mb-6")!;
        fireEvent.click(within(bench as HTMLElement).getByRole("button", { name: "Remove set 1" }));
        fireEvent.click(btn("Save changes"));
        await screen.findByRole("button", { name: "Edit workout" });

        expect(filterValue(queriesFor("sets", "delete")[0], "in", "id")).toEqual(["s1"]);
        const renumbered = queriesFor("sets", "update").map((q) => [filterValue(q, "eq", "id"), q.payload]);
        expect(renumbered).toEqual([
          ["s2", { set_number: 1 }],
          ["s3", { set_number: 2 }],
        ]);
        expect(tableOf("Bench Press").map((r) => r.split(" ").slice(0, 2).join(" "))).toEqual([
          "1 155",
          "2 175",
        ]);
        expect(queriesFor("exercises", "delete")).toHaveLength(0);
      });

      it("deletes a removed exercise along with its sets", async () => {
        await setup();
        fireEvent.click(btn("Edit workout"));
        fireEvent.click(btn("Remove Squat"));
        fireEvent.click(btn("Save changes"));
        await screen.findByRole("button", { name: "Edit workout" });

        expect(filterValue(queriesFor("sets", "delete")[0], "in", "id")).toEqual(["s4"]);
        expect(filterValue(queriesFor("exercises", "delete")[0], "in", "id")).toEqual(["e2"]);
        expect(screen.queryByText("Squat")).toBeNull();
      });

      it("drops an exercise whose sets were all removed", async () => {
        await setup();
        fireEvent.click(btn("Edit workout"));
        const squat = screen.getByText("Squat").closest(".mb-6") as HTMLElement;
        fireEvent.click(within(squat).getByRole("button", { name: "Remove set 1" }));
        expect(screen.getByText("Squat")).toBeInTheDocument(); // still listed while editing
        fireEvent.click(btn("Save changes"));
        await screen.findByRole("button", { name: "Edit workout" });

        expect(filterValue(queriesFor("exercises", "delete")[0], "in", "id")).toEqual(["e2"]);
        expect(screen.queryByText("Squat")).toBeNull();
      });

      it("disables the controls while saving", async () => {
        await setup(workout({ name: "Push day" }));
        const pending = deferred();
        on("workouts", "update", pending.promise);
        fireEvent.click(btn("Edit workout"));
        fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "X" } });
        fireEvent.click(btn("Save changes"));
        expect(btn("Save changes")).toBeDisabled();
        expect(btn("Cancel editing")).toBeDisabled();
        await act(async () => pending.resolve({}));
        expect(btn("Edit workout")).toBeEnabled();
      });

      it.each([
        ["renaming", "workouts", "update"],
        ["deleting sets", "sets", "delete"],
        ["deleting exercises", "exercises", "delete"],
        ["renumbering", "sets", "update"],
      ] as const)("stays in edit mode if %s fails", async (_, table, op) => {
        const error = silenceErrors();
        on(table, op, { error: { message: "nope" } });
        await setup(workout({ name: "Push day" }));
        fireEvent.click(btn("Edit workout"));
        fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "Renamed" } });
        // Removing Bench set 1 and all of Squat exercises every write path.
        fireEvent.click(within(screen.getByText("Bench Press").closest(".mb-6") as HTMLElement).getByRole("button", { name: "Remove set 1" }));
        fireEvent.click(btn("Remove Squat"));
        fireEvent.click(btn("Save changes"));

        await vi.waitFor(() => expect(error).toHaveBeenCalledWith({ message: "nope" }));
        expect(screen.getByLabelText("Workout name")).toBeInTheDocument();
        expect(btn("Save changes")).toBeEnabled();
      });
    });
  });
});

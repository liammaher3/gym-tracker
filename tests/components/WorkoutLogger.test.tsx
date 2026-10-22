import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deferred,
  filterValue,
  on,
  queriesFor,
  resetSupabase,
} from "../helpers/supabase";
import WorkoutLogger from "../../src/components/WorkoutLogger";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

const library = [
  { id: "lib-bench", name: "Bench Press", equipment: "barbell", primary_muscles: ["chest"], user_id: null },
  { id: "lib-squat", name: "Squat", equipment: "barbell", primary_muscles: ["quadriceps"], user_id: null },
];

let ids = 0;
const nextId = (prefix: string) => prefix + ++ids;

function setup() {
  on("workouts", "insert", (q) => ({
    data: { id: "w1", ...(q.payload as object), created_at: new Date().toISOString() },
  }));
  on("exercise_library", "select", { data: library });
  on("exercises", "insert", (q) => ({ data: { id: nextId("ex"), ...(q.payload as object) } }));
  on("sets", "insert", (q) => ({ data: { id: nextId("set"), ...(q.payload as object) } }));
  const onFinish = vi.fn();
  const onBack = vi.fn();
  const { unmount } = render(<WorkoutLogger userId="user-1" onFinish={onFinish} onBack={onBack} />);
  return { onFinish, onBack, unmount };
}

const btn = (name: string | RegExp) => screen.getByRole("button", { name });
const press = (...names: string[]) => names.forEach((n) => fireEvent.click(btn(n)));
const silenceErrors = () => vi.spyOn(console, "error").mockImplementation(() => {});

async function start(name = "") {
  if (name) {
    fireEvent.change(screen.getByPlaceholderText("Push day"), { target: { value: name } });
  }
  fireEvent.click(btn("Start workout"));
  await screen.findByText("Session live");
}

async function addExercise(name: string) {
  fireEvent.click(btn("Add exercise"));
  fireEvent.click(await screen.findByText(name));
  await screen.findByRole("button", { name: "Swap" });
}

/** Type a weight on the keypad (if given), log the set, and wait for it to save. */
async function logSet(weightDigits = "") {
  press(...weightDigits.split("").filter(Boolean));
  const n = Number(btn(/^Log set/).textContent!.split(" ").pop());
  fireEvent.click(btn(`Log set ${n}`));
  await screen.findByRole("button", { name: `Log set ${n + 1}` });
}

/** The logged set rows of the active exercise, as "number | weight × reps | volume". */
const setRows = () =>
  [...document.querySelectorAll(".swipe-row")].map((r) =>
    [...r.firstElementChild!.children]
      .map((c) => c.textContent!.replace(/\s+/g, " ").trim())
      .join(" | "),
  );

describe("WorkoutLogger", () => {
  beforeEach(() => {
    resetSupabase();
    ids = 0;
  });

  describe("before the session starts", () => {
    it("asks for an optional name", () => {
      setup();
      expect(screen.getByText("New workout")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Push day")).toHaveValue("");
    });

    it("goes back without creating anything", () => {
      const { onBack } = setup();
      fireEvent.click(btn("Back"));
      expect(onBack).toHaveBeenCalledOnce();
      expect(queriesFor("workouts")).toHaveLength(0);
    });

    it("creates a named workout", async () => {
      setup();
      await start("Leg day");
      const [insert] = queriesFor("workouts", "insert");
      expect(insert.payload).toEqual({ user_id: "user-1", name: "Leg day" });
      expect(screen.getByText("Leg day")).toBeInTheDocument();
    });

    it("stores a blank name as null and shows Untitled", async () => {
      setup();
      await start();
      expect(queriesFor("workouts", "insert")[0].payload).toEqual({ user_id: "user-1", name: null });
      expect(screen.getByText("Untitled workout")).toBeInTheDocument();
    });

    it("disables the button while the workout is created", async () => {
      setup();
      const pending = deferred();
      on("workouts", "insert", pending.promise);
      fireEvent.click(btn("Start workout"));
      expect(btn("Starting…")).toBeDisabled();
      await act(async () => pending.resolve({ data: { id: "w1" } }));
      expect(screen.getByText("Session live")).toBeInTheDocument();
    });

    it("stays put if the workout cannot be created", async () => {
      const error = silenceErrors();
      setup();
      on("workouts", "insert", { error: { message: "offline" } });
      fireEvent.click(btn("Start workout"));
      await vi.waitFor(() => expect(error).toHaveBeenCalledWith({ message: "offline" }));
      expect(btn("Start workout")).toBeEnabled();
      expect(screen.queryByText("Session live")).toBeNull();
    });
  });

  describe("live session", () => {
    it("starts empty with the clock at zero", async () => {
      setup();
      await start();
      expect(screen.getByText("Add an exercise to start logging sets.")).toBeInTheDocument();
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("goes back from the header", async () => {
      const { onBack } = setup();
      await start();
      fireEvent.click(btn("Back"));
      expect(onBack).toHaveBeenCalledOnce();
    });

    it("adds an exercise from the picker and makes it active", async () => {
      setup();
      await start();
      await addExercise("Bench Press");

      const [insert] = queriesFor("exercises", "insert");
      expect(insert.payload).toEqual({ workout_id: "w1", name: "Bench Press", library_id: "lib-bench" });
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
      expect(btn("Log set 1")).toBeInTheDocument();
      expect(screen.getByText("0 lb")).toBeInTheDocument();
    });

    it("returns from the picker on cancel", async () => {
      setup();
      await start();
      fireEvent.click(btn("Add exercise"));
      fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
      expect(screen.getByText("Session live")).toBeInTheDocument();
    });

    it("stays in the picker if the exercise cannot be saved", async () => {
      const error = silenceErrors();
      setup();
      on("exercises", "insert", { error: { message: "nope" } });
      await start();
      fireEvent.click(btn("Add exercise"));
      fireEvent.click(await screen.findByText("Squat"));
      await vi.waitFor(() => expect(error).toHaveBeenCalled());
      expect(screen.getByText("Add exercise")).toBeInTheDocument();
      expect(screen.queryByText("Session live")).toBeNull();
    });

    describe("logging sets", () => {
      it("saves the set and shows it with the running volume", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("135");

        const [insert] = queriesFor("sets", "insert");
        expect(insert.payload).toEqual({ exercise_id: "ex1", set_number: 1, reps: 10, weight: 135 });
        expect(setRows()).toEqual([`1 | 135 lb × 10 reps | ${(1350).toLocaleString()}`]);
        expect(screen.getByText(`${(1350).toLocaleString()} lb`)).toBeInTheDocument();
        expect(btn("Log set 2")).toBeInTheDocument();
      });

      it("numbers sets in order and recalls the last one", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("135");
        press("Last");
        await logSet();

        expect(queriesFor("sets", "insert").map((q) => (q.payload as { set_number: number }).set_number)).toEqual([1, 2]);
        expect(setRows()).toHaveLength(2);
      });

      it("types each set's weight from scratch", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("100");
        await logSet("105");

        expect(queriesFor("sets", "insert").map((q) => (q.payload as { weight: number }).weight)).toEqual([100, 105]);
        expect(setRows().map((r) => r.split(" | ")[1])).toEqual(["100 lb × 10 reps", "105 lb × 10 reps"]);
      });

      it("disables logging while the set saves", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        const pending = deferred();
        on("sets", "insert", pending.promise);
        fireEvent.click(btn("Log set 1"));
        expect(btn("Saving…")).toBeDisabled();
        await act(async () =>
          pending.resolve({ data: { id: "s1", exercise_id: "ex1", set_number: 1, reps: 10, weight: 0 } }),
        );
        expect(btn("Log set 2")).toBeEnabled();
      });

      it("keeps the form and adds nothing when the save fails", async () => {
        const error = silenceErrors();
        setup();
        await start();
        await addExercise("Bench Press");
        on("sets", "insert", { error: { message: "nope" } });
        press("9", "5");
        fireEvent.click(btn("Log set 1"));
        await vi.waitFor(() => expect(error).toHaveBeenCalled());
        expect(setRows()).toEqual([]);
        expect(btn("Log set 1")).toBeEnabled();
        expect(screen.queryByText("Resting")).toBeNull();
      });

      it("resets the form for a newly added exercise", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        press("2", "2", "5");
        await addExercise("Squat");
        expect(btn("Decrease weight").nextElementSibling).toHaveTextContent("0");
        expect(btn("Decrease reps").nextElementSibling).toHaveTextContent("10");
      });
    });

    describe("rest timer", () => {
      it("starts after each set at 2:30 and shows what is next", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        expect(screen.queryByText("Resting")).toBeNull();
        await logSet("135");
        expect(screen.getByText("Resting")).toBeInTheDocument();
        expect(screen.getByText("02:30")).toBeInTheDocument();
        expect(screen.getByText("Bench Press · Set 2")).toBeInTheDocument();
      });

      it("can be skipped, and comes back after the next set", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("135");
        fireEvent.click(btn("Skip rest"));
        expect(screen.queryByText("Resting")).toBeNull();
        await logSet();
        expect(screen.getByText("Resting")).toBeInTheDocument();
      });
    });

    describe("deleting sets", () => {
      it("swipes open a set, deletes it and renumbers the rest", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("100");
        press("Increase weight");
        await logSet();
        expect(setRows()[1]).toMatch(/^2 \| 105 lb/);

        const firstRow = document.querySelector(".swipe-row")!.firstElementChild!;
        fireEvent.pointerDown(firstRow, { clientX: 0 });
        fireEvent.pointerUp(firstRow, { clientX: 0 });
        fireEvent.click(btn("Delete set 1"));

        await vi.waitFor(() => expect(setRows()).toHaveLength(1));
        const [del] = queriesFor("sets", "delete");
        expect(filterValue(del, "eq", "id")).toBe("set2");
        expect(setRows()[0]).toMatch(/^1 \| 105 lb/);
        expect(btn("Log set 2")).toBeInTheDocument();
      });

      it("keeps the set if the delete fails", async () => {
        const error = silenceErrors();
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("100");
        on("sets", "delete", { error: { message: "nope" } });
        fireEvent.click(screen.getByRole("button", { name: "Delete set 1", hidden: true }));
        await vi.waitFor(() => expect(error).toHaveBeenCalled());
        expect(setRows()).toHaveLength(1);
      });
    });

    describe("several exercises", () => {
      async function twoExercises() {
        setup();
        await start();
        await addExercise("Bench Press");
        await logSet("135");
        fireEvent.click(btn("Skip rest"));
        await addExercise("Squat");
      }

      const alsoList = () => screen.getByText("Also this session").parentElement!;

      it("lists the others with their set counts", async () => {
        await twoExercises();
        expect(within(alsoList()).getByText("Bench Press")).toBeInTheDocument();
        expect(within(alsoList()).getByText("1 sets")).toBeInTheDocument();
        expect(within(alsoList()).queryByText("Squat")).toBeNull();
      });

      it("switches the active exercise", async () => {
        await twoExercises();
        fireEvent.click(within(alsoList()).getByText("Bench Press"));
        expect(btn("Log set 2")).toBeInTheDocument();
        expect(setRows()).toHaveLength(1);
        expect(within(alsoList()).getByText("Squat")).toBeInTheDocument();
        expect(within(alsoList()).getByText("0 sets")).toBeInTheDocument();
      });

      it("deletes another exercise", async () => {
        await twoExercises();
        fireEvent.click(btn("Delete Bench Press"));
        await vi.waitFor(() => expect(screen.queryByText("Also this session")).toBeNull());
        const [del] = queriesFor("exercises", "delete");
        expect(filterValue(del, "eq", "id")).toBe("ex1");
        expect(screen.getByText("Squat")).toBeInTheDocument();
      });

      it("keeps an exercise if the delete fails", async () => {
        const error = silenceErrors();
        await twoExercises();
        on("exercises", "delete", { error: { message: "nope" } });
        fireEvent.click(btn("Delete Bench Press"));
        await vi.waitFor(() => expect(error).toHaveBeenCalled());
        expect(within(alsoList()).getByText("Bench Press")).toBeInTheDocument();
      });

      it("swap adds another exercise and makes it active", async () => {
        setup();
        await start();
        await addExercise("Bench Press");
        fireEvent.click(btn("Swap"));
        fireEvent.click(await screen.findByText("Squat"));
        await screen.findByText("Also this session");
        expect(within(alsoList()).getByText("Bench Press")).toBeInTheDocument();
      });
    });
  });

  describe("the clock", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }));
    afterEach(() => vi.useRealTimers());

    it("counts up and saves the duration on finish", async () => {
      const { onFinish } = setup();
      await start();
      act(() => vi.advanceTimersByTime(95_000));
      expect(screen.getByText("01:35")).toBeInTheDocument();

      fireEvent.click(btn("Finish workout"));
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
      const [update] = queriesFor("workouts", "update");
      expect(update.payload).toEqual({ duration_seconds: 95 });
      expect(filterValue(update, "eq", "id")).toBe("w1");
    });

    it("still finishes if the duration cannot be saved", async () => {
      const error = silenceErrors();
      const { onFinish } = setup();
      on("workouts", "update", { error: { message: "nope" } });
      await start();
      fireEvent.click(btn("Finish workout"));
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
      expect(error).toHaveBeenCalledWith("Duration save error:", { message: "nope" });
    });

    it("stops when the logger closes", async () => {
      const { unmount } = setup();
      await start();
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});

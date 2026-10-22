import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deferred, filterValue, on, queriesFor, resetSupabase } from "../helpers/supabase";
import ExercisePicker from "../../src/components/ExercisePicker";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

type Item = {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
  user_id: string | null;
};

const item = (id: string, name: string, rest: Partial<Item> = {}): Item => ({
  id,
  name,
  equipment: null,
  primary_muscles: [],
  user_id: null,
  ...rest,
});

const library: Item[] = [
  item("l1", "Bench Press", { equipment: "barbell", primary_muscles: ["chest"] }),
  item("l2", "Bicep Curl", { equipment: "dumbbell", primary_muscles: ["Biceps"], user_id: "user-1" }),
  item("l3", "Squat", { equipment: "barbell", primary_muscles: ["quadriceps", "glutes"] }),
  item("l4", "Plank"),
];

function setup(items: Item[] = library) {
  on("exercise_library", "select", { data: items });
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(<ExercisePicker userId="user-1" onAdd={onAdd} onCancel={onCancel} />);
  return { onAdd, onCancel };
}

const search = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText("Search the library"), { target: { value: text } });

/** Names of the listed exercises, top to bottom. */
const listed = () =>
  screen
    .queryAllByRole("button")
    .filter((b) => b.className.includes("text-left"))
    .map((b) => b.querySelector("span span span")!.textContent);

describe("ExercisePicker", () => {
  beforeEach(() => resetSupabase());

  it("loads the whole library alphabetically", async () => {
    setup();
    expect(screen.getByText("Loading library")).toBeInTheDocument();
    expect(await screen.findByText("4 matches")).toBeInTheDocument();
    const [q] = queriesFor("exercise_library", "select");
    expect(q.columns).toBe("id, name, equipment, primary_muscles, user_id");
    expect(filterValue(q, "order", "name")).toEqual({ ascending: true });
  });

  it("focuses the search box", async () => {
    setup();
    await screen.findByText("4 matches");
    expect(screen.getByPlaceholderText("Search the library")).toHaveFocus();
  });

  it("shows equipment and primary muscle, and marks custom exercises", async () => {
    setup();
    const bench = (await screen.findByText("Bench Press")).closest("button")!;
    expect(bench).toHaveTextContent("Barbell · Chest");
    expect(within(bench).queryByText("Custom")).toBeNull();

    const curl = screen.getByText("Bicep Curl").closest("button")!;
    expect(within(curl).getByText("Custom")).toBeInTheDocument();
    expect(curl).toHaveTextContent("Dumbbell · Biceps");

    const plank = screen.getByText("Plank").closest("button")!;
    expect(plank.querySelectorAll("span.block")).toHaveLength(0);
  });

  describe("muscle group chips", () => {
    it("filter the list, matching muscles case-insensitively", async () => {
      setup();
      await screen.findByText("4 matches");
      fireEvent.click(screen.getByRole("button", { name: "Arms" }));
      expect(listed()).toEqual(["Bicep Curl"]);
      fireEvent.click(screen.getByRole("button", { name: "Legs" }));
      expect(listed()).toEqual(["Squat"]);
      fireEvent.click(screen.getByRole("button", { name: "All" }));
      expect(listed()).toHaveLength(4);
    });

    it("highlight the selected chip", async () => {
      setup();
      await screen.findByText("4 matches");
      expect(screen.getByRole("button", { name: "All" })).toHaveClass("bg-accent");
      fireEvent.click(screen.getByRole("button", { name: "Core" }));
      expect(screen.getByRole("button", { name: "Core" })).toHaveClass("bg-accent");
      expect(screen.getByRole("button", { name: "All" })).not.toHaveClass("bg-accent");
    });

    it("combine with search", async () => {
      setup();
      await screen.findByText("4 matches");
      fireEvent.click(screen.getByRole("button", { name: "Chest" }));
      search("squat");
      expect(listed()).toEqual([]);
      expect(screen.getByText("No matches.")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("ranks exact, then starts-with, then word-start, then contains", async () => {
      setup([
        item("a", "Legpress"),
        item("b", "Overhead Press"),
        item("c", "Bench Press"),
        item("d", "Press Machine"),
        item("e", "Press"),
        item("f", "Squat"),
      ]);
      await screen.findByText("6 matches");
      search("  PRESS ");
      expect(listed()).toEqual([
        "Press",
        "Press Machine",
        "Bench Press",
        "Overhead Press",
        "Legpress",
      ]);
      expect(screen.getByText("5 matches")).toBeInTheDocument();
    });

    it("shows at most 50 results", async () => {
      setup(Array.from({ length: 60 }, (_, i) => item("x" + i, "Row " + String(i).padStart(2, "0"))));
      expect(await screen.findByText("50 matches")).toBeInTheDocument();
    });

    it("says when nothing matches", async () => {
      setup();
      await screen.findByText("4 matches");
      search("zzz");
      expect(screen.getByText("No matches.")).toBeInTheDocument();
    });

    it("prompts for a search when the library is empty", async () => {
      setup([]);
      expect(await screen.findByText("Start typing to search.")).toBeInTheDocument();
    });
  });

  describe("choosing an exercise", () => {
    it("adds it by name and library id", async () => {
      const { onAdd } = setup();
      fireEvent.click(await screen.findByText("Squat"));
      expect(onAdd).toHaveBeenCalledExactlyOnceWith("Squat", "l3");
    });

    it("ignores further taps until the add finishes", async () => {
      const { promise, resolve } = deferred<void>();
      on("exercise_library", "select", { data: library });
      const onAdd = vi.fn(() => promise);
      render(<ExercisePicker userId="user-1" onAdd={onAdd} onCancel={() => {}} />);

      fireEvent.click(await screen.findByText("Squat"));
      expect(screen.getByText("Bench Press").closest("button")).toBeDisabled();
      fireEvent.click(screen.getByText("Bench Press"));
      expect(onAdd).toHaveBeenCalledOnce();

      await act(async () => resolve());
      expect(screen.getByText("Bench Press").closest("button")).toBeEnabled();
    });
  });

  describe("creating a custom exercise", () => {
    it("is offered when the search has no exact match", async () => {
      setup();
      await screen.findByText("4 matches");
      expect(screen.queryByText(/Create/)).toBeNull();
      search("  Zercher Squat ");
      expect(screen.getByRole("button", { name: "Create “Zercher Squat”" })).toBeInTheDocument();
    });

    it("is not offered for an exact match, ignoring case", async () => {
      setup();
      await screen.findByText("4 matches");
      search("bench press");
      expect(screen.queryByText(/Create/)).toBeNull();
    });

    it("saves it to the user's library, then adds it", async () => {
      on("exercise_library", "insert", (q) => ({
        data: item("new-1", (q.payload as Item).name, { user_id: "user-1" }),
      }));
      const { onAdd } = setup();
      await screen.findByText("4 matches");
      search(" Zercher Squat ");
      fireEvent.click(screen.getByRole("button", { name: /Create/ }));

      await vi.waitFor(() => expect(onAdd).toHaveBeenCalledWith("Zercher Squat", "new-1"));
      const [insert] = queriesFor("exercise_library", "insert");
      expect(insert.payload).toEqual({ user_id: "user-1", name: "Zercher Squat" });
      expect(insert.single).toBe(true);
      // It is now in the list, so the create button goes away.
      expect(screen.getByText("Zercher Squat").closest("button")).toHaveTextContent("Custom");
      expect(screen.queryByText(/Create/)).toBeNull();
    });

    it("does not add anything when the save fails", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      on("exercise_library", "insert", { error: { message: "nope" } });
      const { onAdd } = setup();
      await screen.findByText("4 matches");
      search("Zercher Squat");
      fireEvent.click(screen.getByRole("button", { name: /Create/ }));

      await vi.waitFor(() => expect(error).toHaveBeenCalledWith({ message: "nope" }));
      expect(onAdd).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Create/ })).toBeEnabled();
    });
  });

  it("logs a failed load and shows an empty list", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    on("exercise_library", "select", { error: { message: "offline" } });
    render(<ExercisePicker userId="user-1" onAdd={() => {}} onCancel={() => {}} />);
    expect(await screen.findByText("0 matches")).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith({ message: "offline" });
  });

  it("cancels", () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it } from "vitest";
import {
  clearActiveWorkout,
  loadActiveWorkout,
  saveActiveWorkout,
} from "../../src/lib/activeWorkout";

const active = {
  userId: "user-1",
  workoutId: "w1",
  startTime: 1_700_000_000_000,
  name: "Push day",
  activeExerciseId: "e1",
};

describe("activeWorkout", () => {
  it("is empty by default", () => {
    expect(loadActiveWorkout("user-1")).toBeNull();
  });

  it("round-trips a saved workout", () => {
    saveActiveWorkout(active);
    expect(loadActiveWorkout("user-1")).toEqual(active);
  });

  it("is cleared", () => {
    saveActiveWorkout(active);
    clearActiveWorkout();
    expect(loadActiveWorkout("user-1")).toBeNull();
  });

  it("ignores another user's workout", () => {
    saveActiveWorkout(active);
    expect(loadActiveWorkout("user-2")).toBeNull();
  });

  it("ignores corrupt or incomplete data", () => {
    localStorage.setItem("teretana.activeWorkout", "{not json");
    expect(loadActiveWorkout("user-1")).toBeNull();
    localStorage.setItem("teretana.activeWorkout", JSON.stringify({ userId: "user-1" }));
    expect(loadActiveWorkout("user-1")).toBeNull();
  });
});

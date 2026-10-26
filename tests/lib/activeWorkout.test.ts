import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AGE_MS,
  clearActiveWorkout,
  loadActiveWorkout,
  saveActiveWorkout,
} from "../../src/lib/activeWorkout";

const active = {
  userId: "user-1",
  workoutId: "w1",
  startTime: Date.now(),
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

  it.each([
    ["a non-string name", { name: 42 }],
    ["a missing name", { name: undefined }],
    ["a non-string active exercise", { activeExerciseId: { id: "e1" } }],
  ])("ignores %s", (_label, overrides) => {
    localStorage.setItem("teretana.activeWorkout", JSON.stringify({ ...active, ...overrides }));
    expect(loadActiveWorkout("user-1")).toBeNull();
  });

  describe("expiry", () => {
    afterEach(() => vi.useRealTimers());

    it("keeps a session up to 12 hours old", () => {
      vi.useFakeTimers({ now: active.startTime + MAX_AGE_MS });
      saveActiveWorkout(active);
      expect(loadActiveWorkout("user-1")).toEqual(active);
    });

    it("drops and clears an older one", () => {
      vi.useFakeTimers({ now: active.startTime + MAX_AGE_MS + 1 });
      saveActiveWorkout(active);
      expect(loadActiveWorkout("user-1")).toBeNull();
      expect(localStorage.getItem("teretana.activeWorkout")).toBeNull();
    });
  });
});

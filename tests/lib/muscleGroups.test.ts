import { describe, expect, it } from "vitest";
import { GROUP_MUSCLES, MUSCLE_GROUPS, OTHER_GROUP, groupForMuscles } from "../../src/lib/muscleGroups";

describe("groupForMuscles", () => {
  it.each([
    [["chest"], "Chest"],
    [["lower back"], "Back"],
    [["traps"], "Back"],
    [["quadriceps"], "Legs"],
    [["calves"], "Legs"],
    [["triceps"], "Arms"],
    [["shoulders"], "Shoulders"],
    [["abdominals"], "Core"],
    [["cardio"], "Cardio"],
  ])("maps %j to %s", (muscles, group) => {
    expect(groupForMuscles(muscles)).toBe(group);
  });

  it("ignores case", () => {
    expect(groupForMuscles(["Hamstrings"])).toBe("Legs");
  });

  it("uses the first group in MUSCLE_GROUPS order when muscles span groups", () => {
    // Chest is listed before Arms, regardless of the muscle order.
    expect(groupForMuscles(["triceps", "chest"])).toBe("Chest");
  });

  it("falls back to Other for empty, missing or unknown muscles", () => {
    expect(groupForMuscles([])).toBe(OTHER_GROUP);
    expect(groupForMuscles(null)).toBe(OTHER_GROUP);
    expect(groupForMuscles(undefined)).toBe(OTHER_GROUP);
    expect(groupForMuscles(["neck"])).toBe(OTHER_GROUP);
  });
});

describe("GROUP_MUSCLES", () => {
  it("lists every chip in MUSCLE_GROUPS, with Other kept separate", () => {
    expect(MUSCLE_GROUPS).toEqual(Object.keys(GROUP_MUSCLES));
    expect(MUSCLE_GROUPS).not.toContain(OTHER_GROUP);
  });

  it("stores db muscle names in lowercase so lookups can lowercase input", () => {
    for (const muscles of Object.values(GROUP_MUSCLES)) {
      for (const m of muscles) expect(m).toBe(m.toLowerCase());
    }
  });
});

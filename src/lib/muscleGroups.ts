// Filter chips -> the db's primary_muscle values (the db has no "legs"/"arms"/"core").
export const GROUP_MUSCLES: Record<string, string[]> = {
  Chest: ["chest"],
  Back: ["back", "lower back", "traps"],
  Legs: ["quadriceps", "hamstrings", "glutes", "calves", "adductors"],
  Arms: ["biceps", "triceps", "forearms"],
  Shoulders: ["shoulders"],
  Core: ["abdominals"],
  Cardio: ["cardio"],
};

export const MUSCLE_GROUPS = Object.keys(GROUP_MUSCLES);

// Exercises with no (or unrecognized) primary muscles fall in here, sorted last.
export const OTHER_GROUP = "Other";

export function groupForMuscles(muscles: string[] | null | undefined): string {
  const lower = (muscles ?? []).map((m) => m.toLowerCase());
  for (const group of MUSCLE_GROUPS) {
    if (GROUP_MUSCLES[group].some((m) => lower.includes(m))) return group;
  }
  return OTHER_GROUP;
}

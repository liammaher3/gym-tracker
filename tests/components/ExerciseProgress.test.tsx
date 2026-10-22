import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExerciseProgress from "../../src/components/ExerciseProgress";
import type { WeightPoint } from "../../src/components/WeightChart";

const points: WeightPoint[] = [
  { date: "2026-09-01T12:00:00.000Z", weight: 135, reps: 8 },
  { date: "2026-09-08T12:00:00.000Z", weight: 155, reps: 5 },
  { date: "2026-09-15T12:00:00.000Z", weight: 155, reps: 6 },
  { date: "2026-09-22T12:00:00.000Z", weight: 145, reps: 8 },
];

const statFor = (label: string) => screen.getByText(label).previousElementSibling!;

function setup(pts = points) {
  const onBack = vi.fn();
  render(<ExerciseProgress name="Bench Press" points={pts} onBack={onBack} />);
  return { onBack };
}

describe("ExerciseProgress", () => {
  it("names the exercise", () => {
    setup();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("shows the latest top set as current", () => {
    setup();
    expect(statFor("Current top set")).toHaveTextContent("145 lb × 8");
  });

  it("shows the heaviest top set as best, breaking ties on reps", () => {
    setup();
    expect(statFor("Best")).toHaveTextContent("155 lb × 6");
  });

  it("shows a gain since the first log in green", () => {
    setup();
    expect(statFor("Since first log")).toHaveTextContent("+10 lb");
    expect(statFor("Since first log")).toHaveClass("text-success");
  });

  it("shows a loss in red", () => {
    setup([points[1], points[0]]);
    expect(statFor("Since first log")).toHaveTextContent("-20 lb");
    expect(statFor("Since first log")).toHaveClass("text-danger");
  });

  it("shows no change neutrally", () => {
    setup([points[0]]);
    expect(statFor("Since first log")).toHaveTextContent("0 lb");
    expect(statFor("Since first log")).not.toHaveClass("text-success", "text-danger");
  });

  it("lists every session, newest first", () => {
    setup();
    expect(screen.getByText("Sessions (4)")).toBeInTheDocument();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.lastElementChild!.textContent)).toEqual([
      "145 lb × 8",
      "155 lb × 6",
      "155 lb × 5",
      "135 lb × 8",
    ]);
    const firstDate = new Date(points[3].date).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    expect(rows[0].firstElementChild).toHaveTextContent(firstDate);
  });

  it("draws the chart", () => {
    const { container } = render(
      <ExerciseProgress name="Squat" points={points} onBack={() => {}} />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(4);
  });

  it("goes back to Progress", () => {
    const { onBack } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WeightChart, { type WeightPoint } from "../../src/components/WeightChart";

// The test setup's ResizeObserver reports a 300×190 box, so with the chart's
// padding the three points below sit at x = 8, 148 and 288.
const points: WeightPoint[] = [
  { date: "2026-09-01T12:00:00.000Z", weight: 100, reps: 10 },
  { date: "2026-09-15T12:00:00.000Z", weight: 150, reps: 8 },
  { date: "2026-10-01T12:00:00.000Z", weight: 120, reps: 6 },
];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function setup(pts = points, unit?: string) {
  const { container } = render(<WeightChart points={pts} unit={unit} />);
  const chart = container.firstElementChild as HTMLElement;
  return { container, chart };
}

const tooltip = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".pointer-events-none");

describe("WeightChart", () => {
  it("plots one dot per session joined by a line over a filled area", () => {
    const { container } = setup();
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelectorAll("path")).toHaveLength(2);
  });

  it("draws a lone session as a dot with no fill", () => {
    const { container } = setup([points[0]]);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelectorAll("path")).toHaveLength(1);
    expect(container.querySelector("circle")).toHaveAttribute("cx", "148");
  });

  it("labels a padded y-axis around the data", () => {
    setup();
    // 100–150 with a 25% cushion → 87.5–162.5, rounded outward.
    for (const label of ["163", "125", "87"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("keeps the y-axis at or above zero with at least 5 lb of cushion", () => {
    setup([
      { ...points[0], weight: 2 },
      { ...points[1], weight: 2 },
    ]);
    for (const label of ["7", "4", "0"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("labels the first and last dates", () => {
    setup();
    expect(screen.getByText(shortDate(points[0].date))).toBeInTheDocument();
    expect(screen.getByText(shortDate(points[2].date))).toBeInTheDocument();
    expect(screen.queryByText(shortDate(points[1].date))).toBeNull();
  });

  it("shows nothing when there are no points", () => {
    const { container } = setup([]);
    expect(container.querySelector("svg")).toBeNull();
  });

  describe("scrubbing", () => {
    it("shows the session nearest the pointer", () => {
      const { container, chart } = setup();
      fireEvent.pointerMove(chart, { clientX: 160 });
      expect(tooltip(container)).toHaveTextContent("150 lb × 8");
      expect(tooltip(container)).toHaveTextContent(fullDate(points[1].date));
      expect(tooltip(container)!.style.transform).toBe("translate(-50%, -100%)");
      expect(container.querySelector("line[stroke-dasharray]")).toHaveAttribute("x1", "148");
    });

    it("starts on press, for touch", () => {
      const { container, chart } = setup();
      fireEvent.pointerDown(chart, { clientX: 0 });
      expect(tooltip(container)).toHaveTextContent("100 lb × 10");
    });

    it("enlarges the hovered dot", () => {
      const { container, chart } = setup();
      fireEvent.pointerMove(chart, { clientX: 290 });
      const radii = [...container.querySelectorAll("circle")].map((c) => c.getAttribute("r"));
      expect(radii).toEqual(["2.5", "2.5", "4.5"]);
    });

    it("keeps the tooltip inside the chart at either edge", () => {
      const { container, chart } = setup();
      fireEvent.pointerMove(chart, { clientX: 5 });
      expect(tooltip(container)!.style.transform).toBe("translate(0, -100%)");
      fireEvent.pointerMove(chart, { clientX: 295 });
      expect(tooltip(container)!.style.transform).toBe("translate(-100%, -100%)");
    });

    it("hides when the pointer leaves", () => {
      const { container, chart } = setup();
      fireEvent.pointerMove(chart, { clientX: 150 });
      fireEvent.pointerLeave(chart);
      expect(tooltip(container)).toBeNull();
      expect(container.querySelector("line[stroke-dasharray]")).toBeNull();
    });

    it("uses the given unit", () => {
      const { container, chart } = setup(points, "kg");
      fireEvent.pointerMove(chart, { clientX: 150 });
      expect(tooltip(container)).toHaveTextContent("150 kg × 8");
    });
  });
});

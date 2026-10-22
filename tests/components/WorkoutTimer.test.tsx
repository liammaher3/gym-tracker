import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkoutTimer from "../../src/components/WorkoutTimer";

describe("WorkoutTimer", () => {
  describe("compact", () => {
    it.each([
      [0, "00:00"],
      [65, "01:05"],
      [3599, "59:59"],
    ])("shows %is as mm:ss", (secs, text) => {
      render(<WorkoutTimer elapsedSeconds={secs} compact />);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText("Elapsed")).toBeInTheDocument();
    });

    it("adds hours once past an hour", () => {
      render(<WorkoutTimer elapsedSeconds={3725} compact />);
      expect(screen.getByText("01:02:05")).toBeInTheDocument();
    });
  });

  describe("full", () => {
    it("shows padded hours, minutes and seconds cells", () => {
      render(<WorkoutTimer elapsedSeconds={3725} />);
      for (const [value, label] of [
        ["01", "hrs"],
        ["02", "min"],
        ["05", "sec"],
      ]) {
        expect(screen.getByText(label).previousElementSibling).toHaveTextContent(value);
      }
    });
  });
});

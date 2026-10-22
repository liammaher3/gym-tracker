import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import SetEntryPanel from "../../src/components/SetEntryPanel";

type Values = { weight: number; reps: number };

/** SetEntryPanel is controlled; hold its values the way WorkoutLogger does. */
function setup({
  initial = { weight: 135, reps: 10 },
  last = null as Values | null,
  saving = false,
} = {}) {
  const onChange = vi.fn();
  const onLog = vi.fn();
  function Harness() {
    const [v, setV] = useState(initial);
    return (
      <SetEntryPanel
        weight={v.weight}
        reps={v.reps}
        setNumber={3}
        last={last}
        saving={saving}
        onChange={(next) => {
          onChange(next);
          setV(next);
        }}
        onLog={onLog}
      />
    );
  }
  render(<Harness />);
  return { onChange, onLog };
}

const btn = (name: string | RegExp) => screen.getByRole("button", { name });
const press = (...names: string[]) => names.forEach((n) => fireEvent.click(btn(n)));
const weight = () => btn("Decrease weight").nextElementSibling!;
const reps = () => btn("Decrease reps").nextElementSibling!;

describe("SetEntryPanel", () => {
  it("shows the current weight and reps, aimed at weight", () => {
    setup();
    expect(weight()).toHaveTextContent("135");
    expect(reps()).toHaveTextContent("10");
    expect(weight()).toHaveClass("text-accent");
    expect(reps()).not.toHaveClass("text-accent");
  });

  describe("steppers", () => {
    it("nudge weight by 5 and reps by 1", () => {
      setup();
      press("Increase weight", "Increase weight", "Decrease reps");
      expect(weight()).toHaveTextContent("145");
      expect(reps()).toHaveTextContent("9");
    });

    it("never take weight below 0 or reps below 1", () => {
      setup({ initial: { weight: 3, reps: 1 } });
      press("Decrease weight", "Decrease reps");
      expect(weight()).toHaveTextContent("0");
      expect(reps()).toHaveTextContent("1");
    });

    it("do not move the keypad's aim", () => {
      setup();
      press("Increase reps", "5");
      expect(weight()).toHaveTextContent("5");
      expect(reps()).toHaveTextContent("11");
    });
  });

  describe("keypad", () => {
    it("replaces the aimed value with typed digits", () => {
      const { onChange } = setup();
      press("2", "2", "5");
      expect(weight()).toHaveTextContent("225");
      expect(onChange).toHaveBeenLastCalledWith({ weight: 225, reps: 10 });
    });

    it("caps entry at four digits", () => {
      setup();
      press("1", "2", "3", "4", "5");
      expect(weight()).toHaveTextContent("1234");
    });

    it("can type a zero", () => {
      setup();
      press("1", "0", "0");
      expect(weight()).toHaveTextContent("100");
    });

    it("moves to reps with Next field, and back again", () => {
      setup();
      fireEvent.click(btn(/next/i));
      expect(reps()).toHaveClass("text-accent");
      press("8");
      expect(reps()).toHaveTextContent("8");
      fireEvent.click(btn(/next/i));
      expect(weight()).toHaveClass("text-accent");
    });

    it("aims at a field when it is tapped", () => {
      setup();
      fireEvent.click(screen.getByText("Reps"));
      press("1", "2");
      expect(reps()).toHaveTextContent("12");
      expect(weight()).toHaveTextContent("135");
    });

    it("starts a fresh entry after a stepper nudge", () => {
      setup();
      press("2", "Increase weight", "1");
      expect(weight()).toHaveTextContent("1");
    });

    it("backspaces the shown value", () => {
      const { onChange } = setup();
      press("Backspace");
      expect(weight()).toHaveTextContent("13");
      press("Backspace", "Backspace");
      expect(weight()).toHaveTextContent("");
      expect(onChange).toHaveBeenLastCalledWith({ weight: 0, reps: 10 });
    });

    it("backspaces reps when aimed there", () => {
      setup();
      fireEvent.click(btn(/next/i));
      press("Backspace");
      expect(reps()).toHaveTextContent("1");
      expect(weight()).toHaveTextContent("135");
    });

    it(".5 adds a half to the whole weight", () => {
      setup();
      press(".5");
      expect(weight()).toHaveTextContent("135.5");
      press(".5");
      expect(weight()).toHaveTextContent("135.5");
    });

    it(".5 applies to a weight being typed", () => {
      setup();
      press("2", "2", ".5");
      expect(weight()).toHaveTextContent("22.5");
    });

    it(".5 does nothing to reps", () => {
      const { onChange } = setup();
      fireEvent.click(btn(/next/i));
      press(".5");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("last set recall", () => {
    it("is disabled with no previous set", () => {
      setup();
      expect(btn("Last")).toBeDisabled();
    });

    it("copies the previous set", () => {
      setup({ last: { weight: 185, reps: 5 } });
      press("Last");
      expect(weight()).toHaveTextContent("185");
      expect(reps()).toHaveTextContent("5");
    });
  });

  describe("logging", () => {
    it("logs with the next set number", () => {
      const { onLog } = setup();
      press("Log set 3");
      expect(onLog).toHaveBeenCalledOnce();
    });

    it("is disabled while saving", () => {
      setup({ saving: true });
      expect(btn("Saving…")).toBeDisabled();
    });
  });

  describe("hidden keypad", () => {
    it("swaps the keypad for big log and repeat buttons", () => {
      const { onLog } = setup({ last: { weight: 95, reps: 12 } });
      press("Hide keypad");
      expect(screen.queryByRole("button", { name: "1" })).toBeNull();
      expect(btn("Type it")).toBeInTheDocument();

      press("Repeat last set");
      expect(weight()).toHaveTextContent("95");
      expect(reps()).toHaveTextContent("12");

      press("Log set 3");
      expect(onLog).toHaveBeenCalledOnce();

      press("Type it");
      expect(btn("1")).toBeInTheDocument();
    });

    it("disables repeat with no previous set", () => {
      setup();
      press("Hide keypad");
      expect(btn("Repeat last set")).toBeDisabled();
    });

    it("shows saving state", () => {
      setup({ saving: true });
      press("Hide keypad");
      expect(btn("Saving…")).toBeDisabled();
    });
  });
});

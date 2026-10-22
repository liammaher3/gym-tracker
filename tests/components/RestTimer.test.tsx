import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RestTimer from "../../src/components/RestTimer";

const upNext = { exercise: "Bench Press", setNumber: 3, weight: 135, reps: 10 };

function setup(minutes = 2, seconds = 30, next: typeof upNext | null = upNext) {
  const onStart = vi.fn();
  const onDismiss = vi.fn();
  render(
    <RestTimer
      initialMinutes={minutes}
      initialSeconds={seconds}
      onStart={onStart}
      onDismiss={onDismiss}
      upNext={next}
    />,
  );
  return { onStart, onDismiss };
}

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const btn = (name: string) => screen.getByRole("button", { name });
/** The tappable countdown that reveals the ±30s adjusters. */
const bar = () => screen.getByRole("button", { expanded: false });
const progress = () =>
  (document.querySelector('[style*="width"]') as HTMLElement).style.width;

describe("RestTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts counting from the initial time and remembers it", () => {
    const { onStart } = setup();
    expect(screen.getByText("02:30")).toBeInTheDocument();
    expect(screen.getByText("Resting")).toBeInTheDocument();
    expect(onStart).toHaveBeenCalledExactlyOnceWith(2, 30);
  });

  it("shows what is up next", () => {
    setup();
    expect(screen.getByText("Bench Press · Set 3")).toBeInTheDocument();
  });

  it("leaves out up next when there is none", () => {
    setup(2, 30, null);
    expect(screen.queryByText(/· Set/)).toBeNull();
  });

  it("counts down", () => {
    setup();
    tick(10_000);
    expect(screen.getByText("02:20")).toBeInTheDocument();
    tick(80_000);
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("fills the progress bar as time passes", () => {
    setup(1, 0);
    expect(progress()).toBe("0%");
    tick(30_000);
    expect(progress()).toBe("50%");
  });

  it("pauses and resumes from where it stopped", () => {
    setup();
    tick(10_000);
    fireEvent.click(btn("Pause"));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    tick(60_000);
    expect(screen.getByText("02:20")).toBeInTheDocument();

    fireEvent.click(btn("Resume"));
    expect(screen.getByText("Resting")).toBeInTheDocument();
    tick(5_000);
    expect(screen.getByText("02:15")).toBeInTheDocument();
  });

  it("skips the rest", () => {
    const { onDismiss } = setup();
    fireEvent.click(btn("Skip rest"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  describe("when the rest runs out", () => {
    it("says so and offers to get back to work", () => {
      const { onDismiss } = setup(0, 30);
      tick(30_000);
      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(screen.getByText("Rest done")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
      expect(progress()).toBe("100%");

      fireEvent.click(btn("Back to work"));
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("stays at zero", () => {
      setup(0, 5);
      tick(60_000);
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });
  });

  describe("adjusters", () => {
    it("are hidden until the bar is tapped", () => {
      setup();
      expect(screen.queryByText("+30s")).toBeNull();
      fireEvent.click(bar());
      expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
      expect(screen.getByText("+30s")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { expanded: true }));
      expect(screen.queryByText("+30s")).toBeNull();
    });

    it("open from the keyboard with Enter or Space", () => {
      setup();
      fireEvent.keyDown(bar(), { key: "Enter" });
      expect(screen.getByText("+30s")).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole("button", { expanded: true }), { key: " " });
      expect(screen.queryByText("+30s")).toBeNull();
      fireEvent.keyDown(bar(), { key: "a" });
      expect(screen.queryByText("+30s")).toBeNull();
    });

    it("add and remove 30 seconds", () => {
      setup();
      fireEvent.click(bar());
      fireEvent.click(screen.getByText("+30s"));
      expect(screen.getByText("03:00")).toBeInTheDocument();
      tick(1_000);
      expect(screen.getByText("02:59")).toBeInTheDocument();

      fireEvent.click(screen.getByText("−30s"));
      fireEvent.click(screen.getByText("−30s"));
      expect(screen.getByText("01:59")).toBeInTheDocument();
      tick(1_000);
      expect(screen.getByText("01:58")).toBeInTheDocument();
    });

    it("never go below zero", () => {
      setup(0, 20);
      fireEvent.click(bar());
      fireEvent.click(screen.getByText("−30s"));
      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(screen.getByText("Rest done")).toBeInTheDocument();
    });

    it("restart a finished rest with +30s", () => {
      setup(0, 10);
      tick(20_000);
      expect(screen.getByText("Rest done")).toBeInTheDocument();

      fireEvent.click(bar());
      fireEvent.click(screen.getByText("+30s"));
      expect(screen.getByText("00:30")).toBeInTheDocument();
      expect(screen.getByText("Resting")).toBeInTheDocument();
      expect(progress()).toBe("0%");
      tick(15_000);
      expect(screen.getByText("00:15")).toBeInTheDocument();
      expect(progress()).toBe("50%");
    });

    it("adjust a paused rest without it running", () => {
      setup();
      fireEvent.click(btn("Pause"));
      fireEvent.click(bar());
      fireEvent.click(screen.getByText("+30s"));
      tick(10_000);
      expect(screen.getByText("03:00")).toBeInTheDocument();
      fireEvent.click(btn("Resume"));
      tick(10_000);
      expect(screen.getByText("02:50")).toBeInTheDocument();
    });
  });

  it("stops ticking once unmounted", () => {
    const { unmount } = render(
      <RestTimer initialMinutes={1} initialSeconds={0} onStart={() => {}} onDismiss={() => {}} />,
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

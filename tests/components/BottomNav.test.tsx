import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "../../src/components/BottomNav";

describe("BottomNav", () => {
  it("shows the three tabs in order", () => {
    render(<BottomNav activeTab="workout" onChange={() => {}} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Workout",
      "History",
      "Progress",
    ]);
  });

  it("highlights only the active tab", () => {
    render(<BottomNav activeTab="history" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "History" })).toHaveClass("text-accent");
    expect(screen.getByRole("button", { name: "Workout" })).not.toHaveClass("text-accent");
    expect(screen.getByRole("button", { name: "Progress" })).not.toHaveClass("text-accent");
  });

  it("reports the tapped tab, including the one already active", () => {
    const onChange = vi.fn();
    render(<BottomNav activeTab="workout" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    fireEvent.click(screen.getByRole("button", { name: "Workout" }));
    expect(onChange.mock.calls).toEqual([["progress"], ["workout"]]);
  });
});

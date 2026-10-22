import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SetRow from "../../src/components/SetRow";

function setup(open = false) {
  const onToggle = vi.fn();
  const onDelete = vi.fn();
  render(
    <SetRow index={2} weight={135} reps={10} open={open} onToggle={onToggle} onDelete={onDelete} />,
  );
  const row = screen.getByText("2").parentElement!;
  const del = screen.getByRole("button", { name: "Delete set 2", hidden: true });
  return { row, del, onToggle, onDelete };
}

/** Press at x=200, optionally move by dx, then release. */
function swipe(row: HTMLElement, dx: number | null) {
  fireEvent.pointerDown(row, { clientX: 200 });
  if (dx !== null) fireEvent.pointerMove(row, { clientX: 200 + dx });
  fireEvent.pointerUp(row, { clientX: 200 + (dx ?? 0) });
}

describe("SetRow", () => {
  it("shows the set number, weight, reps and volume", () => {
    const { row } = setup();
    expect(row).toHaveTextContent("135 lb × 10 reps");
    expect(row).toHaveTextContent((1350).toLocaleString());
  });

  it("hides the delete slab while closed", () => {
    const { del } = setup(false);
    expect(del).toHaveStyle({ width: "0px" });
    expect(del).toHaveAttribute("tabindex", "-1");
  });

  it("shows the delete slab while open", () => {
    const { del } = setup(true);
    expect(del).toHaveStyle({ width: "64px" });
    expect(del).toHaveAttribute("tabindex", "0");
  });

  it("toggles on a plain tap", () => {
    const { row, onToggle } = setup();
    swipe(row, null);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("treats a tiny wobble as a tap", () => {
    const { row, onToggle } = setup(true);
    swipe(row, -3);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("opens on a swipe left past the threshold", () => {
    const { row, onToggle } = setup(false);
    swipe(row, -40);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("snaps back without toggling on a short swipe left", () => {
    const { row, onToggle } = setup(false);
    swipe(row, -20);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("stays open on a swipe left when already open", () => {
    const { row, onToggle } = setup(true);
    swipe(row, -40);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("closes on a swipe right when open", () => {
    const { row, onToggle } = setup(true);
    swipe(row, 40);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("grows the slab with the drag, capped at its full width", () => {
    const { row, del } = setup(false);
    fireEvent.pointerDown(row, { clientX: 200 });
    fireEvent.pointerMove(row, { clientX: 180 });
    expect(del).toHaveStyle({ width: "20px" });
    fireEvent.pointerMove(row, { clientX: 50 });
    expect(del).toHaveStyle({ width: "64px" });
    fireEvent.pointerUp(row);
    expect(del).toHaveStyle({ width: "0px" }); // parent never opened it
  });

  it("ignores moves that did not start with a press", () => {
    const { row, del, onToggle } = setup(false);
    fireEvent.pointerMove(row, { clientX: 100 });
    fireEvent.pointerUp(row);
    expect(del).toHaveStyle({ width: "0px" });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("resolves a cancelled pointer like a release", () => {
    const { row, onToggle } = setup(false);
    fireEvent.pointerDown(row, { clientX: 200 });
    fireEvent.pointerMove(row, { clientX: 150 });
    fireEvent.pointerCancel(row);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("deletes from the slab", () => {
    const { del, onDelete, onToggle } = setup(true);
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });
});

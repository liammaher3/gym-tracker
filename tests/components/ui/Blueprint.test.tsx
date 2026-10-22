import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Blueprint from "../../../src/components/ui/Blueprint";

describe("Blueprint", () => {
  it("renders its children inside four corner marks", () => {
    const { container } = render(<Blueprint>Card body</Blueprint>);
    expect(screen.getByText("Card body")).toBeInTheDocument();
    expect(container.querySelectorAll(".corner")).toHaveLength(4);
    for (const pos of ["tl", "tr", "bl", "br"]) {
      expect(container.querySelector(".corner-" + pos)).not.toBeNull();
    }
  });

  it("is an outline by default and a slab when filled", () => {
    const { rerender } = render(<Blueprint>x</Blueprint>);
    expect(screen.getByText("x")).not.toHaveClass("bg-slab");
    rerender(<Blueprint filled>x</Blueprint>);
    expect(screen.getByText("x")).toHaveClass("bg-slab");
  });

  it("only looks clickable when it has a click handler", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Blueprint>x</Blueprint>);
    expect(screen.getByText("x")).not.toHaveClass("cursor-pointer");

    rerender(<Blueprint onClick={onClick}>x</Blueprint>);
    expect(screen.getByText("x")).toHaveClass("cursor-pointer");
    fireEvent.click(screen.getByText("x"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps caller classes", () => {
    render(<Blueprint className="px-4 flex">x</Blueprint>);
    expect(screen.getByText("x")).toHaveClass("relative", "border", "px-4", "flex");
  });
});

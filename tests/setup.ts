import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { installMatchMedia } from "./helpers/matchMedia";

// jsdom has no ResizeObserver. Report a fixed 300×190 box (WeightChart's
// container height) as soon as an element is observed.
export const OBSERVED_SIZE = { width: 300, height: 190 };

class FakeResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    this.cb(
      [{ target, contentRect: OBSERVED_SIZE } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

beforeEach(() => {
  installMatchMedia("dark");
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

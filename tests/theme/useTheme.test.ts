import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installMatchMedia, listenerCount, setColorScheme } from "../helpers/matchMedia";
import { useTheme } from "../../src/theme/useTheme";

const htmlTheme = () => document.documentElement.getAttribute("data-theme");

describe("useTheme", () => {
  it("starts dark when the OS is dark", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(htmlTheme()).toBe("dark");
  });

  it("starts light when the OS is light", () => {
    installMatchMedia("light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(htmlTheme()).toBe("light");
  });

  it("follows the OS setting live", () => {
    const { result } = renderHook(() => useTheme());
    setColorScheme("light");
    expect(result.current.theme).toBe("light");
    expect(htmlTheme()).toBe("light");
    setColorScheme("dark");
    expect(htmlTheme()).toBe("dark");
  });

  it("stops listening on unmount", () => {
    const { unmount } = renderHook(() => useTheme());
    expect(listenerCount()).toBe(1);
    unmount();
    expect(listenerCount()).toBe(0);
  });
});

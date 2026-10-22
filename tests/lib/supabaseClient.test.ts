import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, createClient } = vi.hoisted(() => {
  const getSession = vi.fn();
  const createClient = vi.fn<(url: string, key: string, options: object) => unknown>(() => ({
    auth: { getSession },
  }));
  return { getSession, createClient };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("supabaseClient", () => {
  beforeEach(async () => {
    vi.resetModules();
    getSession.mockClear();
    createClient.mockClear();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    await import("../../src/lib/supabaseClient");
  });

  it("creates the client from env vars with a persisted, auto-refreshing session", () => {
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "anon-key", {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  });

  it("refreshes the session when the app returns to the foreground", () => {
    setVisibility("visible");
    expect(getSession).toHaveBeenCalled();
  });

  it("does nothing when the app is backgrounded", () => {
    setVisibility("hidden");
    expect(getSession).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { describe, expect, it, vi } from "vitest";
import { installMatchMedia, listenerCount, setColorScheme } from "../helpers/matchMedia";
import { supabase } from "../helpers/supabase";
import AuthPage from "../../src/components/Auth";

vi.mock("../../src/lib/supabaseClient", async () => (await import("../helpers/supabase")).supabaseModule);

const { AuthUI } = vi.hoisted(() => ({
  AuthUI: vi.fn((props: { theme: string }) => <div data-testid="auth-ui" data-theme={props.theme} />),
}));
vi.mock("@supabase/auth-ui-react", () => ({ Auth: AuthUI }));

const lastProps = () => AuthUI.mock.lastCall![0] as Record<string, unknown>;

describe("AuthPage", () => {
  it("shows the app name over the Supabase sign-in form", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { name: "Teretana" })).toBeInTheDocument();
    expect(screen.getByTestId("auth-ui")).toBeInTheDocument();
  });

  it("signs in by email only, through the app's client", () => {
    render(<AuthPage />);
    expect(lastProps()).toMatchObject({
      supabaseClient: supabase,
      providers: [],
      appearance: { theme: ThemeSupa },
    });
  });

  it("uses the dark form on a dark OS", () => {
    render(<AuthPage />);
    expect(screen.getByTestId("auth-ui")).toHaveAttribute("data-theme", "dark");
  });

  it("uses the default form on a light OS", () => {
    installMatchMedia("light");
    render(<AuthPage />);
    expect(screen.getByTestId("auth-ui")).toHaveAttribute("data-theme", "default");
  });

  it("follows the OS appearance live", () => {
    render(<AuthPage />);
    setColorScheme("light");
    expect(screen.getByTestId("auth-ui")).toHaveAttribute("data-theme", "default");
    setColorScheme("dark");
    expect(screen.getByTestId("auth-ui")).toHaveAttribute("data-theme", "dark");
  });

  it("stops listening on unmount", () => {
    const { unmount } = render(<AuthPage />);
    expect(listenerCount()).toBe(1);
    unmount();
    expect(listenerCount()).toBe(0);
  });
});

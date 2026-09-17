import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const query = () => window.matchMedia("(prefers-color-scheme: light)");

function currentTheme(): Theme {
  return query().matches ? "light" : "dark";
}

/**
 * Owns the data-theme attribute on <html>, mirroring the OS setting live.
 * There is no manual override — flipping the device's appearance updates the
 * app immediately, the same way Auth.tsx already tracks it for the login
 * screen. There are no `dark:` variants in the app — every component reads
 * tokens, and the tokens flip here.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const mq = query();
    const handler = () => setTheme(currentTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme };
}

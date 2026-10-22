import { act } from "@testing-library/react";

type Scheme = "light" | "dark";
type Listener = (e: MediaQueryListEvent) => void;

let scheme: Scheme = "dark";
let listeners: { media: string; fn: Listener }[] = [];

const matches = (media: string) => media.includes(`prefers-color-scheme: ${scheme}`);

/** jsdom has no matchMedia. This one answers prefers-color-scheme queries. */
export function installMatchMedia(initial: Scheme) {
  scheme = initial;
  listeners = [];
  window.matchMedia = (media: string) =>
    ({
      media,
      get matches() {
        return matches(media);
      },
      addEventListener: (_: string, fn: Listener) => listeners.push({ media, fn }),
      removeEventListener: (_: string, fn: Listener) => {
        listeners = listeners.filter((l) => l.fn !== fn);
      },
    }) as unknown as MediaQueryList;
}

/** Flip the OS appearance and notify every live listener. */
export function setColorScheme(next: Scheme) {
  scheme = next;
  act(() => {
    for (const { media, fn } of [...listeners]) {
      fn({ media, matches: matches(media) } as MediaQueryListEvent);
    }
  });
}

export const listenerCount = () => listeners.length;

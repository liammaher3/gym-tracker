import { useEffect, useRef, useState } from "react";
import Blueprint from "./ui/Blueprint";
import { Icon } from "./ui/Icons";

type Props = {
  initialMinutes: number;
  initialSeconds: number;
  /** Remembered for next time. */
  onStart: (minutes: number, seconds: number) => void;
  onDismiss: () => void;
  /** Shown in the UP NEXT strip. */
  upNext?: {
    exercise: string;
    setNumber: number;
    weight: number;
    reps: number;
  } | null;
};

const RADIUS = 118;
const CIRC = 2 * Math.PI * RADIUS; // 741.4

const fmt = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return m + ":" + s;
};

/**
 * Full-screen rest timer. Counts off Date.now() deltas so a throttled tab does
 * not drift. On completion the ring fills and the copy changes in place —
 * there is no window.alert (the old implementation's worst moment).
 */
export default function RestTimer({
  initialMinutes,
  initialSeconds,
  onStart,
  onDismiss,
  upNext,
}: Props) {
  const total = initialMinutes * 60 + initialSeconds;
  const [remaining, setRemaining] = useState(total);
  const [paused, setPaused] = useState(false);
  const [target, setTarget] = useState(total);
  const endRef = useRef<number>(0);

  useEffect(() => {
    endRef.current = Date.now() + total * 1000;
    onStart(initialMinutes, initialSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.round((endRef.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [paused]);

  const shift = (delta: number) => {
    endRef.current += delta * 1000;
    setTarget((t) => Math.max(0, t + delta));
    setRemaining((r) => Math.max(0, r + delta));
  };

  const togglePause = () => {
    if (paused) endRef.current = Date.now() + remaining * 1000;
    setPaused((p) => !p);
  };

  const done = remaining === 0;
  const offset = done ? 0 : CIRC * (remaining / Math.max(1, target));

  const chip =
    "border border-line px-[17px] py-[11px] font-body text-[12px] tracking-[.1em] " +
    "hover:border-accent hover:text-accent";

  return (
    <div className="grid-backdrop fixed inset-0 z-50 flex flex-col bg-ground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 34%, var(--accent-soft), transparent 70%)",
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center px-[30px]">
        <div className="font-body text-[9px] uppercase leading-none tracking-[.34em] text-accent">
          {done ? "Rest done" : paused ? "Paused" : "Recovering"}
        </div>

        <div className="relative mt-[26px] grid h-[250px] w-[250px] place-items-center">
          <svg
            width="250"
            height="250"
            viewBox="0 0 250 250"
            className="absolute inset-0 -rotate-90"
          >
            <circle
              cx="125"
              cy="125"
              r={RADIUS}
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
            />
            <circle
              cx="125"
              cy="125"
              r={RADIUS}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset .3s linear" }}
            />
          </svg>
          {/* Registration ticks at the quarters. */}
          <svg
            width="250"
            height="250"
            viewBox="0 0 250 250"
            className="absolute inset-0 opacity-50"
          >
            <g stroke="var(--accent)" strokeWidth="1">
              <line x1="125" y1="10" x2="125" y2="22" />
              <line x1="240" y1="125" x2="228" y2="125" />
              <line x1="125" y1="240" x2="125" y2="228" />
              <line x1="10" y1="125" x2="22" y2="125" />
            </g>
          </svg>
          <div className="text-center">
            <div className="tnum font-head text-[74px] leading-none tracking-[.02em]">
              {fmt(remaining)}
            </div>
            <div className="mt-3 font-body text-[9.5px] uppercase leading-none tracking-[.24em] text-dim">
              of {fmt(target)}
            </div>
          </div>
        </div>

        <div className="mt-[34px] flex gap-[9px]">
          <button type="button" className={chip} onClick={() => shift(-30)}>
            −30s
          </button>
          <button type="button" className={chip} onClick={() => shift(30)}>
            +30s
          </button>
          <button type="button" className={chip} onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </button>
        </div>

        {upNext ? (
          <Blueprint className="mt-10 flex w-full items-center justify-between px-[18px] py-[15px]">
            <div>
              <div className="font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
                Up next
              </div>
              <div className="mt-2 font-head text-[19px] uppercase leading-none tracking-[.05em]">
                {upNext.exercise} · Set {upNext.setNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="tnum font-body text-[15px] leading-none">
                {upNext.weight} × {upNext.reps}
              </div>
              <div className="mt-[7px] font-body text-[9px] uppercase leading-none tracking-[.16em] text-dim">
                Target
              </div>
            </div>
          </Blueprint>
        ) : null}
      </div>

      <div className="relative flex-none px-[30px] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-[56px] w-full items-center justify-center gap-2.5 bg-accent font-head text-[17px] uppercase tracking-[.2em] text-on-accent hover:bg-accent-hot"
        >
          {done ? <Icon.Check size={18} /> : <Icon.Timer size={18} />}
          {done ? "Back to work" : "Skip rest"}
        </button>
        <div className="mt-4 text-center font-body text-[10px] uppercase tracking-[.14em] text-dim">
          Default {fmt(initialMinutes * 60 + initialSeconds)} · change in
          settings
        </div>
      </div>
    </div>
  );
}

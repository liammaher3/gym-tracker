import { useEffect, useRef, useState } from "react";
import Blueprint from "./ui/Blueprint";
import { Icon } from "./ui/Icons";

type Props = {
  initialMinutes: number;
  initialSeconds: number;
  /** Remembered for next time. */
  onStart: (minutes: number, seconds: number) => void;
  onDismiss: () => void;
  /** Shown next to the countdown. */
  upNext?: {
    exercise: string;
    setNumber: number;
    weight: number;
    reps: number;
  } | null;
};

const fmt = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return m + ":" + s;
};

/**
 * Compact rest-timer bar, anchored above the bottom nav. Counts off
 * Date.now() deltas so a throttled tab does not drift. Unlike the old
 * full-screen modal, this never blocks the rest of the app — logging a set,
 * swapping exercises, even switching tabs all stay reachable mid-rest. Tap
 * the bar to reveal the +/- 30s adjusters; pause and skip are always one
 * tap away.
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
  const [expanded, setExpanded] = useState(false);
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
      // Keep ticking at zero so +30s after the rest ends counts down again.
      setRemaining(left);
    }, 250);
    return () => clearInterval(id);
  }, [paused]);

  const shift = (delta: number) => {
    // Once the rest is over, the end time is in the past: extend from now.
    endRef.current = Math.max(endRef.current, Date.now()) + delta * 1000;
    setTarget((t) => Math.max(0, remaining === 0 ? delta : t + delta));
    setRemaining((r) => Math.max(0, r + delta));
  };

  const togglePause = () => {
    if (paused) endRef.current = Date.now() + remaining * 1000;
    setPaused((p) => !p);
  };

  const toggleExpanded = () => setExpanded((e) => !e);
  const onToggleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded();
    }
  };

  const done = remaining === 0;
  const pct = done ? 1 : 1 - remaining / Math.max(1, target);

  const adjustChip =
    "flex-1 border border-line py-2 font-body text-[11px] tracking-[.1em] " +
    "hover:border-accent hover:text-accent";

  return (
    <div
      className="fixed inset-x-0 z-40 px-[14px]"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      <Blueprint
        className={
          "overflow-hidden bg-ground/95 shadow-lg backdrop-blur transition-colors" +
          (done ? " !border-success" : "")
        }
      >
        <div className={"h-[2px] w-full " + (done ? "bg-success/30" : "bg-line")}>
          <div
            className={"h-full transition-colors " + (done ? "bg-success" : "bg-accent")}
            style={{ width: `${pct * 100}%`, transition: "width .3s linear" }}
          />
        </div>

        <div className="flex items-center gap-3 px-[14px] py-[11px]">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={toggleExpanded}
            onKeyDown={onToggleKeyDown}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          >
            <div
              className={
                "tnum font-head text-[21px] leading-none tracking-[.02em]" +
                (done ? " text-success" : "")
              }
            >
              {fmt(remaining)}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={
                  "font-body text-[8px] uppercase leading-none tracking-[.2em]" +
                  (done ? " text-success" : " text-accent")
                }
              >
                {done ? "Rest done" : paused ? "Paused" : "Resting"}
              </div>
              {upNext ? (
                <div className="mt-[5px] truncate font-body text-[11px] leading-none text-dim">
                  {upNext.exercise} · Set {upNext.setNumber}
                </div>
              ) : null}
            </div>
            <Icon.ChevronDown
              size={13}
              className={
                "shrink-0 text-dim transition-transform" +
                (expanded ? " rotate-180" : "")
              }
            />
          </div>

          {!done ? (
            <button
              type="button"
              aria-label={paused ? "Resume" : "Pause"}
              onClick={togglePause}
              className="grid h-8 w-8 shrink-0 place-items-center border border-line text-dim hover:border-accent hover:text-accent"
            >
              {paused ? <Icon.Play size={14} /> : <Icon.Pause size={14} />}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={done ? "Back to work" : "Skip rest"}
            onClick={onDismiss}
            className={
              "grid h-8 w-8 shrink-0 place-items-center text-on-accent transition-colors " +
              (done
                ? "bg-success hover:brightness-110"
                : "bg-accent hover:bg-accent-hot")
            }
          >
            {done ? <Icon.Check size={15} /> : <Icon.X size={15} />}
          </button>
        </div>

        {expanded ? (
          <div className="flex gap-[9px] border-t border-line px-[14px] py-[11px]">
            <button
              type="button"
              className={adjustChip}
              onClick={() => shift(-30)}
            >
              −30s
            </button>
            <button
              type="button"
              className={adjustChip}
              onClick={() => shift(30)}
            >
              +30s
            </button>
          </div>
        ) : null}
      </Blueprint>
    </div>
  );
}

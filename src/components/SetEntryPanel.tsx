import { useState } from "react";
import { Icon } from "./ui/Icons";

export type Field = "weight" | "reps";

type Props = {
  weight: number;
  reps: number;
  setNumber: number;
  /** Previous set on this exercise, for the LAST recall. */
  last?: { weight: number; reps: number } | null;
  saving?: boolean;
  onChange: (next: { weight: number; reps: number }) => void;
  onLog: () => void;
};

const WEIGHT_STEP = 5;
const REPS_STEP = 1;

/**
 * The approved set-entry panel (design ref: option 2a).
 *
 * Two mechanics, neither of them a mode you have to choose:
 *   • − / + steppers on both fields (weight ±5, reps ±1)
 *   • an in-app numeric keypad aimed at whichever field is lit
 *
 * The OS keyboard is never summoned — there is no <input> here on purpose.
 */
export default function SetEntryPanel({
  weight,
  reps,
  setNumber,
  last,
  saving = false,
  onChange,
  onLog,
}: Props) {
  const [active, setActive] = useState<Field>("weight");
  const [buffer, setBuffer] = useState<string | null>(null);
  const [padOpen, setPadOpen] = useState(true);

  const aim = (f: Field) => {
    setActive(f);
    setBuffer(null);
  };

  const commit = (f: Field, value: number) =>
    onChange({
      weight: f === "weight" ? value : weight,
      reps: f === "reps" ? value : reps,
    });

  const digit = (d: string) => {
    const next = ((buffer ?? "") + d).slice(0, 4);
    setBuffer(next);
    commit(active, Number(next));
  };

  const backspace = () => {
    const current = buffer ?? String(active === "weight" ? weight : reps);
    const next = current.slice(0, -1);
    setBuffer(next);
    commit(active, Number(next || 0));
  };

  const nudge = (f: Field, delta: number) => {
    const floor = f === "weight" ? 0 : 1;
    const value = Math.max(floor, (f === "weight" ? weight : reps) + delta);
    setBuffer(null);
    commit(f, value);
  };

  /** Half a plate per side. No-op on reps. */
  const half = () => active === "weight" && nudge("weight", 2.5);

  const recallLast = () => {
    if (!last) return;
    setBuffer(null);
    onChange({ weight: last.weight, reps: last.reps });
  };

  const display = (f: Field) => {
    const value = f === "weight" ? weight : reps;
    return buffer !== null && active === f ? buffer : String(value);
  };

  const cellClass = (f: Field) =>
    [
      "flex-1 cursor-pointer px-[10px] pt-[11px] pb-[13px]",
      active === f ? "bg-accent-soft" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const numeralClass = (f: Field) =>
    [
      "tnum flex-1 border-b-2 pb-[3px] text-center font-head text-[38px] leading-none",
      active === f
        ? "border-accent text-accent"
        : "border-transparent text-ink",
    ].join(" ");

  const stepper =
    "grid h-[38px] w-[38px] flex-none place-items-center border border-line text-ink " +
    "hover:border-accent hover:text-accent active:bg-accent-soft";

  const padKey =
    "border border-line font-head text-[22px] leading-none text-ink " +
    "hover:border-accent hover:bg-accent-soft";

  const padAux =
    "border border-line font-body text-[10px] uppercase leading-[1.35] tracking-[.12em] text-dim " +
    "hover:border-accent hover:bg-accent-soft hover:text-accent";

  const primary =
    "w-full bg-accent font-head uppercase tracking-[.2em] text-on-accent " +
    "hover:bg-accent-hot disabled:opacity-45";

  return (
    <>
      {/* ── the two fields ─────────────────────────────────────────── */}
      <div className="mt-4 flex border border-line">
        <div
          className={cellClass("weight") + " border-r border-line"}
          onClick={() => aim("weight")}
        >
          <div className="font-body text-[8.5px] uppercase leading-none tracking-[.22em] text-dim">
            Weight lb
          </div>
          <div className="mt-2 flex items-center justify-between gap-1.5">
            <button
              type="button"
              aria-label="Decrease weight"
              className={stepper}
              onClick={(e) => {
                e.stopPropagation();
                nudge("weight", -WEIGHT_STEP);
              }}
            >
              <Icon.Minus size={15} />
            </button>
            <span className={numeralClass("weight")}>{display("weight")}</span>
            <button
              type="button"
              aria-label="Increase weight"
              className={stepper}
              onClick={(e) => {
                e.stopPropagation();
                nudge("weight", WEIGHT_STEP);
              }}
            >
              <Icon.Plus size={15} />
            </button>
          </div>
        </div>

        <div className={cellClass("reps")} onClick={() => aim("reps")}>
          <div className="font-body text-[8.5px] uppercase leading-none tracking-[.22em] text-dim">
            Reps
          </div>
          <div className="mt-2 flex items-center justify-between gap-1.5">
            <button
              type="button"
              aria-label="Decrease reps"
              className={stepper}
              onClick={(e) => {
                e.stopPropagation();
                nudge("reps", -REPS_STEP);
              }}
            >
              <Icon.Minus size={15} />
            </button>
            <span className={numeralClass("reps")}>{display("reps")}</span>
            <button
              type="button"
              aria-label="Increase reps"
              className={stepper}
              onClick={(e) => {
                e.stopPropagation();
                nudge("reps", REPS_STEP);
              }}
            >
              <Icon.Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5 pb-2.5 pt-[9px]">
        <span className="font-body text-[9.5px] uppercase leading-none tracking-[.14em] text-dim">
          Nudge ±5 / ±1 · or type below
        </span>
        <button
          type="button"
          onClick={() => {
            setPadOpen((o) => !o);
            setBuffer(null);
          }}
          className="flex items-center gap-[7px] py-1 font-body text-[10px] font-semibold uppercase tracking-[.16em] text-accent hover:text-accent-hot"
        >
          <Icon.Keypad size={14} />
          {padOpen ? "Hide keypad" : "Type it"}
        </button>
      </div>

      {/* ── keypad ─────────────────────────────────────────────────── */}
      {padOpen ? (
        <div className="-mx-[22px] border-t border-line bg-slab px-[14px] pb-[env(safe-area-inset-bottom)] pt-3">
          <div className="grid auto-rows-[50px] grid-cols-4 gap-2">
            {["1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                className={padKey}
                onClick={() => digit(d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              className={padAux + " row-span-2"}
              onClick={() => aim(active === "weight" ? "reps" : "weight")}
            >
              Next
              <br />
              field
            </button>
            {["4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                className={padKey}
                onClick={() => digit(d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              aria-label="Backspace"
              className={padAux + " row-span-2 grid place-items-center"}
              onClick={backspace}
            >
              <Icon.Backspace size={20} />
            </button>
            <button
              type="button"
              className="border border-line font-body text-[13px] text-dim hover:border-accent hover:bg-accent-soft"
              onClick={half}
            >
              .5
            </button>
            <button type="button" className={padKey} onClick={() => digit("0")}>
              0
            </button>
            <button
              type="button"
              className="border border-line font-body text-[10px] uppercase tracking-[.1em] text-dim hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-45"
              disabled={!last}
              onClick={recallLast}
            >
              Last
            </button>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onLog}
            className={primary + " mt-[9px] h-[54px] text-[17px]"}
          >
            {saving ? "Saving…" : "Log set " + setNumber}
          </button>
        </div>
      ) : (
        <div className="pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            disabled={saving}
            onClick={onLog}
            className={primary + " h-[58px] text-[18px]"}
          >
            {saving ? "Saving…" : "Log set " + setNumber}
          </button>
          <button
            type="button"
            disabled={!last}
            onClick={recallLast}
            className="mt-2 h-[44px] w-full border border-line font-body text-[11px] uppercase tracking-[.18em] text-dim hover:border-accent hover:text-accent disabled:opacity-45"
          >
            Repeat last set
          </button>
        </div>
      )}
    </>
  );
}

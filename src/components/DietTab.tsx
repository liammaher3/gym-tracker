import Blueprint from "./ui/Blueprint";
import { Icon } from "./ui/Icons";

const ROADMAP = [
  "Daily calorie + macro targets",
  "Quick-add meals from history",
  "Weigh-in trend against volume",
];

/**
 * Still a placeholder — but an honest, designed one. No emoji, no
 * "Coming soon" with nothing behind it.
 */
export default function DietTab() {
  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none px-[22px] pb-3.5 pt-2.5">
        <div className="font-head text-[9px] uppercase leading-none tracking-[.32em] text-accent">
          Teretana
        </div>
        <div className="mt-1.5 font-head text-[34px] uppercase leading-none tracking-[.01em]">
          Diet
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-center px-[26px] pb-24">
        <Blueprint className="flex flex-col items-center px-6 pb-7 pt-[34px] text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--accent-soft) 0 1px, transparent 1px 9px)",
            }}
          />
          <Icon.Lock size={46} className="text-accent opacity-85" />
          <div className="mt-5 font-head text-[24px] uppercase leading-tight tracking-[.08em]">
            Not built yet
          </div>
          <p className="mt-2.5 max-w-[250px] font-body text-[13px] leading-[1.55] text-dim">
            Macro and meal logging is on the board for a later release. The tab
            stays so the shape of the app doesn’t move under you.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2.5 border-t border-line pt-[18px]">
            {ROADMAP.map((item) => (
              <div key={item} className="flex items-center gap-2.5 opacity-45">
                <span className="h-3.5 w-3.5 flex-none border border-dim" />
                <span className="flex-1 text-left font-body text-[12.5px]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </Blueprint>
        <div className="mt-[22px] text-center font-body text-[9.5px] uppercase tracking-[.22em] text-dim">
          Ping me when it ships
        </div>
      </div>
    </div>
  );
}

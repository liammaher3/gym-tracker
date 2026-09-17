import type { JSX } from "react";
import { Icon } from "./ui/Icons";

export type Tab = "workout" | "history" | "diet";

type Props = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

const TABS: {
  id: Tab;
  label: string;
  Glyph: (p: { size?: number }) => JSX.Element;
}[] = [
  { id: "workout", label: "Workout", Glyph: Icon.Barbell },
  { id: "history", label: "History", Glyph: Icon.History },
  { id: "diet", label: "Diet", Glyph: Icon.Diet },
];

export default function BottomNav({ activeTab, onChange }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-ground/95 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur">
      {TABS.map(({ id, label, Glyph }) => {
        const active = id === activeTab;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              "flex flex-1 flex-col items-center gap-1.5 pb-[9px] pt-[13px]",
              active
                ? "-mt-px border-t-2 border-accent text-accent"
                : "text-dim hover:text-ink",
            ].join(" ")}
          >
            <Glyph size={21} />
            <span className="font-body text-[9.5px] font-semibold uppercase leading-none tracking-[.16em]">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

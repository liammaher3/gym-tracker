import type { WeightPoint } from "./WeightChart";
import WeightChart from "./WeightChart";
import { Icon } from "./ui/Icons";

type Props = {
  name: string;
  points: WeightPoint[];
  onBack: () => void;
};

export default function ExerciseProgress({ name, points, onBack }: Props) {
  const best = points.reduce((a, b) =>
    b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a,
  );
  const current = points[points.length - 1];
  const change = current.weight - points[0].weight;

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none border-b border-line px-[22px] pb-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-[7px] py-1.5 font-body text-[11px] uppercase tracking-[.16em] text-dim hover:text-accent"
        >
          <Icon.ChevronLeft size={14} />
          Progress
        </button>

        <div className="mt-3.5 font-head text-[30px] uppercase leading-none tracking-[.02em]">
          {name}
        </div>

        <div className="mt-[18px] flex border-y border-line">
          <div className="flex-1 py-[11px]">
            <div className="tnum font-head text-[21px] leading-none">
              {current.weight}
              <span className="text-[12px] text-dim"> lb × {current.reps}</span>
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Current top set
            </div>
          </div>
          <div className="flex-1 border-l border-line py-[11px] pl-3.5">
            <div className="tnum font-head text-[21px] leading-none">
              {best.weight}
              <span className="text-[12px] text-dim"> lb × {best.reps}</span>
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Best
            </div>
          </div>
          <div className="flex-1 border-l border-line py-[11px] pl-3.5">
            <div
              className={[
                "tnum font-head text-[21px] leading-none",
                change > 0 ? "text-success" : change < 0 ? "text-danger" : "",
              ].join(" ")}
            >
              {change > 0 ? "+" : ""}
              {change}
              <span className="text-[12px] text-dim"> lb</span>
            </div>
            <div className="mt-1.5 font-body text-[8.5px] uppercase leading-none tracking-[.18em] text-dim">
              Since first log
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-[22px] pb-24 pt-[22px]">
        <WeightChart points={points} />

        <div className="mt-[26px]">
          <div className="mb-2.5 font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
            Sessions ({points.length})
          </div>
          <table className="w-full border-collapse font-body text-[14px]">
            <thead>
              <tr>
                {["Date", "Top set"].map((h, i) => (
                  <th
                    key={h}
                    className={[
                      "border-b border-line py-1.5 font-body text-[11px] uppercase tracking-[.08em] text-dim",
                      i === 1 ? "pr-0.5 text-right" : "pl-0.5 text-left",
                    ].join(" ")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...points]
                .reverse()
                .map((p, i) => (
                  <tr key={i}>
                    <td className="border-b border-line py-1.5 pl-0.5">
                      {new Date(p.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="tnum border-b border-line py-1.5 pr-0.5 text-right">
                      {p.weight} lb × {p.reps}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

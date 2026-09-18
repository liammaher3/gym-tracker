import { useEffect, useRef, useState, type PointerEvent } from "react";

export type WeightPoint = { date: string; weight: number; reps: number };

type Props = {
  points: WeightPoint[];
  unit?: string;
};

const PAD = { top: 20, right: 12, bottom: 24, left: 8 };

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/**
 * Single-series line chart — weight per session over time. No legend (the
 * screen title already names the series); a scrub-to-inspect crosshair
 * stands in for per-point labels.
 */
export default function WeightChart({ points, unit = "lb" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const x0 = PAD.left;
  const x1 = size.w - PAD.right;
  const y0 = PAD.top;
  const y1 = size.h - PAD.bottom;

  const xAt = (i: number) =>
    n <= 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0);

  const weights = points.map((p) => p.weight);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const cushion = Math.max((rawMax - rawMin) * 0.25, 5);
  const yMin = Math.max(0, Math.floor(rawMin - cushion));
  const yMax = Math.ceil(rawMax + cushion);
  const yAt = (w: number) => y1 - ((w - yMin) / (yMax - yMin || 1)) * (y1 - y0);

  const nearestIndex = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const localX = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(xAt(i) - localX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const idx = nearestIndex(e.clientX);
    if (idx !== null) setHover(idx);
  };

  const ready = size.w > 0 && n > 0;
  const linePath = ready
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(p.weight)}`).join(" ")
    : "";
  const areaPath = ready && n > 1 ? `${linePath} L${xAt(n - 1)},${y1} L${xAt(0)},${y1} Z` : "";

  const gridValues = [yMax, (yMin + yMax) / 2, yMin];
  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverX = hover !== null ? xAt(hover) : 0;
  const hoverY = hoverPoint ? yAt(hoverPoint.weight) : 0;
  const tooltipAtEdge = hoverX > size.w - 60 ? "right" : hoverX < 60 ? "left" : "center";

  return (
    <div
      ref={containerRef}
      className="relative h-[190px] w-full touch-none select-none"
      onPointerDown={scrub}
      onPointerMove={scrub}
      onPointerLeave={() => setHover(null)}
    >
      {ready ? (
        <svg width={size.w} height={size.h} className="block overflow-visible">
          {gridValues.map((v, i) => (
            <g key={i}>
              <line x1={x0} x2={x1} y1={yAt(v)} y2={yAt(v)} className="stroke-line" strokeWidth={1} />
              <text x={x0} y={yAt(v) - 4} fontSize={9} className="fill-dim font-body">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {areaPath ? <path d={areaPath} className="fill-accent-soft" stroke="none" /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              className="stroke-accent"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {hover !== null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={y0}
              y2={y1}
              className="stroke-accent/40"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ) : null}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(p.weight)}
              r={hover === i ? 4.5 : 2.5}
              className={hover === i ? "fill-accent-hot stroke-ground" : "fill-accent"}
              strokeWidth={hover === i ? 2 : 0}
            />
          ))}
          <text x={x0} y={size.h - 8} fontSize={9} className="fill-dim font-body uppercase">
            {shortDate(points[0].date)}
          </text>
          <text x={x1} y={size.h - 8} textAnchor="end" fontSize={9} className="fill-dim font-body uppercase">
            {shortDate(points[n - 1].date)}
          </text>
        </svg>
      ) : null}
      {hoverPoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-y-full border border-accent bg-ground px-2.5 py-1.5 text-center"
          style={{
            left: hoverX,
            top: hoverY - 10,
            transform:
              tooltipAtEdge === "right"
                ? "translate(-100%, -100%)"
                : tooltipAtEdge === "left"
                  ? "translate(0, -100%)"
                  : "translate(-50%, -100%)",
          }}
        >
          <div className="tnum font-head text-[14px] leading-none">
            {hoverPoint.weight} {unit} × {hoverPoint.reps}
          </div>
          <div className="mt-1 whitespace-nowrap font-body text-[8.5px] uppercase leading-none tracking-[.12em] text-dim">
            {fullDate(hoverPoint.date)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

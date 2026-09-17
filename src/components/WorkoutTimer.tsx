type Props = {
  elapsedSeconds: number;
  /** Compact readout for the logger header; the full h/m/s block otherwise. */
  compact?: boolean;
};

const pad = (n: number) => n.toString().padStart(2, "0");

export default function WorkoutTimer({
  elapsedSeconds,
  compact = false,
}: Props) {
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;

  if (compact) {
    return (
      <div className="text-right">
        <div className="tnum font-head text-[27px] leading-none tracking-[.03em]">
          {h > 0 ? pad(h) + ":" : ""}
          {pad(m)}:{pad(s)}
        </div>
        <div className="mt-[5px] font-body text-[8.5px] uppercase leading-none tracking-[.2em] text-dim">
          Elapsed
        </div>
      </div>
    );
  }

  const cell = (value: string, label: string) => (
    <div className="flex flex-col items-center">
      <span className="tnum font-head text-[30px] leading-none">{value}</span>
      <span className="mt-1.5 font-body text-[9px] uppercase leading-none tracking-[.18em] text-dim">
        {label}
      </span>
    </div>
  );

  return (
    <div className="mb-6 flex justify-center">
      <div className="flex items-end gap-2 border border-line bg-slab px-6 py-3">
        {cell(pad(h), "hrs")}
        <span className="tnum mb-4 font-head text-[30px] leading-none text-dim">
          :
        </span>
        {cell(pad(m), "min")}
        <span className="tnum mb-4 font-head text-[30px] leading-none text-dim">
          :
        </span>
        {cell(pad(s), "sec")}
      </div>
    </div>
  );
}

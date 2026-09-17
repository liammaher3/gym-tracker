import { useRef, useState } from "react";
import { Icon } from "./ui/Icons";

const SLAB = 64; // px revealed
const THRESHOLD = 30; // px of drag before the row commits to open

type Props = {
  index: number;
  weight: number;
  reps: number;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

/**
 * A logged set. Swipe left (or click, on desktop) to reveal the delete slab.
 *
 * The row SHRINKS — the delete slab is a flex sibling whose width animates from
 * 0 to 64px. Do not translate the row: translating slides the set number and
 * weight out of the clip box and the row becomes unreadable mid-swipe.
 */
export default function SetRow({
  index,
  weight,
  reps,
  open,
  onToggle,
  onDelete,
}: Props) {
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  const width = open ? SLAB : Math.min(SLAB, Math.max(0, -drag));

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDrag(e.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (startX.current === null) return;
    const moved = Math.abs(drag) > 4;
    if (moved) {
      const shouldOpen = -drag > THRESHOLD;
      if (shouldOpen !== open) onToggle();
    } else {
      onToggle(); // plain tap/click
    }
    startX.current = null;
    setDrag(0);
  };

  return (
    <div className="swipe-row flex items-stretch overflow-hidden border-b border-line">
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 bg-ground px-1 py-[13px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="tnum w-[26px] flex-none font-head text-[15px] leading-none text-accent">
          {index}
        </span>
        <span className="tnum min-w-0 flex-1 whitespace-nowrap font-body text-[15px] leading-none">
          {weight} <span className="text-[11px] text-dim">lb</span>
          &nbsp;×&nbsp; {reps}{" "}
          <span className="text-[11px] text-dim">reps</span>
        </span>
        <span className="tnum font-body text-[11px] leading-none text-dim">
          {(weight * reps).toLocaleString()}
        </span>
      </div>

      <button
        type="button"
        aria-label={"Delete set " + index}
        tabIndex={width > 0 ? 0 : -1}
        onClick={onDelete}
        style={{ width, transition: "width .22s cubic-bezier(.2,.8,.3,1)" }}
        className="flex flex-none items-center justify-center overflow-hidden bg-danger text-white"
      >
        <Icon.Trash size={17} className="flex-none" />
      </button>
    </div>
  );
}

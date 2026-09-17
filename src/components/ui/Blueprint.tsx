import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Fill the frame with the tinted slab instead of leaving it a line drawing. */
  filled?: boolean;
  onClick?: () => void;
};

/**
 * The wireframe object every card, panel and figure in Industry wears:
 * square, hairline-bordered, with four "+" registration marks at the corners.
 * The marks are not optional — never render a framed element without them.
 */
export default function Blueprint({
  children,
  className = "",
  filled = false,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={[
        "relative border border-line",
        filled ? "bg-slab" : "",
        onClick ? "cursor-pointer hover:border-accent" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <i className="corner corner-tl" />
      <i className="corner corner-tr" />
      <i className="corner corner-bl" />
      <i className="corner corner-br" />
      {children}
    </div>
  );
}

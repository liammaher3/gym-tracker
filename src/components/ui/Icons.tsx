/**
 * Icons — Lucide at stroke-width 1.5 (the system's spec; never thicker).
 *
 * Most icons come straight from `lucide-react`. Re-exported here with the
 * stroke baked in so no call site can get it wrong:
 *
 *   import { Icon } from "./ui/Icons";
 *   <Icon.Check size={18} />
 *
 * The three bottom-nav glyphs are the exact paths already in the repo's
 * BottomNav.tsx, restroked from 2 to 1.5 — Lucide has no barbell that matches
 * the one the app already uses, so it is kept verbatim.
 */
import type { SVGProps } from "react";
import {
  ArrowRightFromLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Lock,
  Minus,
  Pencil,
  Plus,
  Search,
  Timer,
  Trash2,
} from "lucide-react";

const stroke = { strokeWidth: 1.5 } as const;

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/** Barbell — the repo's own path, restroked to 1.5. */
export function BarbellIcon({ size = 21, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4" />
    </svg>
  );
}

/** History clock — the repo's own path, restroked to 1.5. */
export function HistoryIcon({ size = 21, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/** Cup — the repo's own path, restroked to 1.5. */
export function DietIcon({ size = 21, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

/** Backspace — Lucide's delete glyph. */
export function BackspaceIcon({ size = 20, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  );
}

/** Keypad — square, matching the system's drawing style. */
export function KeypadIcon({ size = 16, ...rest }: GlyphProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="4" width="18" height="16" />
      <line x1="8" y1="9" x2="8" y2="9" />
      <line x1="12" y1="9" x2="12" y2="9" />
      <line x1="16" y1="9" x2="16" y2="9" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}

export const Icon = {
  Check: (p: GlyphProps) => <Check {...stroke} {...p} />,
  ChevronLeft: (p: GlyphProps) => <ChevronLeft {...stroke} {...p} />,
  ChevronRight: (p: GlyphProps) => <ChevronRight {...stroke} {...p} />,
  Dumbbell: (p: GlyphProps) => <Dumbbell {...stroke} {...p} />,
  Lock: (p: GlyphProps) => <Lock {...stroke} {...p} />,
  Minus: (p: GlyphProps) => <Minus {...stroke} {...p} />,
  Plus: (p: GlyphProps) => <Plus {...stroke} {...p} />,
  Pencil: (p: GlyphProps) => <Pencil {...stroke} {...p} />,
  Search: (p: GlyphProps) => <Search {...stroke} {...p} />,
  SignOut: (p: GlyphProps) => <ArrowRightFromLine {...stroke} {...p} />,
  Timer: (p: GlyphProps) => <Timer {...stroke} {...p} />,
  Trash: (p: GlyphProps) => <Trash2 {...stroke} {...p} />,
  Barbell: BarbellIcon,
  History: HistoryIcon,
  Diet: DietIcon,
  Backspace: BackspaceIcon,
  Keypad: KeypadIcon,
};

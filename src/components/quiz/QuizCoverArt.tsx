import { useMemo } from "react";
import {
  Trophy,
  Target,
  Zap,
  Star,
  Shield,
  Award,
  Flag,
  Swords,
  CircleDot,
  Crosshair,
  Medal,
  Goal,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Brand-consistent gradient pairs. Every pair starts from the green (#00E676)
// or blue (#3B82F6) accent so generated covers always feel "DG Tribune",
// never like a random color picker.
const GRADIENTS: [string, string][] = [
  ["#00E676", "#0D1117"],
  ["#3B82F6", "#0D1117"],
  ["#00E676", "#3B82F6"],
  ["#3B82F6", "#00C853"],
  ["#059669", "#0F172A"],
  ["#2563EB", "#111827"],
  ["#00E676", "#111827"],
  ["#1D4ED8", "#052E1B"],
];

const ICONS = [
  Trophy,
  Target,
  Zap,
  Star,
  Shield,
  Award,
  Flag,
  Swords,
  CircleDot,
  Crosshair,
  Medal,
  Goal,
];

/** Simple deterministic string hash (djb2-ish) - same title always yields the same cover. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface QuizCoverArtProps {
  title: string;
  className?: string;
  iconClassName?: string;
  /** Overlay the quiz title inside the cover itself (used where there's no title shown alongside it). */
  showTitle?: boolean;
}

/**
 * Fully generative quiz cover art. Deterministic per quiz title: a brand
 * gradient, a football-themed icon, and a subtle dot-grid texture are all
 * derived from a hash of the title, so the same quiz always renders the
 * same cover, every quiz gets one automatically, and there is zero manual
 * work and no external image dependency.
 */
export function QuizCoverArt({
  title,
  className,
  iconClassName,
  showTitle = false,
}: QuizCoverArtProps) {
  const { gradient, Icon, angle } = useMemo(() => {
    const hash = hashString(title || "quiz");
    const gradient = GRADIENTS[hash % GRADIENTS.length];
    const Icon = ICONS[Math.floor(hash / GRADIENTS.length) % ICONS.length];
    const angle = 100 + (hash % 60);
    return { gradient, Icon, angle };
  }, [title]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
      style={{
        background: `linear-gradient(${angle}deg, ${gradient[0]}33, ${gradient[1]})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          color: gradient[0],
        }}
      />
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl"
        style={{ background: gradient[0] }}
      />
      <Icon
        className={cn("relative drop-shadow-lg", iconClassName || "h-10 w-10")}
        style={{ color: gradient[0] }}
        strokeWidth={1.5}
      />
      {showTitle && (
        <span className="absolute bottom-2 left-2 right-2 truncate text-center text-caption font-heading font-semibold text-white/90">
          {title}
        </span>
      )}
    </div>
  );
}

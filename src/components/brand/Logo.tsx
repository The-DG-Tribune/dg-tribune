import { useId } from "react";
import { cn } from "@/lib/cn";

/** The DG mark: rounded dark tile, green to blue gradient letters. Same artwork as /favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8 shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E676" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121A2B" />
          <stop offset="1" stopColor="#070A12" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#b${uid})`} />
      <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke={`url(#g${uid})`} strokeOpacity=".55" strokeWidth="1.5" />
      <g fill="none" stroke={`url(#g${uid})`} strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h8.5a11 11 0 0 1 0 22H9z" />
        <path d="M56.3 26.5A11 11 0 1 0 57 32v0h-6.5" />
      </g>
      <path d="M10 52.5L54 52.5" stroke={`url(#g${uid})`} strokeWidth="2.4" strokeLinecap="round" strokeOpacity=".9" />
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && (
        <span className="font-heading text-card-title font-bold tracking-tight text-text">
          DG{" "}
          <span className="bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
            Tribune
          </span>
        </span>
      )}
    </span>
  );
}

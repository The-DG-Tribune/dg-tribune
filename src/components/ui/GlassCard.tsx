import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the accent glow shadow - use sparingly, for the one or two
   * tiles per view that should feel "lit up". */
  glow?: boolean;
}

/**
 * GlassCard - the frosted-glass surface used across the homepage's
 * bento tiles. Semi-transparent background + blur + hairline border,
 * so the ambient mesh gradient behind the page reads through it.
 */
export function GlassCard({ className, glow, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-container border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-glass",
        glow && "shadow-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

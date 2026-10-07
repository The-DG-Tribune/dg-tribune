import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent" | "danger" | "warning" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface text-text-secondary border border-border",
  accent: "bg-accent/10 text-accent",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-accent-secondary/10 text-accent-secondary",
};

/**
 * Badge - Document 02: rounded pill, small, uppercase.
 * Used for category labels (TRANSFER, NEWS, MATCHDAY, FEATURE, QUIZ, TOOLS).
 */
export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

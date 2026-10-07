import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Container - Document 02/06A Page Container: max-width 1280px,
 * centered, consistent horizontal spacing. Content never stretches
 * edge to edge.
 */
export function Container({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-layout px-4 md:px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

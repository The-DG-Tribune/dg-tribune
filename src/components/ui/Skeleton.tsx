import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton - Document 02 Loading States: every page loads using
 * skeleton components, never blank pages, never flashing layouts.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-card bg-surface",
        className
      )}
      {...props}
    />
  );
}

/** Pre-built skeleton for the shared Card layout (article/player/team/etc). */
export function CardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely, resolving conflicts (e.g. "px-2 px-4" -> "px-4").
 * Used by every component in components/ui to keep className overrides predictable.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

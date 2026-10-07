import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

/** Loader - simple spinner for inline/button loading states. Full-page loads use Skeletons instead. */
export function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-accent", sizeMap[size])} />
      {label && <p className="text-small text-text-secondary">{label}</p>}
    </div>
  );
}

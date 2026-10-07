import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/cards/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface AnalyticsCardProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  accentClassName?: string;
}

/** AnalyticsCard - Document 05 Dashboard Home analytics cards. */
export function AnalyticsCard({
  label,
  value,
  icon: Icon,
  accentClassName = "bg-accent/10 text-accent",
}: AnalyticsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-button",
            accentClassName
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-16 mb-1" />
      ) : (
        <p className="font-heading text-page-title text-text leading-none mb-1">
          {value.toLocaleString()}
        </p>
      )}
      <p className="text-small text-text-secondary">{label}</p>
    </Card>
  );
}

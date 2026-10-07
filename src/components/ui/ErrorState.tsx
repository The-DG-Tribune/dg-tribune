import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * ErrorState - Document 03 Error Handling: always fail gracefully,
 * friendly messages, retry action, never expose stack traces or
 * raw Firebase/API errors.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="font-heading text-card-title text-text mb-1">{title}</h3>
      <p className="max-w-sm text-body text-text-secondary mb-6">
        {description}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

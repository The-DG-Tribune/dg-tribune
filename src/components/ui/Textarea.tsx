import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-2 block text-small font-medium text-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          className={cn(
            "w-full resize-y rounded-input border bg-surface px-4 py-3 text-body text-text placeholder:text-text-secondary transition-colors duration-button focus:outline-none focus:ring-2 focus:ring-accent",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-2 text-caption text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-2 text-caption text-text-secondary">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

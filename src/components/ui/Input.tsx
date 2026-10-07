import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Input - Document 02 Input System: rounded, comfortable padding,
 * visible focus state, clear placeholder, simple validation,
 * no ugly browser default styling.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-small font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "w-full rounded-input border bg-surface px-4 py-3 text-body text-text placeholder:text-text-secondary transition-colors duration-button focus:outline-none focus:ring-2 focus:ring-accent",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-2 text-caption text-danger">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-2 text-caption text-text-secondary">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

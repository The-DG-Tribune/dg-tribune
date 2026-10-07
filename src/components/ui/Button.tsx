import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Primary - Filled Green, White Text
  primary:
    "bg-accent text-background hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50",
  // Secondary - Outline, Transparent Background
  secondary:
    "bg-transparent border border-border text-text hover:border-accent disabled:opacity-50",
  // Ghost - Text Only
  ghost: "bg-transparent text-text hover:bg-surface disabled:opacity-50",
  // Icon - Square, Rounded, used for actions
  icon: "bg-surface border border-border text-text hover:border-accent disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-small px-3.5 py-1.5 gap-1.5",
  md: "text-body px-5 py-2.5 gap-2",
  lg: "text-body px-7 py-3.5 gap-2",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "p-1.5",
  md: "p-2.5",
  lg: "p-3.5",
};

/**
 * Button - Document 02 Button System.
 * No gradients. Never introduce new variants outside this set.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = variant === "icon";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-button font-semibold transition-colors duration-button focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          variantClasses[variant],
          isIconOnly ? iconSizeClasses[size] : sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

import { Search as SearchIcon, X } from "lucide-react";
import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
}

/** SearchInput - the shared search field used in the navbar, dashboard, and search page. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", className)}>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          ref={ref}
          type="search"
          value={value}
          className="w-full rounded-input border border-border bg-surface py-3 pl-11 pr-10 text-body text-text placeholder:text-text-secondary transition-colors duration-button focus:outline-none focus:ring-2 focus:ring-accent"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

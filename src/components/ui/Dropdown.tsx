import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Dropdown - simple accessible select styled to match the Input system. */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-2 block text-small font-medium text-text">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between rounded-input border border-border bg-surface px-4 py-3 text-body text-text transition-colors duration-button focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <span className={selected ? "text-text" : "text-text-secondary"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-secondary transition-transform duration-button",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-input border border-border bg-surface shadow-lg max-h-64 overflow-y-auto"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "block w-full px-4 py-3 text-left text-body transition-colors duration-button hover:bg-background",
                  option.value === value ? "text-accent" : "text-text"
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DropdownIcon({ children }: { children: ReactNode }) {
  return <span className="mr-2 inline-flex items-center">{children}</span>;
}

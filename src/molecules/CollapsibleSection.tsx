import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleSectionProps {
  /** Section title shown in the header */
  title: string;
  /** Optional icon rendered before the title */
  icon?: ReactNode;
  /** Whether the section starts expanded (default: false) */
  defaultOpen?: boolean;
  /** Optional badge/count shown after the title */
  badge?: ReactNode;
  /** Optional action element shown in the header (e.g. a button) */
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable collapsible/accordion section with smooth animation.
 * Used in EventSettingsPanel to group settings without nested tabs.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  headerAction,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("card overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-3.5 text-left",
          "hover:bg-surface-raised transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isOpen && "border-b border-border-1",
        )}
        aria-expanded={isOpen}
      >
        {/* Icon */}
        {icon && <span className="text-ink-3 shrink-0 flex items-center">{icon}</span>}

        {/* Title */}
        <span className="flex-1 text-sm font-semibold text-ink-1">{title}</span>

        {/* Badge */}
        {badge && <span className="shrink-0">{badge}</span>}

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={cn(
            "text-ink-3 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Body — uses CSS grid for smooth height animation */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          {/* Header action slot (outside collapsible area) */}
          {isOpen && headerAction && (
            <div className="px-4 pt-3 flex justify-end">{headerAction}</div>
          )}
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

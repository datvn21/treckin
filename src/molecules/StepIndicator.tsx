/* ═══════════════════════════════════════════════════════════════
   StepIndicator — progress dots for multi-step forms
   ═══════════════════════════════════════════════════════════════ */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  current: number;
  total: number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1.5 mb-6"
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-[background-color,color,box-shadow]",
              i + 1 < current
                ? "bg-primary text-white"
                : i + 1 === current
                  ? "bg-primary text-white ring-2 ring-primary-border scale-110"
                  : "bg-surface-raised text-ink-4",
            )}
          >
            {i + 1 < current ? <Check size={12} /> : i + 1}
          </span>
          {i < total - 1 && (
            <span
              className={cn(
                "flex-1 h-0.5 w-8",
                i + 1 < current ? "bg-primary" : "bg-border-1",
              )}
            />
          )}
        </span>
      ))}
    </div>
  );
}

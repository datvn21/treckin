import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxCardProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "card" | "row";
}

const CheckboxCard = React.forwardRef<HTMLInputElement, CheckboxCardProps>(
  ({ id, label, description, checked, onChange, disabled, className, variant = "card", ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          "group flex cursor-pointer items-start gap-3 border transition-[background-color,border-color,box-shadow]",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
          disabled && "cursor-not-allowed opacity-60",
          variant === "card"
            ? "rounded-[22px] px-4 py-4 bg-surface hover:border-border-2"
            : "rounded-xl px-3 py-3 bg-transparent",
          checked
            ? "border-primary-border bg-primary-muted"
            : "border-border-1",
          className,
        )}
      >
        <span
          className={cn(
            "mt-[5px] flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-[background-color,border-color,color,box-shadow]",
            checked
              ? "border-primary bg-primary text-white"
              : "border-border-2 bg-surface text-transparent group-hover:border-primary-border",
          )}
          aria-hidden="true"
        >
          <Check size={12} strokeWidth={3.5} />
        </span>
        <input
          {...props}
          id={id}
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span className="min-w-0 pt-0.5">
          <span className="block text-sm font-semibold leading-6 text-ink-1">{label}</span>
          {description && (
            <span className="mt-0.5 block text-xs leading-5 text-ink-3">{description}</span>
          )}
        </span>
      </label>
    );
  },
);

CheckboxCard.displayName = "CheckboxCard";

export { CheckboxCard };

/* ═══════════════════════════════════════════════════════════════
   CheckRow / RadioRow — reusable form option rows
   ═══════════════════════════════════════════════════════════════ */
import { CheckboxCard } from "@/atoms/CheckboxCard";
import { cn } from "@/lib/utils";

/* ── Checkbox row ─────────────────────────────────────────────── */
interface CheckRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function CheckRow({
  id,
  label,
  description,
  checked,
  onChange,
}: CheckRowProps) {
  return (
    <CheckboxCard
      id={id}
      label={label}
      description={description}
      checked={checked}
      onChange={onChange}
    />
  );
}

/* ── Radio row ───────────────────────────────────────────────── */
interface RadioRowProps {
  id: string;
  name: string;
  label: string;
  description?: string;
  value: string;
  selectedValue: string;
  onChange: (v: string) => void;
}

export function RadioRow({
  id,
  name,
  label,
  description,
  value,
  selectedValue,
  onChange,
}: RadioRowProps) {
  const checked = value === selectedValue;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-[background-color,border-color]",
        checked
          ? "border-primary-border bg-primary-muted"
          : "border-border-1 bg-surface hover:border-border-2",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 accent-primary shrink-0"
      />
      <div>
        <p className="text-sm font-medium text-ink-1">{label}</p>
        {description && (
          <p className="text-xs text-ink-3 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

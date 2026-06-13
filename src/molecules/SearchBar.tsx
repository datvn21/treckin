import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  id?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  debounceMs = 300,
  className,
  id,
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when external value changes (e.g. reset)
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  // Cleanup timer on unmount
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none">
        <Search size={15} aria-hidden="true" />
      </span>

      <input
        id={id}
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="input pl-8 pr-9"
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-4 hover:text-ink-1 transition-colors"
          aria-label="Xóa tìm kiếm"
          style={{ minHeight: "auto", minWidth: "auto" }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

SearchBar.displayName = "SearchBar";

export { SearchBar };

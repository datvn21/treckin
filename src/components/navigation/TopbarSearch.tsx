/* ── TopbarSearch — command-palette style search in topbar ── */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/templates/AppShell";

interface SearchableEvent {
  id: string;
  title: string;
}

interface TopbarSearchProps {
  workspaces: Workspace[];
  events: SearchableEvent[];
}

interface SearchResult {
  id: string;
  label: string;
  type: "workspace" | "event";
  to: string;
}

export function TopbarSearch({ workspaces, events }: TopbarSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Cmd/Ctrl+K shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const results: SearchResult[] =
    query.trim().length === 0
      ? []
      : [
          ...workspaces
            .filter((ws) => ws.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 4)
            .map((ws) => ({
              id: ws.id,
              label: ws.name,
              type: "workspace" as const,
              to: `/app/workspaces/${ws.id}`,
            })),
          ...events
            .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 4)
            .map((e) => ({
              id: e.id,
              label: e.title,
              type: "event" as const,
              to: `/app/events/${e.id}`,
            })),
        ];

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 h-8",
          "border bg-surface-raised",
          "outline-none ring-0",
          "transition-[width,background-color,border-color] duration-200",
          focused
            ? "border-border-2 bg-surface w-72"
            : "border-border-1 hover:border-border-2 cursor-text w-52",
        )}
      >
        <Search
          size={13}
          className={cn(
            "shrink-0 transition-[color] duration-150",
            focused ? "text-primary" : "text-ink-4",
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Tìm kiếm..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-sm text-ink-1 placeholder:text-ink-4 outline-none ring-0 border-none min-w-0 caret-primary"
          style={{ boxShadow: "none" }}
        />
        {query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full p-0.5 text-ink-4 hover:text-ink-2 transition-[color] duration-100"
          >
            <X size={12} />
          </button>
        ) : (
          <span className="shrink-0 text-[10px] text-ink-4/50 font-mono hidden xl:block select-none">
            ⌘K
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-72 card-elevated py-1 animate-scale-in origin-top-left z-50">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-4 text-center">Không có kết quả</p>
          ) : (
            <>
              {results.some((r) => r.type === "workspace") && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-4">
                  Workspace
                </p>
              )}
              {results
                .filter((r) => r.type === "workspace")
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      navigate(r.to);
                      setQuery("");
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink-2 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 text-left"
                  >
                    <Building2 size={14} className="text-ink-4 shrink-0" />
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}

              {results.some((r) => r.type === "event") && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-4 border-t border-border-1 mt-1">
                  Sự kiện
                </p>
              )}
              {results
                .filter((r) => r.type === "event")
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      navigate(r.to);
                      setQuery("");
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink-2 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 text-left"
                  >
                    <Ticket size={14} className="text-ink-4 shrink-0" />
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

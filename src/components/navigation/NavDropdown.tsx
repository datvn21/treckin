/* ── NavDropdown — breadcrumb dropdown for workspaces & events ── */
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/templates/AppShell";

export interface DropdownItem {
  id: string;
  label: string;
  to: string;
  meta?: string;
  icon?: React.ReactNode;
}

interface NavDropdownProps {
  label: string;
  headerLabel?: string;
  icon?: React.ReactNode;
  dropdownHeaderIcon?: React.ReactNode;
  homeHref: string;
  isActive: boolean;
  activeId?: string;
  items: DropdownItem[];
  footerItem?: { label: string; onClick: () => void; icon?: React.ReactNode };
  onSelect: (item: DropdownItem) => void;
  emptyLabel?: string;
}

export function NavDropdown({
  label,
  headerLabel,
  icon,
  dropdownHeaderIcon,
  homeHref,
  isActive,
  activeId,
  items,
  footerItem,
  onSelect,
  emptyLabel,
}: NavDropdownProps) {
  const { open, setOpen, ref } = useDropdown();
  const location = useLocation();
  const isHeaderActive = location.pathname === homeHref;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
          "transition-[color,background-color] duration-100",
          isActive
            ? "text-ink-1 bg-surface-raised"
            : "text-ink-3 hover:text-ink-1 hover:bg-surface-raised",
        )}
        aria-expanded={open}
      >
        {icon && (
          <span aria-hidden className="shrink-0 flex items-center justify-center">
            {icon}
          </span>
        )}
        {label}
        <ChevronDown
          size={13}
          className={cn(
            "text-ink-4 transition-[transform] duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 card-elevated py-0 overflow-hidden animate-scale-in origin-top-left">
          <NavLink
            to={homeHref}
            end
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-[background-color,color] duration-100",
              isHeaderActive
                ? "text-primary bg-primary-muted/20"
                : "text-ink-2 hover:text-ink-1 hover:bg-surface-raised",
            )}
          >
            {dropdownHeaderIcon && (
              <span className="shrink-0 flex items-center justify-center">
                {dropdownHeaderIcon}
              </span>
            )}
            <span className="flex-1 truncate">{headerLabel ?? label}</span>
          </NavLink>

          {items.length > 0 && <div className="border-b border-border-1" />}

          {items.length === 0 && emptyLabel && (
            <p className="px-4 py-3 text-xs text-ink-4 bg-surface">
              {emptyLabel}
            </p>
          )}

          {items.length > 0 && (
            <div className="max-h-60 overflow-y-auto bg-surface">
              {items.map((item) => {
                const isItemActive = activeId
                  ? item.id === activeId
                  : item.to === location.pathname;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelect(item);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left transition-[background-color,color] duration-100",
                      isItemActive
                        ? "text-primary font-medium bg-primary-muted/10"
                        : "text-ink-2 hover:text-ink-1 hover:bg-surface-raised",
                    )}
                  >
                    {item.icon && (
                      <span className="shrink-0 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.meta && (
                      <span
                        className={cn(
                          "text-xs shrink-0 font-normal",
                          isItemActive ? "text-primary/70" : "text-ink-4",
                        )}
                      >
                        {item.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {footerItem && (
            <>
              <div className="border-t border-border-1" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  footerItem.onClick();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 bg-surface"
              >
                {footerItem.icon && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-ink-3 shrink-0">
                    {footerItem.icon}
                  </span>
                )}
                <span>{footerItem.label}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

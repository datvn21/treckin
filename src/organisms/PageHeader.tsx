/* ═══════════════════════════════════════════════════════════════
   PageHeader Organism — standardized page header block
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** @deprecated use `actions` — kept for backwards compat */
  action?: ReactNode;
  /** If set, show a back-arrow button that navigates to this path */
  backTo?: string;
  /** If set, show a close button with a circular border that navigates to this path */
  closeTo?: string;
  /** Optional badge displayed next to the title */
  badge?: ReactNode;
  /** Optional avatar/logo displayed to the left of the title */
  avatar?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  action,
  backTo,
  closeTo,
  badge,
  avatar,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const trailing = actions ?? action;

  return (
    <header className={cn("section-header flex-wrap relative", className)}>
      {/* Left: back + title block */}
      <div className="flex items-start gap-3 min-w-0">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label={t("common.back")}
            className="btn-icon shrink-0 mt-0.5"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {avatar}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Right: actions + close */}
      {(trailing || closeTo) && (
        <div className={cn("flex items-center gap-2 shrink-0 ml-auto", closeTo && "pr-10")}>
          {trailing}
          {closeTo && (
            <button
              type="button"
              onClick={() => navigate(closeTo)}
              aria-label={t("common.close")}
              className="absolute top-0 right-0 flex items-center justify-center w-8 h-8 rounded-full border border-border-1 text-ink-3 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100 shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}

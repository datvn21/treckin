/* ═══════════════════════════════════════════════════════════════
   AuthLayout Template — centered card layout for auth pages
   Full viewport, centered vertically + horizontally.
   Shows logo at top, ThemeToggle in top-right, footer with i18n + copyright.
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/molecules/ThemeToggle";
import { LanguageSwitcher } from "@/molecules/LanguageSwitcher";

interface AuthLayoutProps {
  children: ReactNode;
  onBack?: () => void;
}

export function AuthLayout({ children, onBack }: AuthLayoutProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center p-4 relative">
      {/* ── Top-right: Theme toggle ── */}
      <div className="fixed flex gap-4 top-4 right-4 z-50">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      {/* ── Main content column ── */}
      <div className="flex flex-col items-center gap-6 w-full max-w-[380px]">
        {/* Logo with optional Back button */}
        <div className="relative w-full flex items-center justify-center min-h-[40px]">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 p-2 text-ink-3 hover:text-ink-1 transition-colors rounded-lg hover:bg-surface-raised focus-visible:outline-none"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-3 select-none pointer-events-none">
            <img src="/assets/Treckin.svg" alt="Treckin" className="h-10 w-auto" draggable={false} />
            <span className="text-2xl font-bold text-ink-1 tracking-tight">Treckin</span>
          </div>
        </div>

        {/* Auth form card (children) */}
        <div className="w-full">{children}</div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 flex flex-col items-center gap-2 text-caption text-ink-4">
        <p>
          © {year} Treckin. <span className="text-ink-4">{t("auth.supportNote")}</span>
        </p>
      </footer>
    </div>
  );
}

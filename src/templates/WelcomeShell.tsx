/* ═══════════════════════════════════════════════════════════════
   WelcomeShell Template — standalone layout with no nav
   Used for the gateway/welcome screen (not inside AppShell)
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";

interface WelcomeShellProps {
  children: ReactNode;
}

export function WelcomeShell({ children }: WelcomeShellProps) {
  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      {/* Minimal header: just logo */}
      <header className="px-6 py-4 flex items-center gap-2">
        <img src="/assets/Treckin.svg" alt="Treckin" className="h-6 w-auto" />
        <span className="font-semibold text-sm text-ink-1">Treckin</span>
      </header>
      {/* Content centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  );
}

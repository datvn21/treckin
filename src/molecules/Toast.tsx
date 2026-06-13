/* ══════════════════════════════════════════════════
   Toast — lightweight singleton toast notification system
   ══════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "loading";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

const MAX_TOASTS = 5;

const AUTO_DISMISS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 4000,
  error: 6000,
  loading: null, // never auto-dismiss
};

// ── Singleton store ──────────────────────────────────────────────────────────
let listeners: Array<(items: ToastItem[]) => void> = [];
let toastItems: ToastItem[] = [];
const timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

function emitChange() {
  listeners.forEach((fn) => fn([...toastItems]));
}

function removeToast(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toastItems = toastItems.filter((t) => t.id !== id);
  emitChange();
}

function addToast(message: string, variant: ToastVariant) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toastItems = [...toastItems.slice(-(MAX_TOASTS - 1)), { id, message, variant }];
  emitChange();

  const delay = AUTO_DISMISS[variant];
  if (delay !== null) {
    const timer = setTimeout(() => removeToast(id), delay);
    timers.set(id, timer);
  }

  return id;
}

// ── Public API ───────────────────────────────────────────────────────────────
export const toast = {
  success: (message: string) => addToast(message, "success"),
  error: (message: string) => addToast(message, "error"),
  info: (message: string) => addToast(message, "info"),
  loading: (message: string) => addToast(message, "loading"),
  dismiss: (id: string) => removeToast(id),
};

/** Returns the toast object directly for backward compatibility.
 * Usage: `const toast = useToast();  toast.success('...')`
 */
export function useToast() {
  return toast;
}

// ── Icon & style maps ────────────────────────────────────────────────────────
const ICON_MAP: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={16} aria-hidden="true" />,
  error: <XCircle size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
  loading: <Loader2 size={16} className="animate-spin" aria-hidden="true" />,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "border-success-border bg-success-bg   text-success",
  error: "border-danger-border  bg-danger-bg    text-danger",
  info: "border-primary-border bg-primary-muted text-primary-text",
  loading: "border-border-1       bg-surface       text-ink-2",
};

// ── Single toast item ────────────────────────────────────────────────────────
function ToastItemComponent({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border",
        "text-sm font-medium shadow-md animate-slide-in-right",
        "min-h-[44px]",
        VARIANT_CLASS[item.variant],
      )}
    >
      <span className="shrink-0">{ICON_MAP[item.variant]}</span>
      <span className="flex-1 leading-snug">{item.message}</span>
      {item.variant !== "loading" && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Đóng thông báo"
          style={{ minHeight: "auto", minWidth: "auto" }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ── Toaster (mount once near app root) ───────────────────────────────────────
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const setRef = useRef(setItems);
  setRef.current = setItems;

  useEffect(() => {
    const fn = (next: ToastItem[]) => setRef.current(next);
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Thông báo"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItemComponent item={item} onClose={() => removeToast(item.id)} />
        </div>
      ))}
    </div>
  );
}

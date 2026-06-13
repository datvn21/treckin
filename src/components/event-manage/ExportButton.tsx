/* ═══════════════════════════════════════════════════════════════
   ExportButton — triggers CSV download of event check-in data.
   Calls GET /events/:id/export/csv which returns a file stream.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/parseApiError";
import { useToast } from "@/molecules/Toast";
import { Button } from "@/atoms/Button";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  eventId: string;
  eventTitle?: string;
  className?: string;
}

type ExportScope = "all" | "checked-in";

/**
 * Export button with a small dropdown to pick scope:
 * - "all"        → all registrants (checked-in + not yet)
 * - "checked-in" → only those with a check-in record
 *
 * The button calls GET /events/:id/export/csv?scope=<scope>
 * and triggers a browser download using a temporary anchor element.
 */
export function ExportButton({ eventId, eventTitle, className }: ExportButtonProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const doExport = async (scope: ExportScope) => {
    setDropdownOpen(false);
    setIsExporting(true);
    try {
      const response = await api.get(`/events/${eventId}/export/csv`, {
        params: { scope },
        responseType: "blob",
      });

      // Build a filename from the event title + scope + date
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (eventTitle ?? "event").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `${safeName}_${scope}_${date}.csv`;

      // Trigger browser download
      const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("manage.attendees.exportSuccess"));
    } catch (err) {
      toast.error(parseApiError(err, t("manage.attendees.exportFailed")));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Main export button */}
      <Button
        variant="default"
        size="sm"
        isLoading={isExporting}
        onClick={() => void doExport("all")}
        className="rounded-r-none border-r-0"
      >
        <Download size={14} />
        {t("manage.attendees.export")}
      </Button>

      {/* Dropdown trigger */}
      <button
        type="button"
        disabled={isExporting}
        onClick={() => setDropdownOpen((v) => !v)}
        className={cn(
          "h-8 px-2 rounded-r-md border border-border-2 bg-surface",
          "text-ink-3 hover:text-ink-1 hover:bg-surface-raised",
          "transition-colors duration-100 focus-visible:outline-none",
          "flex items-center",
          isExporting && "opacity-50 cursor-not-allowed",
        )}
        aria-label={t("manage.attendees.exportOptions")}
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        <ChevronDown size={13} />
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute right-0 top-full mt-1 z-40 min-w-[180px]",
              "card shadow-lg py-1 animate-fade-in-up",
            )}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-1 hover:bg-surface-raised transition-colors text-left"
              onClick={() => void doExport("all")}
            >
              <Download size={13} className="text-ink-3" />
              {t("manage.attendees.exportAll")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-1 hover:bg-surface-raised transition-colors text-left"
              onClick={() => void doExport("checked-in")}
            >
              <Download size={13} className="text-success" />
              {t("manage.attendees.exportCheckedIn")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

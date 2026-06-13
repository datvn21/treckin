import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  queueCount: number;
  isSyncing: boolean;
}

export function OfflineBanner({ queueCount, isSyncing }: OfflineBannerProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm",
        isSyncing
          ? "bg-[#f59e0b]/10 text-[#f59e0b]"
          : "bg-[#ef4444]/10 text-[#ef4444]"
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" strokeWidth={1.5} />
          <span className="text-xs font-medium">
            {t("scanner.syncing", { count: queueCount })}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-xs font-medium">
            {t("scanner.offline", { count: queueCount })}
          </span>
        </>
      )}
    </div>
  );
}

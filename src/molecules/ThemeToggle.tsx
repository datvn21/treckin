import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const CYCLE: Theme[] = ["light", "dark", "system"];

const ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} aria-hidden="true" />,
  dark: <Moon size={16} aria-hidden="true" />,
  system: <Monitor size={16} aria-hidden="true" />,
};

export interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme } = useThemeStore();
  const { t } = useTranslation();

  const currentTheme = (theme as Theme) ?? "system";

  const cycleNext = () => {
    const idx = CYCLE.indexOf(currentTheme);
    const next = CYCLE[(idx + 1) % CYCLE.length]!;
    setTheme(next);
  };

  const label =
    currentTheme === "light"
      ? t("common.lightMode", { defaultValue: "Chế độ sáng" })
      : currentTheme === "dark"
        ? t("common.darkMode", { defaultValue: "Chế độ tối" })
        : t("common.systemMode", { defaultValue: "Theo hệ thống" });

  return (
    <button
      type="button"
      onClick={cycleNext}
      className={cn("btn-icon", className)}
      aria-label={label}
      title={label}
    >
      {ICONS[currentTheme] ?? <Monitor size={16} aria-hidden="true" />}
    </button>
  );
};

ThemeToggle.displayName = "ThemeToggle";

export { ThemeToggle };

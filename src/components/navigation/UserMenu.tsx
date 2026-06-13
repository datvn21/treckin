/* ── UserMenu — avatar dropdown with profile, theme, language, logout ── */
import { useTranslation } from "react-i18next";
import { User, LogOut, Sun, Moon, Monitor, Languages, ChevronDown } from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { Avatar } from "@/atoms/Avatar";
import { LanguageSwitcher } from "@/molecules/LanguageSwitcher";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface UserMenuProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onProfile: () => void;
  onLogout: () => void;
}

export function UserMenu({ name, email, avatarUrl, onProfile, onLogout }: UserMenuProps) {
  const { t } = useTranslation();
  const { open, setOpen, ref } = useDropdown();
  const { theme, setTheme } = useThemeStore();

  const THEMES: { value: Theme; icon: React.ReactNode; label: string }[] = [
    {
      value: "light",
      icon: <Sun size={13} />,
      label: t("theme.light", { defaultValue: "Sáng" }),
    },
    {
      value: "dark",
      icon: <Moon size={13} />,
      label: t("theme.dark", { defaultValue: "Tối" }),
    },
    {
      value: "system",
      icon: <Monitor size={13} />,
      label: t("theme.system", { defaultValue: "Tự động" }),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md p-1 transition-[background-color] duration-100 hover:bg-surface-raised"
        aria-expanded={open}
      >
        <Avatar src={avatarUrl} name={name} size="md" />
        <ChevronDown
          size={13}
          className={cn(
            "text-ink-3 hidden lg:block transition-[transform] duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 card-elevated py-2 animate-scale-in origin-top-right"
        >
          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 mb-1">
            <Avatar src={avatarUrl} name={name} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1 truncate">{name}</p>
              <p className="text-xs text-ink-4 truncate">{email}</p>
            </div>
          </div>

          <div className="border-t border-border-1 mx-2 mb-2" />

          {/* Language */}
          <div className="px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4 mb-2 flex items-center gap-1.5">
              <Languages size={11} />
              {t("settings.language", { defaultValue: "Ngôn ngữ" })}
            </p>
            <LanguageSwitcher variant="dropdown" />
          </div>

          {/* Theme */}
          <div className="px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4 mb-2 flex items-center gap-1.5">
              <Sun size={11} />
              {t("settings.theme", { defaultValue: "Giao diện" })}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {THEMES.map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium",
                    "transition-[background-color,color,border-color] duration-100 border",
                    theme === value
                      ? "bg-primary text-white border-primary"
                      : "text-ink-3 border-border-1 hover:bg-surface-raised hover:text-ink-1",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border-1 mx-2 my-2" />

          {/* Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:text-ink-1 hover:bg-surface-raised transition-[background-color,color] duration-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-raised text-ink-3 shrink-0">
              <User size={14} />
            </span>
            {t("nav.profile")}
          </button>

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger transition-[background-color] duration-100"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "var(--color-danger-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
            }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
              style={{
                backgroundColor: "var(--color-danger-bg)",
                color: "var(--color-danger)",
              }}
            >
              <LogOut size={14} />
            </span>
            {t("auth.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

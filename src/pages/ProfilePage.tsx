import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Globe, LogOut, Monitor, Moon, Shield, Sun, UserRound, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { PageHeader } from "@/organisms/PageHeader";
import { AvatarUpload } from "@/molecules/AvatarUpload";
import { LanguageSwitcher } from "@/molecules/LanguageSwitcher";
import { useToast } from "@/molecules/Toast";
import { api } from "@/lib/api";
import { Button } from "@/atoms/Button";
import { Badge } from "@/atoms/Badge";
import { cn } from "@/lib/utils";
import { setFlowPreference, getFlowPreference, flowPath } from "@/lib/flow-preference";
import { useDocumentTitle } from "@/hooks";

type Theme = "light" | "dark" | "system";

interface ChoiceButtonProps {
  active: boolean;
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
}

function ChoiceButton({ active, children, icon, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-[3.75rem] rounded-md border px-4 py-3 text-sm font-medium",
        "flex items-center justify-center gap-2 text-ink-2",
        "transition-[background-color,border-color,box-shadow,transform,color] duration-normal ease-out",
        "hover:border-border-2 hover:bg-surface-raised hover:text-ink-1",
        "active:translate-y-0 active:scale-[0.985]",
        active
          ? "border-primary bg-primary-muted text-primary shadow-[inset_0_0_0_1px_var(--color-primary-border)]"
          : "border-border-1 bg-surface",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.profile"));
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { theme, setTheme, lang } = useThemeStore();
  const toast = useToast();

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.patch<{ avatarUrl: string }>("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (user) {
        setUser({ ...user, avatarUrl: response.data.avatarUrl });
      }
      toast.success(t("avatar.uploadSuccess", { defaultValue: "Avatar updated successfully" }));
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? t("avatar.uploadError");
      toast.error(Array.isArray(msg) ? msg.join(" ") : msg);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const currentFlow = getFlowPreference();
  const otherFlow = currentFlow === "attendee" ? "organizer" : "attendee";
  const otherLabel =
    otherFlow === "attendee" ? t("gateway.attendeeTitle") : t("gateway.organizerTitle");

  const currentTheme = theme ?? "system";

  const themeOptions: { value: Theme; label: string; icon: ReactNode }[] = [
    { value: "light", label: t("common.lightMode"), icon: <Sun size={17} /> },
    { value: "dark", label: t("common.darkMode"), icon: <Moon size={17} /> },
    { value: "system", label: t("common.systemMode"), icon: <Monitor size={17} /> },
  ];

  return (
    <>
      <PageHeader title={t("nav.profile")} subtitle={user?.email} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {user && (
          <section className="card-elevated overflow-hidden">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
              <AvatarUpload
                src={user.avatarUrl}
                name={user.name}
                size="xl"
                onUpload={handleAvatarUpload}
              />

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-3xl font-semibold tracking-tight text-ink-1">
                    {user.name}
                  </h2>
                  {user.role === "admin" && (
                    <Badge variant="red" className="shrink-0 gap-1">
                      <Shield size={11} />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-ink-3">{user.email}</p>
              </div>
            </div>
          </section>
        )}

        <aside className="card p-5 space-y-4">
          {/* Switch Role */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 mb-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-primary">
                <RefreshCw size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-section-title text-ink-1">{t("profile.switchRole")}</h3>
                <p className="mt-1 text-sm text-ink-3">
                  {t("profile.currentRole")}:{" "}
                  {currentFlow === "attendee"
                    ? t("gateway.attendeeTitle")
                    : t("gateway.organizerTitle")}
                </p>
              </div>
            </div>
            <Button
              variant="default"
              className="w-full justify-center"
              onClick={() => {
                setFlowPreference(otherFlow);
                navigate(flowPath(otherFlow), { replace: true });
              }}
            >
              {t("profile.switchRoleTo", { role: otherLabel })}
            </Button>
          </div>

          <div className="border-t border-border-1" />

          {/* Settings header */}
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-primary">
              <UserRound size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title text-ink-1">{t("common.settings")}</h3>
              <p className="mt-1 text-sm text-ink-3">{t("common.profile")}</p>
            </div>
          </div>

          <Button variant="danger" className="w-full justify-center gap-2" onClick={handleLogout}>
            <LogOut size={16} />
            {t("auth.logout")}
          </Button>
        </aside>

        <section className="card overflow-hidden xl:col-span-2">
          <div className="grid gap-4 border-b border-border-1 p-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-ink-3">
                <Globe size={18} />
              </span>
              <div>
                <h3 className="text-section-title text-ink-1">{t("common.language")}</h3>
                <p className="mt-1 text-sm text-ink-3">{lang.toUpperCase()}</p>
              </div>
            </div>

            <div>
              <LanguageSwitcher variant="dropdown" className="max-w-xs" />
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-ink-3">
                <Monitor size={18} />
              </span>
              <div>
                <h3 className="text-section-title text-ink-1">{t("common.darkMode")}</h3>
                <p className="mt-1 text-sm text-ink-3">
                  {themeOptions.find((opt) => opt.value === currentTheme)?.label}
                </p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {themeOptions.map((opt) => (
                <ChoiceButton
                  key={opt.value}
                  active={currentTheme === opt.value}
                  icon={opt.icon}
                  onClick={() => setTheme(opt.value)}
                >
                  {opt.label}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

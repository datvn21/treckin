import { useState, useCallback, useEffect, useRef, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { Loader2, Ticket, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthResponse } from "@/types";
import { cn } from "@/lib/utils";
import { AuthLayout } from "@/templates";
import { useDocumentTitle } from "@/hooks";
import {
  getFlowPreference,
  setFlowPreference,
  flowPath,
  type AppFlow,
} from "@/lib/flow-preference";

type AuthMode = "login" | "register";

interface EmailFormState {
  name: string;
  email: string;
  password: string;
}

const initialForm: EmailFormState = { name: "", email: "", password: "" };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<EmailFormState>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: { pathname?: string; search?: string } } | null)
    ?.from;

  const [selectedRole, setSelectedRole] = useState<AppFlow>(() => {
    return getFlowPreference() ?? "attendee";
  });

  const [step, setStep] = useState<"role-select" | "auth-form">(() => {
    if (redirectTo?.pathname) {
      const path = redirectTo.pathname;
      const genericLandingPages = [
        "/app",
        "/app/",
        "/app/workspaces",
        "/app/workspaces/",
        "/app/join",
        "/app/join/",
        "/app/events",
        "/app/events/",
      ];
      if (!genericLandingPages.includes(path)) {
        return "auth-form";
      }
    }
    return "role-select";
  });

  const handleRoleChange = useCallback((role: AppFlow) => {
    setSelectedRole(role);
    setFlowPreference(role);
  }, []);

  useDocumentTitle(
    step === "role-select"
      ? t("gateway.title", { defaultValue: "Chọn vai trò" })
      : mode === "login"
        ? t("auth.login")
        : t("auth.register"),
  );

  const hasRedirected = useRef(false);

  const getPostAuthPath = useCallback(
    (role: AppFlow) => {
      if (!redirectTo?.pathname) return flowPath(role);
      const path = redirectTo.pathname;
      // If it's a generic dashboard landing page, force flowPath(role)
      const genericLandingPages = [
        "/app",
        "/app/",
        "/app/workspaces",
        "/app/workspaces/",
        "/app/join",
        "/app/join/",
        "/app/events",
        "/app/events/",
      ];
      if (genericLandingPages.includes(path)) {
        return flowPath(role);
      }
      return `${path}${redirectTo.search ?? ""}`;
    },
    [redirectTo],
  );

  const postAuthPath = getPostAuthPath(selectedRole);

  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate(postAuthPath, { replace: true });
    }
  }, [isAuthenticated, navigate, postAuthPath, user]);

  const updateForm = useCallback((field: keyof EmailFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }, []);

  const finishAuth = useCallback(
    (data: AuthResponse) => {
      login(data.user, data.accessToken);
      setFlowPreference(selectedRole);
      navigate(getPostAuthPath(selectedRole), { replace: true });
    },
    [login, navigate, selectedRole, getPostAuthPath],
  );

  const parseApiError = (err: unknown, fallback: string) => {
    if (typeof err === "object" && err !== null && "response" in err) {
      const errorWithResponse = err as { response?: { data?: { message?: string | string[] } } };
      const message = errorWithResponse.response?.data?.message;
      return Array.isArray(message) ? message.join(" ") : (message ?? fallback);
    }
    return fallback;
  };

  const handleEmailSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
        const payload =
          mode === "login"
            ? { email: form.email, password: form.password }
            : { name: form.name, email: form.email, password: form.password };
        const { data } = await api.post<AuthResponse>(endpoint, payload);
        finishAuth(data);
      } catch (err) {
        setError(
          parseApiError(err, mode === "login" ? t("auth.loginFailed") : t("auth.registerFailed")),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [finishAuth, form, mode, t],
  );

  const handleGoogleSuccess = useCallback(
    async (res: CredentialResponse) => {
      if (!res.credential) {
        setError(t("auth.googleFailed"));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.post<AuthResponse>("/auth/google", {
          credential: res.credential,
        });
        finishAuth(data);
      } catch (err) {
        setError(parseApiError(err, t("auth.googleFailed")));
      } finally {
        setIsLoading(false);
      }
    },
    [finishAuth, t],
  );

  return (
    <AuthLayout onBack={step === "auth-form" ? () => setStep("role-select") : undefined}>
      {step === "role-select" ? (
        <div className="card p-6 space-y-5">
          <div className="text-center space-y-1.5 pb-1">
            <h1 className="text-xl font-bold text-ink-1">
              {t("gateway.title", { defaultValue: "Bạn muốn làm gì?" })}
            </h1>
            <p className="text-xs text-ink-3">
              {t("gateway.subtitle", { defaultValue: "Chọn vai trò để bắt đầu đăng nhập." })}
            </p>
          </div>

          <div className="space-y-3">
            {/* Attendee Option */}
            <button
              type="button"
              onClick={() => {
                handleRoleChange("attendee");
                setStep("auth-form");
              }}
              className="w-full text-left p-4 card hover:bg-primary-muted border-border-1 hover:border-primary-border transition-all duration-normal flex items-start gap-4 group"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shrink-0 group-hover:scale-105 transition-transform duration-normal">
                <Ticket size={20} />
              </span>
              <div className="space-y-1 min-w-0">
                <span className="block font-semibold text-sm text-ink-1 group-hover:text-primary transition-colors truncate">
                  {t("gateway.attendeeTitle", { defaultValue: "Tham gia sự kiện" })}
                </span>
                <span className="block text-xs text-ink-3 leading-relaxed">
                  {t("gateway.attendeeDescription", {
                    defaultValue: "Quét QR, nhập mã hoặc xem sự kiện của bạn.",
                  })}
                </span>
              </div>
            </button>

            {/* Organizer Option */}
            <button
              type="button"
              onClick={() => {
                handleRoleChange("organizer");
                setStep("auth-form");
              }}
              className="w-full text-left p-4 card hover:bg-surface-raised border-border-1 hover:border-border-2 transition-all duration-normal flex items-start gap-4 group"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised text-ink-2 shrink-0 group-hover:scale-105 transition-transform duration-normal">
                <Settings2 size={20} />
              </span>
              <div className="space-y-1 min-w-0">
                <span className="block font-semibold text-sm text-ink-1 group-hover:text-primary transition-colors truncate">
                  {t("gateway.organizerTitle", { defaultValue: "Quản lý sự kiện" })}
                </span>
                <span className="block text-xs text-ink-3 leading-relaxed">
                  {t("gateway.organizerDescription", {
                    defaultValue: "Tạo workspace, quản lý sự kiện và check-in.",
                  })}
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-ink-1">
              {mode === "login" ? t("auth.login") : t("auth.register")}
            </h1>
            <p className="text-sm text-ink-3 mt-0.5">
              {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
            </p>
          </div>

          <div className="flex gap-3 mb-5 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "font-medium pb-1 border-b-2 transition-colors",
                mode === "login"
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-3 hover:text-ink-1",
              )}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={cn(
                "font-medium pb-1 border-b-2 transition-colors",
                mode === "register"
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-3 hover:text-ink-1",
              )}
            >
              {t("auth.register")}
            </button>
          </div>

          {error && <div className="notice-danger mb-4 text-sm">{error}</div>}

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === "register" && (
              <div className="field">
                <label className="label">{t("auth.name")}</label>
                <input
                  required
                  className="input"
                  placeholder={t("auth.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label className="label">{t("auth.email")}</label>
              <input
                required
                type="email"
                className="input"
                placeholder={t("auth.emailPlaceholder")}
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">{t("auth.password")}</label>
              <input
                required
                type="password"
                className="input"
                placeholder={mode === "register" ? t("auth.passwordPlaceholder") : ""}
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full mt-1">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? t("auth.login") : t("auth.register")}
            </button>
          </form>

          <div className="divider-label my-4 text-xs">{t("auth.orContinueWith")}</div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t("auth.googleFailed"))}
              shape="rectangular"
              size="medium"
              width="312"
              text="continue_with"
              locale={i18n.language === "en" ? "en" : "vi"}
              theme="outline"
            />
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

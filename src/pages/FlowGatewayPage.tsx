import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ticket, Settings2 } from "lucide-react";
import { flowPath, setFlowPreference, type AppFlow } from "@/lib/flow-preference";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks";

export function FlowGatewayPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("common.home"));
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const firstName = user?.name?.split(" ").at(-1) ?? null;

  const chooseFlow = (flow: AppFlow) => {
    setFlowPreference(flow);
    navigate(flowPath(flow), { replace: true });
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-1">
          {firstName
            ? t("gateway.titlePersonal", {
                name: firstName,
                defaultValue: `Xin chào, ${firstName}!`,
              })
            : t("gateway.title")}
        </h1>
        <p className="text-base text-ink-3">{t("gateway.subtitle")}</p>
      </div>

      {/* Cards grid — attendee takes 2/3, organizer 1/3 on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        {/* ── Attendee card (PRIMARY) ── */}
        <button
          type="button"
          onClick={() => chooseFlow("attendee")}
          className={cn(
            "lg:col-span-2 card text-left p-7 sm:p-8 min-h-[17rem]",
            "flex flex-col justify-between gap-8",
            "transition-[background-color,border-color] duration-normal ease-out",
            "border-primary-border hover:bg-primary-muted"
          )}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white"
            aria-hidden="true"
          >
            <Ticket size={26} strokeWidth={1.8} />
          </span>

          <span className="block">
            <span className="block text-2xl font-semibold tracking-tight text-ink-1">
              {t("gateway.attendeeTitle")}
            </span>
            <span className="mt-2 block text-base leading-7 text-ink-3">
              {t("gateway.attendeeDescription")}
            </span>
          </span>

          <span className="inline-flex min-h-[44px] items-center justify-center self-start rounded-md px-5 text-sm font-medium bg-primary text-white">
            {t("gateway.attendeeCta")} →
          </span>
        </button>

        {/* ── Organizer card (SECONDARY) ── */}
        <button
          type="button"
          onClick={() => chooseFlow("organizer")}
          className={cn(
            "lg:col-span-1 card text-left p-7 sm:p-8 min-h-[17rem]",
            "flex flex-col justify-between gap-8",
            "transition-[background-color,border-color] duration-normal ease-out",
            "border-border-1 hover:bg-surface-raised"
          )}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-raised text-ink-2"
            aria-hidden="true"
          >
            <Settings2 size={26} strokeWidth={1.8} />
          </span>

          <span className="block">
            <span className="block text-2xl font-semibold tracking-tight text-ink-1">
              {t("gateway.organizerTitle")}
            </span>
            <span className="mt-2 block text-base leading-7 text-ink-3">
              {t("gateway.organizerDescription")}
            </span>
          </span>

          <span className="inline-flex min-h-[44px] items-center justify-center self-start rounded-md px-5 text-sm font-medium border border-border-1 bg-surface text-ink-1">
            {t("gateway.organizerCta")}
          </span>
        </button>
      </div>
    </div>
  );
}

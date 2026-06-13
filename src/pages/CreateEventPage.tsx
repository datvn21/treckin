/* ═══════════════════════════════════════════════════════════════
   CreateEventPage — /app/workspaces/:id/events/create
   Multi-step form to create a new event in a workspace.
   ═══════════════════════════════════════════════════════════════ */

import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast, FormField, StepIndicator, CheckRow, RadioRow } from "@/molecules";
import { PageHeader } from "@/organisms/PageHeader";
import { Button } from "@/atoms";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks";
import { parseApiError } from "@/lib/parseApiError";

/* ── Helpers ─────────────────────────────────────────────────── */
function toIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ── Form state ──────────────────────────────────────────────── */
interface FormState {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  registrationEnabled: boolean;
  boards: string;
  checkinModes: string[];
  attendancePolicy: string;
  requiredBoardCount: string;
  eventQrBehavior: string;
  allowedDomains: string;
  allowedEmails: string;
  blockedEmails: string;
}

const INITIAL: FormState = {
  title: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  registrationEnabled: true,
  boards: "Board A",
  checkinModes: ["ATTENDEE_CREDENTIAL"],
  attendancePolicy: "SINGLE_IN",
  requiredBoardCount: "1",
  eventQrBehavior: "JOIN_AND_CHECKIN",
  allowedDomains: "",
  allowedEmails: "",
  blockedEmails: "",
};

/* ── Main Page ─────────────────────────────────────────────────── */
export function CreateEventPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useDocumentTitle(t("event.createEvent"));
  const toast = useToast();

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleMode = (mode: string) => {
    setForm((prev) => ({
      ...prev,
      checkinModes: prev.checkinModes.includes(mode)
        ? prev.checkinModes.filter((m) => m !== mode)
        : [...prev.checkinModes, mode],
    }));
  };

  const validate1 = () => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = t("createEvent.validation.titleRequired");
    if (!form.date) errs.date = t("createEvent.validation.dateRequired");
    if (!form.startTime) errs.startTime = t("createEvent.validation.startTimeRequired");
    if (!form.endTime) errs.endTime = t("createEvent.validation.endTimeInvalid");
    if (!form.location.trim()) errs.location = t("createEvent.validation.locationRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validate2 = () => {
    const errs: typeof errors = {};
    if (splitList(form.boards).length === 0) {
      errs.boards = t("createEvent.validation.boardsRequired");
    }
    if (form.checkinModes.length === 0) {
      errs.checkinModes = t("createEvent.validation.checkinModesRequired");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !validate2()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate1()) {
      setStep(1);
      return;
    }
    if (!validate2()) {
      setStep(2);
      return;
    }

    const boardNames = splitList(form.boards);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      date: toIsoDateTime(form.date, "00:00"),
      startTime: toIsoDateTime(form.date, form.startTime),
      endTime: toIsoDateTime(form.date, form.endTime),
      location: form.location.trim(),
      registrationEnabled: form.registrationEnabled,
      boards: boardNames.map((name) => ({ name })),
      checkinModes: form.checkinModes,
      attendancePolicy: form.attendancePolicy,
      requiredBoardCount:
        form.attendancePolicy === "BOARD_REQUIREMENTS"
          ? Number(form.requiredBoardCount)
          : undefined,
      eventQrBehavior: form.eventQrBehavior,
      allowedDomains: splitList(form.allowedDomains),
      allowedEmails: splitList(form.allowedEmails),
      blockedEmails: splitList(form.blockedEmails),
    };

    setSubmitting(true);
    try {
      const { data } = await api.post<{ id: string }>(`/workspaces/${workspaceId}/events`, payload);
      toast.success(t("event.createSuccess"));
      navigate(`/app/events/${data.id}/manage`);
    } catch (err) {
      toast.error(parseApiError(err, t("event.createFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  const STEP_TITLES = [
    t("createEvent.step1"),
    t("createEvent.step2"),
    t("createEvent.step3"),
    t("createEvent.step4"),
  ];

  return (
    <>
      <PageHeader title={t("event.createEvent")} closeTo={`/app/workspaces/${workspaceId}`} />

      <StepIndicator current={step} total={TOTAL_STEPS} />

      <div className="card p-5">
        <p className="text-section-title text-ink-1 mb-4">{STEP_TITLES[step - 1]}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <>
              <FormField label={t("event.title")} htmlFor="ev-title" required error={errors.title}>
                <input
                  id="ev-title"
                  className={cn("input", errors.title && "input-error")}
                  placeholder={t("event.titlePlaceholder")}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  autoFocus
                />
              </FormField>

              <FormField label={t("event.description")} htmlFor="ev-desc">
                <textarea
                  id="ev-desc"
                  className="input resize-none"
                  rows={3}
                  placeholder={t("event.descriptionOptional")}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label={t("event.date")} htmlFor="ev-date" required error={errors.date}>
                  <input
                    id="ev-date"
                    type="date"
                    className={cn("input", errors.date && "input-error")}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </FormField>

                <FormField
                  label={t("event.location")}
                  htmlFor="ev-location"
                  required
                  error={errors.location}
                >
                  <input
                    id="ev-location"
                    className={cn("input", errors.location && "input-error")}
                    placeholder={t("event.locationPlaceholder")}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={t("event.startTime")}
                  htmlFor="ev-start"
                  required
                  error={errors.startTime}
                >
                  <input
                    id="ev-start"
                    type="time"
                    className={cn("input", errors.startTime && "input-error")}
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                  />
                </FormField>

                <FormField
                  label={t("event.endTime")}
                  htmlFor="ev-end"
                  required
                  error={errors.endTime}
                >
                  <input
                    id="ev-end"
                    type="time"
                    className={cn("input", errors.endTime && "input-error")}
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </FormField>
              </div>

              <CheckRow
                id="reg-enabled"
                label={t("event.registrationEnabled")}
                description={t("createEvent.registrationDesc")}
                checked={form.registrationEnabled}
                onChange={(v) => set("registrationEnabled", v)}
              />
            </>
          )}

          {/* Step 2: Boards config */}
          {step === 2 && (
            <>
              <FormField
                label={t("event.boards")}
                htmlFor="ev-boards"
                hint={t("event.boardsHelp")}
                required
                error={errors.boards}
              >
                <textarea
                  id="ev-boards"
                  className={cn("input font-code resize-none", errors.boards && "input-error")}
                  rows={5}
                  placeholder={t("event.boardsPlaceholder")}
                  value={form.boards}
                  onChange={(e) => set("boards", e.target.value)}
                />
              </FormField>

              <div>
                <p className="label mb-2">{t("event.checkinModes")}</p>
                <div className="space-y-2">
                  <CheckRow
                    id="mode-credential"
                    label={t("event.scannerScanQr")}
                    description={t("createEvent.modeDesc.attendeeCredential")}
                    checked={form.checkinModes.includes("ATTENDEE_CREDENTIAL")}
                    onChange={() => toggleMode("ATTENDEE_CREDENTIAL")}
                  />
                  <CheckRow
                    id="mode-board"
                    label={t("event.attendeeScanBoard")}
                    description={t("createEvent.modeDesc.boardQr")}
                    checked={form.checkinModes.includes("BOARD_QR")}
                    onChange={() => toggleMode("BOARD_QR")}
                  />
                </div>
                {errors.checkinModes && (
                  <p className="mt-2 text-xs font-medium text-danger">{errors.checkinModes}</p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Attendance policy */}
          {step === 3 && (
            <>
              <div>
                <p className="label mb-2">{t("event.attendancePolicy")}</p>
                <div className="space-y-2">
                  <RadioRow
                    id="policy-single"
                    name="policy"
                    value="SINGLE_IN"
                    selectedValue={form.attendancePolicy}
                    label={t("event.singleIn")}
                    description={t("createEvent.policyDesc.singleIn")}
                    onChange={(v) => set("attendancePolicy", v)}
                  />
                  <RadioRow
                    id="policy-inout"
                    name="policy"
                    value="IN_OUT"
                    selectedValue={form.attendancePolicy}
                    label={t("event.inOut")}
                    description={t("createEvent.policyDesc.inOut")}
                    onChange={(v) => set("attendancePolicy", v)}
                  />
                  <RadioRow
                    id="policy-board"
                    name="policy"
                    value="BOARD_REQUIREMENTS"
                    selectedValue={form.attendancePolicy}
                    label={t("event.boardRequirements")}
                    description={t("createEvent.policyDesc.boardRequirements")}
                    onChange={(v) => set("attendancePolicy", v)}
                  />
                </div>
              </div>

              {form.attendancePolicy === "BOARD_REQUIREMENTS" && (
                <FormField label={t("event.requiredBoardCount")} htmlFor="req-boards">
                  <input
                    id="req-boards"
                    type="number"
                    min={1}
                    className="input w-24"
                    value={form.requiredBoardCount}
                    onChange={(e) => set("requiredBoardCount", e.target.value)}
                  />
                </FormField>
              )}

              <div>
                <p className="label mb-2">{t("event.qrBehavior")}</p>
                <div className="space-y-2">
                  <RadioRow
                    id="qr-join"
                    name="qr"
                    value="JOIN_ONLY"
                    selectedValue={form.eventQrBehavior}
                    label={t("event.joinOnly")}
                    description={t("createEvent.policyDesc.joinOnly")}
                    onChange={(v) => set("eventQrBehavior", v)}
                  />
                  <RadioRow
                    id="qr-joincheckin"
                    name="qr"
                    value="JOIN_AND_CHECKIN"
                    selectedValue={form.eventQrBehavior}
                    label={t("event.joinAndCheckin")}
                    description={t("createEvent.policyDesc.joinAndCheckin")}
                    onChange={(v) => set("eventQrBehavior", v)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Access control */}
          {step === 4 && (
            <>
              <FormField
                label={t("event.allowedDomains")}
                htmlFor="ev-domains"
                hint={t("event.allowedDomainsHelp")}
              >
                <textarea
                  id="ev-domains"
                  className="input font-code resize-none"
                  rows={3}
                  placeholder="hcmus.edu.vn, example.com"
                  value={form.allowedDomains}
                  onChange={(e) => set("allowedDomains", e.target.value)}
                />
              </FormField>

              <FormField label={t("event.allowedEmails")} htmlFor="ev-allowed">
                <textarea
                  id="ev-allowed"
                  className="input font-code resize-none"
                  rows={3}
                  placeholder="user@example.com"
                  value={form.allowedEmails}
                  onChange={(e) => set("allowedEmails", e.target.value)}
                />
              </FormField>

              <FormField label={t("event.blockedEmails")} htmlFor="ev-blocked">
                <textarea
                  id="ev-blocked"
                  className="input font-code resize-none"
                  rows={3}
                  placeholder="blocked@example.com"
                  value={form.blockedEmails}
                  onChange={(e) => set("blockedEmails", e.target.value)}
                />
              </FormField>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-2 border-t border-border-1 mt-6">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={back}>
                <ChevronLeft size={16} />
                {t("common.back")}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button type="button" variant="primary" onClick={next}>
                {t("common.next")}
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit" variant="primary" isLoading={submitting}>
                <Check size={16} />
                {t("event.createEvent")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

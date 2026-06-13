import { ForbiddenException } from "@nestjs/common";

export interface EventEligibilityConfig {
  allowedDomains: string[];
  allowedEmails: string[];
  blockedEmails: string[];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, "");
}

export function sanitizeEmailList(values?: string[] | null): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

export function sanitizeDomainList(values?: string[] | null): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map(normalizeDomain).filter(Boolean))];
}

export function isEmailEligible(email: string, config: EventEligibilityConfig): boolean {
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1] ?? "";
  const blockedEmails = sanitizeEmailList(config.blockedEmails);
  const allowedEmails = sanitizeEmailList(config.allowedEmails);
  const allowedDomains = sanitizeDomainList(config.allowedDomains);

  if (blockedEmails.includes(normalizedEmail)) {
    return false;
  }

  const hasAllowRules = allowedEmails.length > 0 || allowedDomains.length > 0;
  if (!hasAllowRules) {
    return true;
  }

  return allowedEmails.includes(normalizedEmail) || allowedDomains.includes(domain);
}

export function assertEmailEligible(
  email: string,
  config: EventEligibilityConfig,
  message = "Your account is not eligible for this event",
): void {
  if (!isEmailEligible(email, config)) {
    throw new ForbiddenException(message);
  }
}

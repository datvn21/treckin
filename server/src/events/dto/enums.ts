/**
 * Centralized enum constants for event DTOs.
 * All DTOs import from here to avoid duplicate exports.
 */
import {
  ATTENDANCE_POLICY_VALUES,
  CHECKIN_MODE_VALUES,
  EVENT_ASSIGNMENT_ROLE_VALUES,
  EVENT_QR_BEHAVIOR_VALUES,
  EVENT_STATUS_VALUES,
  EVENT_TYPE_VALUES,
  FIELD_TYPE_VALUES,
  SESSION_STATUS_VALUES,
} from "../../database/schema/enums";

export const ATTENDANCE_POLICY = Object.fromEntries(
  ATTENDANCE_POLICY_VALUES.map((v) => [v, v]),
) as { [K in (typeof ATTENDANCE_POLICY_VALUES)[number]]: K };

export const CHECKIN_MODE = Object.fromEntries(
  CHECKIN_MODE_VALUES.map((v) => [v, v]),
) as { [K in (typeof CHECKIN_MODE_VALUES)[number]]: K };

export const EVENT_QR_BEHAVIOR = Object.fromEntries(
  EVENT_QR_BEHAVIOR_VALUES.map((v) => [v, v]),
) as { [K in (typeof EVENT_QR_BEHAVIOR_VALUES)[number]]: K };

export const EVENT_STATUS = Object.fromEntries(
  EVENT_STATUS_VALUES.map((v) => [v, v]),
) as { [K in (typeof EVENT_STATUS_VALUES)[number]]: K };

export const EVENT_TYPE = Object.fromEntries(
  EVENT_TYPE_VALUES.map((v) => [v, v]),
) as { [K in (typeof EVENT_TYPE_VALUES)[number]]: K };

export const FIELD_TYPE = Object.fromEntries(
  FIELD_TYPE_VALUES.map((v) => [v, v]),
) as { [K in (typeof FIELD_TYPE_VALUES)[number]]: K };

export const SESSION_STATUS = Object.fromEntries(
  SESSION_STATUS_VALUES.map((v) => [v, v]),
) as { [K in (typeof SESSION_STATUS_VALUES)[number]]: K };

export const EVENT_ASSIGNMENT_ROLE = Object.fromEntries(
  EVENT_ASSIGNMENT_ROLE_VALUES.map((v) => [v, v]),
) as { [K in (typeof EVENT_ASSIGNMENT_ROLE_VALUES)[number]]: K };

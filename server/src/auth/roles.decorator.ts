import { SetMetadata } from "@nestjs/common";
import { USER_ROLE_VALUES } from "../database/schema/enums";

export const USER_ROLE = Object.fromEntries(
  USER_ROLE_VALUES.map((v: string) => [v, v]),
) as { [K in (typeof USER_ROLE_VALUES)[number]]: K };

export const ROLES_KEY = "roles";
export const Roles = (...roles: (typeof USER_ROLE_VALUES)[number][]) =>
  SetMetadata(ROLES_KEY, roles);

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract the authenticated user from the request.
 * Usage: @CurrentUser() user: JwtPayload
 * Usage: @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return null as unknown as JwtPayload;
    }

    if (!data) return user;
    const value = user[data];
    return value !== undefined ? String(value) : null;
  },
);

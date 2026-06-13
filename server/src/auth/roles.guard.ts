import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { USER_ROLE } from "@prisma/client";
import { ROLES_KEY } from "./roles.decorator";
import { JwtPayload } from "../common/decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<USER_ROLE[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles specified → allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(", ")}`);
    }

    return true;
  }
}

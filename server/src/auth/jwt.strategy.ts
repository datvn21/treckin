import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "../common/decorators/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET is required");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called after JWT is verified. The returned object is attached to request.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

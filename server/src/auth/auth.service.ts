import { Injectable, UnauthorizedException, Logger, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { users, USER_ROLE_VALUES } from "../database/schema";
import { LoginDto, RegisterDto } from "./dto/email-auth.dto";

const scrypt = promisify(scryptCallback);

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

type UserRole = (typeof USER_ROLE_VALUES)[number];

interface DbUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>("GOOGLE_CLIENT_ID"));
  }

  async authenticateWithGoogle(credential: string) {
    const googleUser = await this.validateGoogleToken(credential);

    const user = await this.createOrFindUser({
      email: googleUser.email.trim().toLowerCase(),
      name: googleUser.name,
      role: "USER",
      avatarUrl: googleUser.picture ?? null,
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return this.formatAuthResponse(user, tokens);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.db.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.hashPassword(dto.password);
    const [user] = await this.db.db
      .insert(users)
      .values({
        email,
        name: dto.name.trim(),
        role: dto.role ?? "USER",
        passwordHash,
      })
      .returning();

    const tokens = this.generateTokens(user.id, user.email, user.role as UserRole);
    return this.formatAuthResponse(user, tokens);
  }

  async login(dto: LoginDto) {
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email.trim().toLowerCase()))
      .limit(1);

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = this.generateTokens(user.id, user.email, user.role as UserRole);
    return this.formatAuthResponse(user, tokens);
  }

  private async validateGoogleToken(credential: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>("GOOGLE_CLIENT_ID"),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.name) {
        throw new UnauthorizedException("Invalid Google token payload");
      }

      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error("Google token validation failed", error);
      throw new UnauthorizedException("Invalid or expired Google credential");
    }
  }

  private async createOrFindUser(data: {
    email: string;
    name: string;
    role: UserRole;
    avatarUrl: string | null;
  }) {
    const [user] = await this.db.db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        role: data.role,
        avatarUrl: data.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: data.name,
          avatarUrl: data.avatarUrl,
        },
      })
      .returning();
    return user;
  }

  private generateTokens(userId: string, email: string, role: UserRole): TokenPair {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRATION", "15m"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRATION", "7d"),
    });

    return { accessToken, refreshToken };
  }

  private static readonly SCRYPT_KEY_LENGTH = 64;

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scrypt(password, salt, AuthService.SCRYPT_KEY_LENGTH)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, storedKey] = hash.split(":");
    if (!salt || !storedKey) return false;

    const storedBuffer = Buffer.from(storedKey, "hex");
    if (storedBuffer.length !== AuthService.SCRYPT_KEY_LENGTH) return false;
    const derivedKey = (await scrypt(password, salt, AuthService.SCRYPT_KEY_LENGTH)) as Buffer;
    return timingSafeEqual(storedBuffer, derivedKey);
  }

  private formatAuthResponse(user: DbUser, tokens: TokenPair): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role as string).toLowerCase(),
        avatarUrl: user.avatarUrl ?? "",
        createdAt: user.createdAt.toISOString(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

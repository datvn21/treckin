import { Injectable, UnauthorizedException, Logger, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import { USER_ROLE } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { PrismaService } from "../prisma/prisma.service";
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
    role: USER_ROLE;
    avatarUrl: string | null;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
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
      role: USER_ROLE.USER,
      avatarUrl: googleUser.picture ?? null,
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return this.formatAuthResponse(user, tokens);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { email: true },
    });

    if (existingUser?.email === email) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        role: dto.role ?? USER_ROLE.USER,
        passwordHash,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return this.formatAuthResponse(user, tokens);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);
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
    role: USER_ROLE;
    avatarUrl: string | null;
  }) {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
      create: {
        email: data.email,
        name: data.name,
        role: data.role,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  private generateTokens(userId: string, email: string, role: USER_ROLE): TokenPair {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRATION", "15m"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRATION", "7d"),
    });

    return { accessToken, refreshToken };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, storedKey] = hash.split(":");
    if (!salt || !storedKey) return false;

    const storedBuffer = Buffer.from(storedKey, "hex");
    const derivedKey = (await scrypt(password, salt, storedBuffer.length)) as Buffer;
    return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
  }

  private formatAuthResponse(
    user: {
      id: string;
      email: string;
      name: string;
      role: USER_ROLE;
      avatarUrl: string | null;
      createdAt: Date;
    },
    tokens: TokenPair,
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        avatarUrl: user.avatarUrl ?? "",
        createdAt: user.createdAt.toISOString(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

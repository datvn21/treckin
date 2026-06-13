import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { RedisService } from '../redis/redis.service';

interface QrGenerateResult {
  hash: string;
  expiresAt: Date;
  ttl: number;
  /** 6-character alphanumeric short code mapped to the same credential */
  shortCode: string;
}

export type QrToken =
  | {
      type: 'PERSONAL';
      userId: string;
      eventId?: string;
      issuedAt: number;
      expiresAt: number;
      jti: string;
    }
  | {
      type: 'BOARD';
      eventId: string;
      boardId: string;
      direction: 'IN' | 'OUT';
      issuedAt: number;
      expiresAt: number;
      jti: string;
    };

/** Legacy payload shape kept for backwards-compat during offline sync */
type LegacyQrToken =
  | { type: 'PERSONAL'; userId: string; eventId?: string; timestamp: number; jti?: string }
  | { type: 'BOARD'; eventId: string; boardId: string; direction: 'IN' | 'OUT'; timestamp: number; jti?: string };

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly hmacSecret: string;
  private readonly ttlSeconds: number;

  /** Short-code Redis key prefix */
  private readonly SHORT_CODE_PREFIX = 'QR_SC:';
  /** Consumed JTI prefix for single-use enforcement */
  private readonly JTI_PREFIX = 'QR_JTI:';

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const hmacSecret = this.configService.get<string>('QR_HMAC_SECRET');
    if (!hmacSecret) {
      throw new Error('QR_HMAC_SECRET environment variable is required.');
    }
    this.hmacSecret = hmacSecret;
    this.ttlSeconds = this.configService.get<number>('QR_TTL_SECONDS', 30);
  }

  async generatePersonalQr(userId: string, eventId?: string): Promise<QrGenerateResult> {
    const now = Date.now();
    return this.createSignedToken({
      type: 'PERSONAL',
      userId,
      eventId,
      issuedAt: now,
      expiresAt: now + this.ttlSeconds * 1000,
      jti: randomUUID(),
    });
  }

  async generateBoardQr(
    eventId: string,
    boardId: string,
    direction: 'IN' | 'OUT' = 'IN',
  ): Promise<QrGenerateResult> {
    const now = Date.now();
    return this.createSignedToken({
      type: 'BOARD',
      eventId,
      boardId,
      direction,
      issuedAt: now,
      expiresAt: now + this.ttlSeconds * 1000,
      jti: randomUUID(),
    });
  }

  /** Alias kept for backwards compat */
  async generateHash(userId: string, eventId: string): Promise<QrGenerateResult> {
    return this.generatePersonalQr(userId, eventId);
  }

  private async createSignedToken(payloadData: QrToken): Promise<QrGenerateResult> {
    const payload = JSON.stringify(payloadData);

    const signature = createHmac('sha256', this.hmacSecret)
      .update(payload)
      .digest('hex');

    const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;

    const redisKey = `QR:${token}`;

    await this.redisService.setex(redisKey, this.ttlSeconds, payload);

    // Generate a 6-char alphanumeric short code and map it to the full token
    const shortCode = await this.createShortCode(token, this.ttlSeconds);

    const expiresAt = new Date(payloadData.expiresAt);

    this.logger.debug(
      `QR token generated type=${payloadData.type} ttl=${this.ttlSeconds}s jti=${payloadData.jti}`,
    );

    return {
      hash: token,
      expiresAt,
      ttl: this.ttlSeconds,
      shortCode,
    };
  }

  /**
   * Generate a 6-character uppercase alphanumeric short code (e.g. "A3X7KP")
   * that maps to a full credential hash in Redis.
   * The short code expires alongside the credential + max grace period (300 s).
   */
  private async createShortCode(hash: string, ttlSeconds: number): Promise<string> {
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous chars
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      const key = `${this.SHORT_CODE_PREFIX}${code}`;
      const existing = await this.redisService.get(key);
      if (!existing) {
        // Store for ttl + max grace (300 s)
        await this.redisService.setex(key, ttlSeconds + 300, hash);
        return code;
      }
    }
    // Fallback: use first 6 chars of jti from hash (collision extremely unlikely)
    const fallback = Buffer.from(hash).toString('base64url').substring(0, 6).toUpperCase();
    const key = `${this.SHORT_CODE_PREFIX}${fallback}`;
    await this.redisService.setex(key, ttlSeconds + 300, hash);
    return fallback;
  }

  /**
   * Resolve a short code to its full credential hash.
   * Returns null if the code is unknown or expired.
   */
  async resolveShortCode(code: string): Promise<string | null> {
    const key = `${this.SHORT_CODE_PREFIX}${code.trim().toUpperCase()}`;
    return this.redisService.get(key);
  }

  /**
   * Validate a QR token (full hash). Returns the decoded payload or null.
   *
   * Online fast-path: checks Redis (TTL enforced by Redis expiry).
   * Offline sync fallback: re-verifies HMAC + checks expiresAt + optional grace window.
   *
   * @param hash The full credential hash
   * @param graceMs Additional milliseconds of grace past expiresAt (offline sync only).
   *               For online scans, pass 0 (no grace needed; Redis TTL already enforces it).
   */
  async validateToken(hash: string, graceMs = 0): Promise<QrToken | null> {
    // 1. Try Redis fast-path (most common case — online scan)
    const redisKey = `QR:${hash}`;
    const raw = await this.redisService.get(redisKey);

    if (raw) {
      try {
        return this.normalizePayload(JSON.parse(raw));
      } catch {
        this.logger.error(`Corrupted QR data in Redis for hash`);
      }
    }

    // 2. Offline sync fallback: extract and verify signature + expiresAt from token
    if (!hash.includes('.')) {
      return null;
    }

    const dotIndex = hash.lastIndexOf('.');
    const payloadB64 = hash.substring(0, dotIndex);
    const signature = hash.substring(dotIndex + 1);

    if (!payloadB64 || !signature) {
      return null;
    }

    try {
      // Try base64url first (new format), then base64 (legacy)
      let payload: string;
      try {
        payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      } catch {
        payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
      }

      const parsed = this.normalizePayload(JSON.parse(payload));
      if (!parsed) {
        return null;
      }

      // Verify the expiresAt + grace window
      const deadline = parsed.expiresAt + graceMs;
      if (Date.now() > deadline) {
        this.logger.warn(
          `Offline QR token expired (expiresAt=${new Date(parsed.expiresAt).toISOString()} grace=${graceMs}ms)`,
        );
        return null;
      }

      const expectedSignature = createHmac('sha256', this.hmacSecret)
        .update(payload)
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return null;
      }

      if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
      }

      return parsed;
    } catch (err) {
      this.logger.error(`Failed to decode offline QR signature`, err);
      return null;
    }
  }

  async validateHash(hash: string): Promise<{ userId: string; eventId?: string } | null> {
    const token = await this.validateToken(hash);
    if (!token || token.type !== 'PERSONAL') return null;
    return { userId: token.userId, eventId: token.eventId };
  }

  /**
   * Mark a JTI as consumed in Redis (single-use enforcement).
   * Stored for the duration of the TTL + max grace so replays are caught even after expiry.
   */
  async markJtiConsumed(jti: string): Promise<void> {
    const key = `${this.JTI_PREFIX}${jti}`;
    await this.redisService.setex(key, this.ttlSeconds + 300, '1');
  }

  async isJtiConsumed(jti: string): Promise<boolean> {
    const key = `${this.JTI_PREFIX}${jti}`;
    return (await this.redisService.get(key)) !== null;
  }

  /**
   * Consume (delete) a QR hash from Redis after successful check-in.
   * Also marks the JTI as consumed for replay prevention.
   */
  async consumeHash(hash: string): Promise<void> {
    const redisKey = `QR:${hash}`;
    // Try to parse JTI from the stored payload to mark it consumed
    const raw = await this.redisService.get(redisKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<QrToken>;
        if (parsed.jti) {
          await this.markJtiConsumed(parsed.jti);
        }
      } catch { /* ignore parse errors */ }
    }
    await this.redisService.del(redisKey);
  }

  private normalizePayload(raw: unknown): QrToken | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;

    // Determine timestamps — support both new (issuedAt/expiresAt) and legacy (timestamp) shapes
    let issuedAt: number;
    let expiresAt: number;

    if (typeof data['issuedAt'] === 'number' && typeof data['expiresAt'] === 'number') {
      issuedAt = data['issuedAt'];
      expiresAt = data['expiresAt'];
    } else if (typeof data['timestamp'] === 'number') {
      // Legacy shape: timestamp = issuedAt, expiresAt = timestamp + ttl (approximated)
      issuedAt = data['timestamp'];
      expiresAt = issuedAt + this.ttlSeconds * 1000;
    } else {
      return null;
    }

    const jti = typeof data['jti'] === 'string' ? data['jti'] : randomUUID();

    if (data['type'] === 'PERSONAL') {
      if (typeof data['userId'] !== 'string') return null;
      return {
        type: 'PERSONAL',
        userId: data['userId'],
        eventId: typeof data['eventId'] === 'string' ? data['eventId'] : undefined,
        issuedAt,
        expiresAt,
        jti,
      };
    }

    if (data['type'] === 'BOARD') {
      if (typeof data['eventId'] !== 'string' || typeof data['boardId'] !== 'string') return null;
      const direction = data['direction'] === 'OUT' ? 'OUT' : 'IN';
      return {
        type: 'BOARD',
        eventId: data['eventId'],
        boardId: data['boardId'],
        direction,
        issuedAt,
        expiresAt,
        jti,
      };
    }

    return null;
  }
}

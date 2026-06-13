import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.client = new Redis({
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
      password: this.configService.get<string>("REDIS_PASSWORD") || undefined,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error("Redis connection failed after 3 retries");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on("connect", () => this.logger.log("Connected to Redis"));
    this.client.on("error", (err) => this.logger.error("Redis error", err));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log("Disconnected from Redis");
  }

  // ── Basic Operations ──────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /** Set with expiration in seconds */
  async setex(key: string, ttl: number, value: string): Promise<void> {
    await this.client.setex(key, ttl, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ── Distributed Lock ──────────────────────────────────────

  /**
   * Acquire a distributed lock using SET NX EX.
   * Returns a unique lockValue on success (needed to release), or null on failure.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const lockValue = uuidv4();
    const result = await this.client.set(key, lockValue, "EX", ttlSeconds, "NX");

    if (result === "OK") {
      this.logger.debug(`Lock acquired: ${key}`);
      return lockValue;
    }

    this.logger.debug(`Lock contention on: ${key}`);
    return null;
  }

  /**
   * Release a distributed lock only if the caller owns it (compare lockValue).
   * Uses a Lua script for atomicity.
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.client.eval(luaScript, 1, key, lockValue);
    const released = result === 1;

    if (released) {
      this.logger.debug(`Lock released: ${key}`);
    } else {
      this.logger.warn(`Lock release failed (not owner): ${key}`);
    }

    return released;
  }
}

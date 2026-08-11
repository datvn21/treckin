import { Controller, Get, HttpCode, HttpStatus, HttpException, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.constants";
import { RedisService } from "../redis/redis.service";

/**
 * Health check endpoints used by Docker / orchestrator probes and uptime
 * monitors. Does NOT require authentication — must always be reachable.
 *
 *   • `GET /health`        — liveness  (process is up, serves HTTP)
 *   • `GET /health/ready`  — readiness (deps Postgres + Redis are reachable)
 */
interface DepStatus {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  deps: {
    postgres: DepStatus;
    redis: DepStatus;
  };
}

const now = () => new Date().toISOString();

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redis: RedisService,
  ) {}

  /**
   * Liveness probe — cheap, never touches external deps. Use this from
   * Docker/K8s `livenessProbe` so the container is only restarted when the
   * process itself is wedged.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Liveness probe" })
  liveness(): { status: string; timestamp: string; uptime: number } {
    return {
      status: "ok",
      timestamp: now(),
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness probe — pings every hard dependency.
   * Returns HTTP 200 with `status: "ok"` when every dependency responds, or
   * HTTP 503 with `status: "degraded"` when any dep fails (so the
   * orchestrator can stop routing traffic to this instance).
   */
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe — checks all dependencies" })
  @ApiResponse({ status: 200, description: "All dependencies healthy" })
  @ApiResponse({ status: 503, description: "One or more dependencies are down" })
  async readiness(): Promise<HealthReport> {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);

    const allUp = postgres.status === "up" && redis.status === "up";
    const report: HealthReport = {
      status: allUp ? "ok" : "degraded",
      timestamp: now(),
      uptime: process.uptime(),
      deps: { postgres, redis },
    };

    if (!allUp) {
      throw new HttpException(report, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }

  private async checkPostgres(): Promise<DepStatus> {
    const start = Date.now();
    let client;
    try {
      client = await this.pool.connect();
      await client.query("SELECT 1");
      return { status: "up", latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "down",
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      client?.release();
    }
  }

  private async checkRedis(): Promise<DepStatus> {
    const start = Date.now();
    try {
      const ok = await this.redis.ping();
      if (!ok) {
        return { status: "down", error: "PING did not return PONG" };
      }
      return { status: "up", latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "down",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
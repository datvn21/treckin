import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

/**
 * Health check endpoint used by Docker/Kubernetes probes and uptime monitors.
 * Does not require authentication — must always be reachable.
 */
@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Server health check" })
  check(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}

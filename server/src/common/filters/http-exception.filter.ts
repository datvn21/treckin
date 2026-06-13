import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply } from "fastify";

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "string") {
        message = response;
        error = HttpStatus[statusCode] || "Error";
      } else {
        const resp = response as Record<string, unknown>;
        message = (resp["message"] as string | string[]) || exception.message;
        error = (resp["error"] as string) || HttpStatus[statusCode] || "Error";
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
      error = "Internal Server Error";

      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error: ${exception instanceof Error ? exception.message : "Unknown"}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorResponse: ErrorResponseBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url as string,
    };

    reply.status(statusCode).send(errorResponse);
  }
}

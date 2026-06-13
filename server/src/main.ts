import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// BigInt JSON serialization patch
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // ── Multipart (file upload) ────────────────────────────────
  await app.register(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@fastify/multipart'),
    { limits: { fileSize: 2 * 1024 * 1024 } }, // 2 MB
  );

  // ── Static Files (Local upload testing) ────────────────────
  const publicPath = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }
  await app.register(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@fastify/static'),
    {
      root: publicPath,
      prefix: '/public/',
    },
  );

  // Set global API prefix
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  // ── CORS ────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global Pipes ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // ── Global Filters ──────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger ─────────────────────────────────────────────
  // Only expose API docs in non-production environments
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Treckin API')
      .setDescription('Event check-in management with anti-fraud QR codes')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
  }

  // ── Start ───────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();

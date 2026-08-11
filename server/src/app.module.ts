import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { QrModule } from "./qr/qr.module";
import { CheckinModule } from "./checkin/checkin.module";
import { GatewayModule } from "./gateway/gateway.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { HealthModule } from "./health/health.module";
import { StorageModule } from "./storage/storage.module";
import { UploadModule } from "./upload/upload.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    DatabaseModule,
    RedisModule,
    StorageModule.register(),
    AuthModule,
    EventsModule,
    QrModule,
    CheckinModule,
    GatewayModule,
    WorkspacesModule,
    UploadModule,
    HealthModule,
  ],
})
export class AppModule {}

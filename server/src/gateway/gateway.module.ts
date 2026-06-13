import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { EventsGateway } from "./events.gateway";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "fallback-secret"),
      }),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}

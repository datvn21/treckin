import { Module } from "@nestjs/common";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { QrModule } from "../qr/qr.module";
import { GatewayModule } from "../gateway/gateway.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [QrModule, GatewayModule, EventsModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}

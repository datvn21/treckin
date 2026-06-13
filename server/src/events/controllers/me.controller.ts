import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { EventsService } from "../events.service";

@ApiTags("Me")
@Controller("me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("events")
  @ApiOperation({ summary: "List events related to the current user" })
  events(
    @Query("view") view: "attending" | "managing" | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.getMeEvents(user.sub, view);
  }
}

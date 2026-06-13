import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { CreateEventDto } from "../dto/create-event.dto";
import { EventsService } from "../events.service";

@ApiTags("Workspace Events")
@Controller("workspaces/:workspaceId/events")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new event in a workspace" })
  create(
    @Param("workspaceId", ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.create(dto, user.sub, workspaceId);
  }

  @Get()
  @ApiOperation({ summary: "List events in a workspace" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @Param("workspaceId", ParseUUIDPipe) workspaceId: string,
    @Query("page") page: number | undefined,
    @Query("limit") limit: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.findWorkspaceEvents(workspaceId, user.sub, page ?? 1, limit ?? 20);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import {
  AssignEventMemberDto,
  CreateAttendeeFieldDto,
  CreateConsentPolicyDto,
  CreateEventSessionDto,
  JoinEventDto,
  UpdateAttendeeFieldDto,
  UpdateConsentPolicyDto,
  UpdateEventDto,
  UpdateEventSessionDto,
  UpdateEventSettingsDto,
} from "../dto/event-access.dto";
import { CreateEventDto } from "../dto/create-event.dto";
import { EventsService } from "../events.service";

@ApiTags("Events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new event. Prefer POST /workspaces/:workspaceId/events." })
  @ApiResponse({ status: 201, description: "Event created successfully" })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    const workspaceId = (dto as CreateEventDto & { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      throw new BadRequestException(
        "workspaceId is required. Use POST /workspaces/:workspaceId/events.",
      );
    }
    return this.eventsService.create(dto, user.sub, workspaceId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List events related to the current user" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @Query("page") page: number | undefined,
    @Query("limit") limit: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.findAllForUser(user.sub, page ?? 1, limit ?? 20);
  }

  @Post("join")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join an event by code" })
  join(@Body() dto: JoinEventDto, @CurrentUser() user: JwtPayload) {
    return this.eventsService.join(dto, user.sub);
  }

  @Get("join-code/:joinCode")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join an event by code" })
  joinByCode(@Param("joinCode") joinCode: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.join({ joinCode }, user.sub);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findOne(id, user.sub);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update event settings" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.update(id, dto, user.sub);
  }

  @Get(":id/boards")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get boards for an event" })
  findBoards(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findEventBoards(id, user.sub);
  }

  @Get(":id/settings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event attendance and check-in settings" })
  getSettings(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getSettings(id, user.sub);
  }

  @Patch(":id/settings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update event attendance and check-in settings" })
  updateSettings(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateSettings(id, dto, user.sub);
  }

  @Get(":id/sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List event sessions" })
  listSessions(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.listSessions(id, user.sub);
  }

  @Post(":id/sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an event session" })
  createSession(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateEventSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.createSession(id, dto, user.sub);
  }

  @Patch(":id/sessions/:sessionId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event session" })
  updateSession(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateEventSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateSession(id, sessionId, dto, user.sub);
  }

  @Get(":id/attendee-fields")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List event attendee field definitions" })
  listAttendeeFields(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.listAttendeeFields(id, user.sub);
  }

  @Post(":id/attendee-fields")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an event attendee field definition" })
  createAttendeeField(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateAttendeeFieldDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.createAttendeeField(id, dto, user.sub);
  }

  @Patch(":id/attendee-fields/:fieldId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update or archive an event attendee field definition" })
  updateAttendeeField(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("fieldId", ParseUUIDPipe) fieldId: string,
    @Body() dto: UpdateAttendeeFieldDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateAttendeeField(id, fieldId, dto, user.sub);
  }

  @Get(":id/consent-policies")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List event consent policies" })
  listConsentPolicies(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.listConsentPolicies(id, user.sub);
  }

  @Post(":id/consent-policies")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an event consent policy" })
  createConsentPolicy(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateConsentPolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.createConsentPolicy(id, dto, user.sub);
  }

  @Patch(":id/consent-policies/:policyId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update an event consent policy" })
  updateConsentPolicy(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("policyId", ParseUUIDPipe) policyId: string,
    @Body() dto: UpdateConsentPolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateConsentPolicy(id, policyId, dto, user.sub);
  }

  @Post(":id/assignments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Assign manager or scanner to an event" })
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignEventMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.assign(id, dto, user.sub);
  }

  @Delete(":id/assignments/:userId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove event assignment" })
  removeAssignment(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.removeAssignment(id, userId, user.sub);
  }

  @Get(":id/registrations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get registrations with checkin records for an event" })
  findRegistrations(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findRegistrations(id, user.sub);
  }

  @Get(":id/export/csv")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Export event check-in list as CSV" })
  async exportCsv(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("scope") scope: "all" | "checked-in" | undefined,
    @CurrentUser() user: JwtPayload,
    @Res() res: any,
  ) {
    const csvContent = await this.eventsService.exportCsv(id, scope ?? "all", user.sub);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=export.csv`);
    return res.send(csvContent);
  }

  @Post(":id/boards")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new board for an event" })
  createBoard(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: { name: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.createBoard(id, dto.name, user.sub);
  }

  @Patch(":id/boards/:boardId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update event board" })
  updateBoard(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("boardId", ParseUUIDPipe) boardId: string,
    @Body() dto: { name?: string; status?: "ACTIVE" | "PAUSED" | "CLOSED" },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateBoard(id, boardId, dto, user.sub);
  }

  @Delete(":id/boards/:boardId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete event board" })
  deleteBoard(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("boardId", ParseUUIDPipe) boardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.deleteBoard(id, boardId, user.sub);
  }
}

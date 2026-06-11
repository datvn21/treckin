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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import {
  AssignEventMemberDto,
  CreateEventSessionDto,
  JoinEventDto,
  UpdateEventDto,
  UpdateEventSessionDto,
  UpdateEventSettingsDto,
} from './dto/event-access.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event. Prefer POST /workspaces/:workspaceId/events.' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    const workspaceId = (dto as CreateEventDto & { workspaceId?: string }).workspaceId;
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required. Use POST /workspaces/:workspaceId/events.');
    }
    return this.eventsService.create(dto, user.sub, workspaceId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List events related to the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page: number | undefined,
    @Query('limit') limit: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.findAllForUser(user.sub, page ?? 1, limit ?? 20);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join an event by code' })
  join(@Body() dto: JoinEventDto, @CurrentUser() user: JwtPayload) {
    return this.eventsService.join(dto, user.sub);
  }

  @Get('join-code/:joinCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join an event by code' })
  joinByCode(@Param('joinCode') joinCode: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.join({ joinCode }, user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event settings' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.update(id, dto, user.sub);
  }

  @Get(':id/boards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get boards for an event' })
  findBoards(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findEventBoards(id, user.sub);
  }

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event attendance and check-in settings' })
  getSettings(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.getSettings(id, user.sub);
  }

  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event attendance and check-in settings' })
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateSettings(id, dto, user.sub);
  }

  @Get(':id/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List event sessions' })
  listSessions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.listSessions(id, user.sub);
  }

  @Post(':id/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an event session' })
  createSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEventSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.createSession(id, dto, user.sub);
  }

  @Patch(':id/sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event session' })
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateEventSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.updateSession(id, sessionId, dto, user.sub);
  }

  @Post(':id/assignments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign manager or scanner to an event' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignEventMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.assign(id, dto, user.sub);
  }

  @Delete(':id/assignments/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove event assignment' })
  removeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.removeAssignment(id, userId, user.sub);
  }
}

@ApiTags('Workspace Events')
@Controller('workspaces/:workspaceId/events')
export class WorkspaceEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event in a workspace' })
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.create(dto, user.sub, workspaceId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List events in a workspace' })
  findAll(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query('page') page: number | undefined,
    @Query('limit') limit: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.findWorkspaceEvents(workspaceId, user.sub, page ?? 1, limit ?? 20);
  }
}

@ApiTags('Me')
@Controller('me')
export class MeController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List events related to the current user' })
  events(
    @Query('view') view: 'attending' | 'managing' | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventsService.getMeEvents(user.sub, view);
  }
}

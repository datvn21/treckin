import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ATTENDANCE_POLICY,
  CHECKIN_MODE,
  EVENT_ASSIGNMENT_ROLE,
  EVENT_STATUS,
  EVENT_QR_BEHAVIOR,
  Prisma,
  WORKSPACE_MEMBER_ROLE,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateEventDto } from './dto/create-event.dto';
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
} from './dto/event-access.dto';
import { assertEmailEligible, sanitizeDomainList, sanitizeEmailList } from './event-eligibility';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async create(dto: CreateEventDto, createdById: string, workspaceId: string) {
    this.logger.log(`Creating event "${dto.title}" by user ${createdById}`);
    await this.workspacesService.canCreateEvent(workspaceId, createdById);
    this.validateAttendanceConfig(dto.attendancePolicy, dto.requiredBoardCount, dto.boards.length);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const settings = await this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId },
    });

    const event = await this.prisma.event.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || undefined,
        date: new Date(dto.date),
        startTime,
        endTime,
        startsAt: startTime,
        endsAt: endTime,
        location: dto.location.trim(),
        locationName: dto.location.trim(),
        status: this.resolveEventStatus(startTime, endTime),
        visibility: settings.defaultEventVisibility,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceRadius: dto.geofenceRadius,
        registrationEnabled: dto.registrationEnabled ?? true,
        attendancePolicy: dto.attendancePolicy ?? ATTENDANCE_POLICY.SINGLE_IN,
        requiredBoardCount:
          dto.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS
            ? dto.requiredBoardCount
            : null,
        allowedDomains: sanitizeDomainList(dto.allowedDomains),
        allowedEmails: sanitizeEmailList(dto.allowedEmails),
        blockedEmails: sanitizeEmailList(dto.blockedEmails),
        checkinModes: this.resolveCheckinModes(dto.checkinModes),
        eventQrBehavior: dto.eventQrBehavior ?? EVENT_QR_BEHAVIOR.JOIN_ONLY,
        credentialGraceSeconds: dto.credentialGraceSeconds ?? 120,
        createdById,
        workspaceId,
        joinCode: await this.generateJoinCode(),
        settings: {
          create: {
            attendancePolicy: dto.attendancePolicy ?? ATTENDANCE_POLICY.SINGLE_IN,
            requiredBoardCount:
              dto.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS
                ? dto.requiredBoardCount
                : null,
            checkinModes: this.resolveCheckinModes(dto.checkinModes),
            eventQrBehavior: dto.eventQrBehavior ?? EVENT_QR_BEHAVIOR.JOIN_ONLY,
            credentialGraceSeconds: dto.credentialGraceSeconds ?? settings.defaultOfflineGraceSeconds,
            qrTtlSeconds: settings.defaultQrTtlSeconds,
            offlineSyncEnabled: true,
            geofenceEnabled: dto.latitude != null && dto.longitude != null,
            geofenceRadiusMeters: dto.geofenceRadius,
          },
        },
        boards: {
          create: dto.boards.map((board) => ({
            name: board.name,
          })),
        },
      },
      include: {
        boards: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return this.withResolvedStatus(event);
  }

  async findAllForUser(userId: string, pageParam?: any, limitParam?: any) {
    let page = Number(pageParam);
    let limit = Number(limitParam);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: this.visibleEventWhere(userId),
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          boards: {
            select: { id: true, name: true, status: true, checkinCount: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          workspace: { select: { id: true, name: true } },
          assignments: {
            where: { userId },
            select: { role: true },
          },
          _count: {
            select: { checkins: true, registrations: true },
          },
        },
      }),
      this.prisma.event.count({ where: this.visibleEventWhere(userId) }),
    ]);

    return {
      data: events.map((event) => this.withResolvedStatus(event)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findWorkspaceEvents(workspaceId: string, userId: string, pageParam?: any, limitParam?: any) {
    await this.requireWorkspaceMember(workspaceId, userId);
    let page = Number(pageParam);
    let limit = Number(limitParam);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: this.eventInclude(userId),
      }),
      this.prisma.event.count({ where: { workspaceId } }),
    ]);

    return {
      data: events.map((event) => this.withResolvedStatus(event)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    await this.requireEventAccess(id, userId);
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.eventInclude(userId),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return this.withResolvedStatus(event);
  }

  async update(eventId: string, dto: UpdateEventDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    if (dto.attendancePolicy || dto.requiredBoardCount !== undefined) {
      const boardCount = await this.prisma.board.count({ where: { eventId } });
      this.validateAttendanceConfig(
        dto.attendancePolicy ?? event.attendancePolicy,
        dto.requiredBoardCount ?? event.requiredBoardCount ?? undefined,
        boardCount,
      );
    }
    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        registrationEnabled: dto.registrationEnabled,
        status: dto.status,
        attendancePolicy: dto.attendancePolicy,
        requiredBoardCount:
          dto.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS
            ? dto.requiredBoardCount
            : dto.attendancePolicy
              ? null
              : dto.requiredBoardCount,
        allowedDomains: dto.allowedDomains ? sanitizeDomainList(dto.allowedDomains) : undefined,
        allowedEmails: dto.allowedEmails ? sanitizeEmailList(dto.allowedEmails) : undefined,
        blockedEmails: dto.blockedEmails ? sanitizeEmailList(dto.blockedEmails) : undefined,
        checkinModes: dto.checkinModes ? this.resolveCheckinModes(dto.checkinModes) : undefined,
        eventQrBehavior: dto.eventQrBehavior,
        credentialGraceSeconds: dto.credentialGraceSeconds,
      },
      include: this.eventInclude(userId),
    });

    return this.withResolvedStatus(updatedEvent);
  }

  async getSettings(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.prisma.eventSettings.upsert({
      where: { eventId },
      update: {},
      create: {
        eventId,
        attendancePolicy: event.attendancePolicy,
        requiredBoardCount: event.requiredBoardCount,
      },
    });
  }

  async updateSettings(eventId: string, dto: UpdateEventSettingsDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const boardCount = await this.prisma.board.count({ where: { eventId } });
    this.validateAttendanceConfig(
      dto.attendancePolicy ?? event.attendancePolicy,
      dto.requiredBoardCount ?? event.requiredBoardCount,
      boardCount,
    );

    const settings = await this.prisma.eventSettings.upsert({
      where: { eventId },
      update: {
        attendancePolicy: dto.attendancePolicy,
        requiredBoardCount:
          dto.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS
            ? dto.requiredBoardCount
            : dto.attendancePolicy
              ? null
              : dto.requiredBoardCount,
        checkinModes: dto.checkinModes ? this.resolveCheckinModes(dto.checkinModes) : undefined,
        eventQrBehavior: dto.eventQrBehavior,
        qrTtlSeconds: dto.qrTtlSeconds,
        credentialGraceSeconds: dto.credentialGraceSeconds,
        offlineSyncEnabled: dto.offlineSyncEnabled,
        geofenceEnabled: dto.geofenceEnabled,
        geofenceRadiusMeters: dto.geofenceRadiusMeters,
        manualCheckinEnabled: dto.manualCheckinEnabled,
        manualCorrectionEnabled: dto.manualCorrectionEnabled,
        requireCorrectionReason: dto.requireCorrectionReason,
        certificateEnabled: dto.certificateEnabled,
        attendanceProofEnabled: dto.attendanceProofEnabled,
      },
      create: {
        eventId,
        attendancePolicy: dto.attendancePolicy ?? event.attendancePolicy,
        requiredBoardCount:
          (dto.attendancePolicy ?? event.attendancePolicy) === ATTENDANCE_POLICY.BOARD_REQUIREMENTS
            ? (dto.requiredBoardCount ?? event.requiredBoardCount)
            : null,
        checkinModes: dto.checkinModes ? this.resolveCheckinModes(dto.checkinModes) : event.checkinModes,
        eventQrBehavior: dto.eventQrBehavior ?? event.eventQrBehavior,
        qrTtlSeconds: dto.qrTtlSeconds,
        credentialGraceSeconds: dto.credentialGraceSeconds ?? event.credentialGraceSeconds,
        offlineSyncEnabled: dto.offlineSyncEnabled,
        geofenceEnabled: dto.geofenceEnabled,
        geofenceRadiusMeters: dto.geofenceRadiusMeters ?? event.geofenceRadius,
        manualCheckinEnabled: dto.manualCheckinEnabled,
        manualCorrectionEnabled: dto.manualCorrectionEnabled,
        requireCorrectionReason: dto.requireCorrectionReason,
        certificateEnabled: dto.certificateEnabled,
        attendanceProofEnabled: dto.attendanceProofEnabled,
      },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        attendancePolicy: settings.attendancePolicy,
        requiredBoardCount: settings.requiredBoardCount,
        checkinModes: settings.checkinModes,
        eventQrBehavior: settings.eventQrBehavior,
        credentialGraceSeconds: settings.credentialGraceSeconds,
        geofenceRadius: settings.geofenceRadiusMeters,
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.settings.updated', 'EventSettings', settings.id, {
      after: settings,
      metadata: { eventId },
    });
    return settings;
  }

  async listSessions(eventId: string, userId: string) {
    await this.requireEventAccess(eventId, userId);
    return this.prisma.eventSession.findMany({
      where: { eventId },
      orderBy: { startsAt: 'asc' },
      include: {
        boards: true,
        _count: { select: { checkins: true } },
      },
    });
  }

  async createSession(eventId: string, dto: CreateEventSessionDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateSessionWindow(startsAt, endsAt, dto.checkinOpensAt, dto.checkinClosesAt);

    const session = await this.prisma.eventSession.create({
      data: {
        eventId,
        title: dto.title.trim(),
        description: dto.description?.trim() || undefined,
        startsAt,
        endsAt,
        locationName: dto.locationName?.trim() || undefined,
        capacity: dto.capacity,
        status: dto.status,
        checkinOpensAt: dto.checkinOpensAt ? new Date(dto.checkinOpensAt) : undefined,
        checkinClosesAt: dto.checkinClosesAt ? new Date(dto.checkinClosesAt) : undefined,
      },
      include: {
        boards: true,
        _count: { select: { checkins: true } },
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.session.created', 'EventSession', session.id, {
      after: session,
      metadata: { eventId },
    });
    return session;
  }

  async updateSession(
    eventId: string,
    sessionId: string,
    dto: UpdateEventSessionDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const existing = await this.prisma.eventSession.findFirst({
      where: { id: sessionId, eventId },
    });
    if (!existing) throw new NotFoundException('Event session not found');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    this.validateSessionWindow(startsAt, endsAt, dto.checkinOpensAt, dto.checkinClosesAt);

    const updated = await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        locationName: dto.locationName?.trim(),
        capacity: dto.capacity,
        status: dto.status,
        checkinOpensAt: dto.checkinOpensAt ? new Date(dto.checkinOpensAt) : undefined,
        checkinClosesAt: dto.checkinClosesAt ? new Date(dto.checkinClosesAt) : undefined,
      },
      include: {
        boards: true,
        _count: { select: { checkins: true } },
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.session.updated', 'EventSession', updated.id, {
      before: existing,
      after: updated,
      metadata: { eventId },
    });
    return updated;
  }

  async listAttendeeFields(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.prisma.attendeeFieldDefinition.findMany({
      where: {
        workspaceId: event.workspaceId,
        OR: [{ eventId }, { eventId: null }],
      },
      orderBy: [{ eventId: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createAttendeeField(eventId: string, dto: CreateAttendeeFieldDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const key = this.normalizeFieldKey(dto.key);

    const field = await this.prisma.attendeeFieldDefinition.create({
      data: {
        workspaceId: event.workspaceId,
        eventId,
        key,
        label: dto.label.trim(),
        type: dto.type,
        required: dto.required ?? false,
        options: this.toJsonValue(dto.options),
        validation: this.toJsonValue(dto.validation),
        position: dto.position ?? 0,
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.attendee_field.created', 'AttendeeFieldDefinition', field.id, {
      after: field,
      metadata: { eventId },
    });
    return field;
  }

  async updateAttendeeField(
    eventId: string,
    fieldId: string,
    dto: UpdateAttendeeFieldDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const existing = await this.prisma.attendeeFieldDefinition.findFirst({
      where: { id: fieldId, eventId, workspaceId: event.workspaceId },
    });
    if (!existing) throw new NotFoundException('Attendee field not found');

    const updated = await this.prisma.attendeeFieldDefinition.update({
      where: { id: fieldId },
      data: {
        label: dto.label?.trim(),
        type: dto.type,
        required: dto.required,
        options: dto.options === undefined ? undefined : this.toJsonValue(dto.options),
        validation: dto.validation === undefined ? undefined : this.toJsonValue(dto.validation),
        position: dto.position,
        isArchived: dto.isArchived,
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.attendee_field.updated', 'AttendeeFieldDefinition', updated.id, {
      before: existing,
      after: updated,
      metadata: { eventId },
    });
    return updated;
  }

  async listConsentPolicies(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.prisma.consentPolicy.findMany({
      where: {
        workspaceId: event.workspaceId,
        OR: [{ eventId }, { eventId: null }],
      },
      orderBy: [{ eventId: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createConsentPolicy(eventId: string, dto: CreateConsentPolicyDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const policy = await this.prisma.consentPolicy.create({
      data: {
        workspaceId: event.workspaceId,
        eventId,
        title: dto.title.trim(),
        body: dto.body.trim(),
        required: dto.required ?? true,
        active: dto.active ?? true,
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.consent_policy.created', 'ConsentPolicy', policy.id, {
      after: policy,
      metadata: { eventId },
    });
    return policy;
  }

  async updateConsentPolicy(
    eventId: string,
    policyId: string,
    dto: UpdateConsentPolicyDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const existing = await this.prisma.consentPolicy.findFirst({
      where: { id: policyId, eventId, workspaceId: event.workspaceId },
    });
    if (!existing) throw new NotFoundException('Consent policy not found');

    const title = dto.title?.trim();
    const body = dto.body?.trim();
    const contentChanged =
      (title !== undefined && title !== existing.title) ||
      (body !== undefined && body !== existing.body);

    const updated = await this.prisma.consentPolicy.update({
      where: { id: policyId },
      data: {
        title,
        body,
        required: dto.required,
        active: dto.active,
        version: contentChanged ? { increment: 1 } : undefined,
      },
    });

    await this.writeAudit(event.workspaceId, userId, 'event.consent_policy.updated', 'ConsentPolicy', updated.id, {
      before: existing,
      after: updated,
      metadata: { eventId, contentChanged },
    });
    return updated;
  }

  async findEventBoards(eventId: string, userId: string) {
    await this.requireEventAccess(eventId, userId);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    return this.prisma.board.findMany({
      where: { eventId },
      include: {
        _count: { select: { checkins: true } },
      },
    });
  }

  async assign(eventId: string, dto: AssignEventMemberDto, assignedById: string) {
    const event = await this.requireEventManagerOrOwner(eventId, assignedById);
    const assignerIsAdmin = await this.isWorkspaceAdmin(event.workspaceId, assignedById);
    if (dto.role === EVENT_ASSIGNMENT_ROLE.MANAGER && !assignerIsAdmin) {
      throw new ForbiddenException('Only workspace admins can assign event managers');
    }

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: event.workspaceId, userId: dto.userId } },
    });
    if (!targetMember) {
      throw new BadRequestException('Assigned user must be a workspace member');
    }

    return this.prisma.eventAssignment.upsert({
      where: { eventId_userId: { eventId, userId: dto.userId } },
      update: { role: dto.role, assignedById },
      create: { eventId, userId: dto.userId, role: dto.role, assignedById },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async removeAssignment(eventId: string, userId: string, removedById: string) {
    await this.requireEventManagerOrOwner(eventId, removedById);
    await this.prisma.eventAssignment.delete({
      where: { eventId_userId: { eventId, userId } },
    });
    return { success: true };
  }

  async join(dto: JoinEventDto, userId: string) {
    const [event, user] = await Promise.all([
      this.prisma.event.findUnique({
        where: { joinCode: dto.joinCode.trim().toUpperCase() },
        select: {
          id: true,
          registrationEnabled: true,
          allowedDomains: true,
          allowedEmails: true,
          blockedEmails: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ]);
    if (!event) throw new NotFoundException('Event not found');
    if (!user) throw new NotFoundException('User not found');
    if (!event.registrationEnabled) throw new ForbiddenException('Event registration is closed');
    assertEmailEligible(
      user.email,
      event,
      'Your account is not eligible to join this event',
    );

    await this.prisma.eventRegistration.upsert({
      where: { one_registration_per_event: { eventId: event.id, userId } },
      update: {},
      create: { eventId: event.id, userId },
    });

    return this.findOne(event.id, userId);
  }

  async getMeEvents(userId: string, view?: 'attending' | 'managing') {
    const events = await this.prisma.event.findMany({
      where: this.meEventWhere(userId, view),
      orderBy: { date: 'desc' },
      include: this.eventInclude(userId),
    });
    return { data: events.map((event) => this.withResolvedStatus(event)) };
  }

  async canScanEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { workspaceId: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (await this.isWorkspaceAdmin(event.workspaceId, userId)) return true;
    const assignment = await this.prisma.eventAssignment.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!assignment) throw new ForbiddenException('Scanner permission required');
    return true;
  }

  async canScanBoard(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { eventId: true },
    });
    if (!board) throw new NotFoundException('Board not found');
    await this.canScanEvent(board.eventId, userId);
    return board.eventId;
  }

  async canGenerateQr(eventId: string, userId: string) {
    await this.requireCheckinMode(eventId, CHECKIN_MODE.ATTENDEE_CREDENTIAL);
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { one_registration_per_event: { eventId, userId } },
    });
    if (registration) {
      await this.assertUserEligibleForEvent(
        eventId,
        userId,
        'Your account is not eligible for this event',
      );
      return true;
    }
    await this.requireEventAccess(eventId, userId);
    return true;
  }

  async requireCheckinMode(eventId: string, mode: CHECKIN_MODE) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { checkinModes: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (!event.checkinModes.includes(mode)) {
      throw new ForbiddenException(`This event does not allow ${mode} check-in`);
    }
  }

  async getEventQrBehavior(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { eventQrBehavior: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event.eventQrBehavior;
  }

  private async requireEventAccess(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        workspaceId: true,
        attendancePolicy: true,
        requiredBoardCount: true,
        checkinModes: true,
        eventQrBehavior: true,
        credentialGraceSeconds: true,
        geofenceRadius: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const [member, assignment, registration] = await Promise.all([
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: event.workspaceId, userId } },
      }),
      this.prisma.eventAssignment.findUnique({
        where: { eventId_userId: { eventId, userId } },
      }),
      this.prisma.eventRegistration.findUnique({
        where: { one_registration_per_event: { eventId, userId } },
      }),
    ]);

    if (!member && !assignment && !registration) {
      throw new ForbiddenException('Event access denied');
    }
    return event;
  }

  private async requireEventManagerOrOwner(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        workspaceId: true,
        attendancePolicy: true,
        requiredBoardCount: true,
        checkinModes: true,
        eventQrBehavior: true,
        credentialGraceSeconds: true,
        geofenceRadius: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (await this.isWorkspaceAdmin(event.workspaceId, userId)) return event;

    const assignment = await this.prisma.eventAssignment.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (assignment?.role !== EVENT_ASSIGNMENT_ROLE.MANAGER) {
      throw new ForbiddenException('Event manager permission required');
    }
    return event;
  }

  private async requireWorkspaceMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Workspace access denied');
    return member;
  }

  private async requireWorkspaceOwner(workspaceId: string, userId: string) {
    const member = await this.requireWorkspaceMember(workspaceId, userId);
    if (member.role !== WORKSPACE_MEMBER_ROLE.OWNER) {
      throw new ForbiddenException('Workspace owner permission required');
    }
    return member;
  }

  private async isWorkspaceOwner(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    return member?.role === WORKSPACE_MEMBER_ROLE.OWNER;
  }

  private async isWorkspaceAdmin(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    return member?.role === WORKSPACE_MEMBER_ROLE.OWNER || member?.role === WORKSPACE_MEMBER_ROLE.ADMIN;
  }

  private visibleEventWhere(userId: string) {
    return {
      OR: [
        { workspace: { members: { some: { userId } } } },
        { assignments: { some: { userId } } },
        { registrations: { some: { userId } } },
      ],
    };
  }

  private meEventWhere(userId: string, view?: 'attending' | 'managing') {
    if (view === 'attending') {
      return {
        registrations: { some: { userId } },
        assignments: { none: { userId } },
        workspace: { members: { none: { userId } } },
      };
    }

    if (view === 'managing') {
      return {
        OR: [
          { workspace: { members: { some: { userId } } } },
          { assignments: { some: { userId } } },
        ],
      };
    }

    return this.visibleEventWhere(userId);
  }

  private eventInclude(userId: string) {
    return {
      boards: true,
      workspace: { select: { id: true, name: true } },
      // checkinModes and eventQrBehavior are scalar fields — Prisma returns them
      // automatically; they must NOT appear in include (relations only).
      createdBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      registrations: {
        where: { userId },
        select: { id: true, registeredAt: true },
      },
      _count: { select: { checkins: true, registrations: true } },
    } as const;
  }

  private resolveEventStatus(startTime: Date, endTime: Date, now = new Date()): EVENT_STATUS {
    if (now < startTime) return EVENT_STATUS.PUBLISHED;
    if (now > endTime) return EVENT_STATUS.COMPLETED;
    return EVENT_STATUS.ONGOING;
  }

  private withResolvedStatus<T extends { status: EVENT_STATUS; startTime: Date; endTime: Date }>(
    event: T,
  ): T {
    if (event.status === EVENT_STATUS.CANCELLED) return event;

    return {
      ...event,
      status: this.resolveEventStatus(event.startTime, event.endTime),
    };
  }

  private async generateJoinCode() {
    for (let i = 0; i < 5; i++) {
      const joinCode = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.prisma.event.findUnique({ where: { joinCode } });
      if (!exists) return joinCode;
    }
    throw new BadRequestException('Could not generate event join code');
  }

  private validateAttendanceConfig(
    policy: ATTENDANCE_POLICY | undefined,
    requiredBoardCount: number | undefined | null,
    boardCount: number,
  ) {
    const resolvedPolicy = policy ?? ATTENDANCE_POLICY.SINGLE_IN;
    if (resolvedPolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS) {
      if (!requiredBoardCount || requiredBoardCount < 1) {
        throw new BadRequestException('requiredBoardCount is required for board requirement events');
      }
      if (requiredBoardCount > boardCount) {
        throw new BadRequestException('requiredBoardCount cannot exceed the number of boards');
      }
    }
  }

  private validateSessionWindow(
    startsAt: Date,
    endsAt: Date,
    checkinOpensAt?: string,
    checkinClosesAt?: string,
  ) {
    if (startsAt >= endsAt) {
      throw new BadRequestException('Session start time must be before end time');
    }
    const opensAt = checkinOpensAt ? new Date(checkinOpensAt) : undefined;
    const closesAt = checkinClosesAt ? new Date(checkinClosesAt) : undefined;
    if (opensAt && closesAt && opensAt >= closesAt) {
      throw new BadRequestException('Check-in open time must be before close time');
    }
  }

  private resolveCheckinModes(modes: CHECKIN_MODE[] | undefined) {
    const resolved = modes?.length
      ? [...new Set(modes)]
      : [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR];
    if (resolved.length < 1) {
      throw new BadRequestException('At least one check-in mode is required');
    }
    return resolved;
  }

  private normalizeFieldKey(input: string) {
    const key = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!key) {
      throw new BadRequestException('Field key is required');
    }
    if (key.length > 64) {
      throw new BadRequestException('Field key must be 64 characters or fewer');
    }
    return key;
  }

  async assertUserEligibleForEvent(eventId: string, userId: string, message?: string) {
    const [event, user] = await Promise.all([
      this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          allowedDomains: true,
          allowedEmails: true,
          blockedEmails: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ]);

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    assertEmailEligible(
      user.email,
      event,
      message ?? 'Your account is not eligible for this event',
    );
  }

  private async writeAudit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    payload: {
      before?: unknown;
      after?: unknown;
      metadata?: unknown;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action,
        entityType,
        entityId,
        before: this.toJsonValue(payload.before),
        after: this.toJsonValue(payload.after),
        metadata: this.toJsonValue(payload.metadata),
      },
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

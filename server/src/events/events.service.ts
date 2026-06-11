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
  WORKSPACE_MEMBER_ROLE,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AssignEventMemberDto, JoinEventDto, UpdateEventDto } from './dto/event-access.dto';
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
      select: { id: true, workspaceId: true, attendancePolicy: true, requiredBoardCount: true },
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
      select: { id: true, workspaceId: true, attendancePolicy: true, requiredBoardCount: true },
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

  private resolveCheckinModes(modes: CHECKIN_MODE[] | undefined) {
    const resolved = modes?.length
      ? [...new Set(modes)]
      : [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR];
    if (resolved.length < 1) {
      throw new BadRequestException('At least one check-in mode is required');
    }
    return resolved;
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
}

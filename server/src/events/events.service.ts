import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { and, desc, asc, eq, sql, or, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import { DatabaseService } from "../database/database.service";
import {
  ATTENDANCE_POLICY_VALUES,
  BOARD_STATUS_VALUES,
  CHECKIN_MODE_VALUES,
  EVENT_ASSIGNMENT_ROLE_VALUES,
  EVENT_QR_BEHAVIOR_VALUES,
  EVENT_STATUS_VALUES,
  EVENT_VISIBILITY_VALUES,
  SESSION_STATUS_VALUES,
  WORKSPACE_MEMBER_ROLE_VALUES,
  attendeeFieldDefinitions,
  auditLogs,
  boards,
  checkinRecords,
  consentPolicies,
  eventAssignments,
  eventRegistrations,
  events,
  eventSessions,
  eventSettings,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from "../database/schema";
import { CreateEventDto } from "./dto/create-event.dto";
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
} from "./dto/event-access.dto";
import { assertEmailEligible, sanitizeDomainList, sanitizeEmailList } from "./event-eligibility";
import { WorkspacesService } from "../workspaces/workspaces.service";

type AttendancePolicy = (typeof ATTENDANCE_POLICY_VALUES)[number];
type BoardStatus = (typeof BOARD_STATUS_VALUES)[number];
type CheckinMode = (typeof CHECKIN_MODE_VALUES)[number];
type EventAssignmentRole = (typeof EVENT_ASSIGNMENT_ROLE_VALUES)[number];
type EventQrBehavior = (typeof EVENT_QR_BEHAVIOR_VALUES)[number];
type EventStatus = (typeof EVENT_STATUS_VALUES)[number];
type SessionStatus = (typeof SESSION_STATUS_VALUES)[number];
type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLE_VALUES)[number];
type EventVisibility = (typeof EVENT_VISIBILITY_VALUES)[number];

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async create(dto: CreateEventDto, createdById: string, workspaceId: string) {
    this.logger.log(`Creating event "${dto.title}" by user ${createdById}`);
    await this.workspacesService.canCreateEvent(workspaceId, createdById);
    this.validateAttendanceConfig(
      dto.attendancePolicy as AttendancePolicy | undefined,
      dto.requiredBoardCount,
      dto.boards.length,
    );

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const settings = await this.upsertWorkspaceSettings(workspaceId);

    const [event] = await this.db.db
      .insert(events)
      .values({
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        date: new Date(dto.date),
        startTime,
        endTime,
        startsAt: startTime,
        endsAt: endTime,
        location: dto.location.trim(),
        locationName: dto.location.trim(),
        status: this.resolveEventStatus(startTime, endTime),
        visibility: settings.defaultEventVisibility as EventVisibility,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        geofenceRadius: dto.geofenceRadius ?? 100,
        registrationEnabled: dto.registrationEnabled ?? true,
        attendancePolicy: dto.attendancePolicy ?? "SINGLE_IN",
        requiredBoardCount:
          dto.attendancePolicy === "BOARD_REQUIREMENTS" ? dto.requiredBoardCount : null,
        allowedDomains: sanitizeDomainList(dto.allowedDomains),
        allowedEmails: sanitizeEmailList(dto.allowedEmails),
        blockedEmails: sanitizeEmailList(dto.blockedEmails),
        checkinModes: this.resolveCheckinModes(
          dto.checkinModes as CheckinMode[] | undefined,
        ),
        eventQrBehavior: dto.eventQrBehavior ?? "JOIN_ONLY",
        credentialGraceSeconds: dto.credentialGraceSeconds ?? 120,
        customSessionsEnabled: dto.customSessionsEnabled ?? false,
        createdById,
        workspaceId,
        joinCode: await this.generateJoinCode(),
      })
      .returning();

    await this.db.db.insert(eventSettings).values({
      eventId: event.id,
      attendancePolicy: dto.attendancePolicy ?? "SINGLE_IN",
      requiredBoardCount:
        dto.attendancePolicy === "BOARD_REQUIREMENTS" ? dto.requiredBoardCount : null,
      checkinModes: this.resolveCheckinModes(dto.checkinModes as CheckinMode[] | undefined),
      eventQrBehavior: dto.eventQrBehavior ?? "JOIN_ONLY",
      credentialGraceSeconds: dto.credentialGraceSeconds ?? settings.defaultOfflineGraceSeconds,
      qrTtlSeconds: settings.defaultQrTtlSeconds,
      offlineSyncEnabled: true,
      geofenceEnabled: dto.latitude != null && dto.longitude != null,
      geofenceRadiusMeters: dto.geofenceRadius ?? null,
    });

    if (dto.boards.length > 0) {
      await this.db.db.insert(boards).values(
        dto.boards.map((board) => ({
          eventId: event.id,
          name: board.name,
        })),
      );
    }

    await this.db.db.insert(eventSessions).values({
      eventId: event.id,
      title: "Full event",
      startsAt: startTime,
      endsAt: endTime,
      locationName: dto.location.trim(),
      capacity: null,
      status: "SCHEDULED",
      isDefault: true,
    });

    return this.fetchEventWithRelations(event.id, createdById);
  }

  async findAllForUser(userId: string, pageParam?: any, limitParam?: any) {
    let page = Number(pageParam);
    let limit = Number(limitParam);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const where = this.visibleEventWhere(userId);

    const rows = await this.db.db
      .select({
        event: events,
        boards: { id: boards.id, name: boards.name, status: boards.status, checkinCount: boards.checkinCount },
        createdBy: { id: users.id, name: users.name, email: users.email },
        workspace: { id: sql<string>`workspace.id`, name: sql<string>`workspace.name` },
        checkinCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_records WHERE checkin_records.event_id = ${events.id})`,
        registrationCount: sql<number>`(SELECT COUNT(*)::int FROM event_registrations WHERE event_registrations.event_id = ${events.id})`,
      })
      .from(events)
      .leftJoin(users, eq(users.id, events.createdById))
      .leftJoin(sql`workspaces workspace`, sql`workspace.id = ${events.workspaceId}`)
      .leftJoin(boards, eq(boards.eventId, events.id))
      .where(where)
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(skip);

    const [total] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(where);

    const byId = new Map<string, any>();
    for (const r of rows) {
      const existing = byId.get(r.event.id);
      if (existing) {
        if (r.boards?.id) existing.boards.push(r.boards);
      } else {
        byId.set(r.event.id, {
          ...r.event,
          boards: r.boards?.id ? [r.boards] : [],
          createdBy: r.createdBy?.id ? r.createdBy : undefined,
          workspace: r.workspace?.id ? r.workspace : undefined,
          _count: { checkins: r.checkinCount ?? 0, registrations: r.registrationCount ?? 0 },
        });
      }
    }

    return {
      data: Array.from(byId.values()).map((e) => this.withResolvedStatus(e)),
      meta: {
        total: total?.n ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.n ?? 0) / limit),
      },
    };
  }

  async findWorkspaceEvents(
    workspaceId: string,
    userId: string,
    pageParam?: any,
    limitParam?: any,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId);
    let page = Number(pageParam);
    let limit = Number(limitParam);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;
    const list = await this.db.db
      .select()
      .from(events)
      .where(eq(events.workspaceId, workspaceId))
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(skip);

    const [total] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.workspaceId, workspaceId));

    const enriched = await this.batchFetchEventsRelations(list, userId);

    return {
      data: enriched.map((e) => this.withResolvedStatusOrNull(e)),
      meta: {
        total: total?.n ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.n ?? 0) / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    await this.requireEventAccess(id, userId);
    const event = await this.fetchEventWithRelations(id, userId);
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return this.withResolvedStatus(event);
  }

  async update(eventId: string, dto: UpdateEventDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const eventDate = dto.date ? new Date(dto.date) : event.date;
    const startTime = this.resolveEventDateTime(dto.startTime, event.startTime, eventDate);
    const endTime = this.resolveEventDateTime(dto.endTime, event.endTime, eventDate);
    if (startTime >= endTime) {
      throw new BadRequestException("Event start time must be before end time");
    }
    if (dto.attendancePolicy || dto.requiredBoardCount !== undefined) {
      const [boardCount] = await this.db.db
        .select({ n: sql<number>`count(*)::int` })
        .from(boards)
        .where(eq(boards.eventId, eventId));
      this.validateAttendanceConfig(
        dto.attendancePolicy as AttendancePolicy | undefined,
        dto.requiredBoardCount,
        boardCount?.n ?? 0,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData["title"] = dto.title.trim();
    if (dto.description !== undefined) updateData["description"] = dto.description.trim();
    if (dto.date !== undefined) updateData["date"] = eventDate;
    if (dto.startTime || dto.date) updateData["startTime"] = startTime;
    if (dto.endTime || dto.date) updateData["endTime"] = endTime;
    if (dto.startTime || dto.date) updateData["startsAt"] = startTime;
    if (dto.endTime || dto.date) updateData["endsAt"] = endTime;
    if (dto.location !== undefined) {
      updateData["location"] = dto.location.trim();
      updateData["locationName"] = dto.location.trim();
    }
    if (dto.registrationEnabled !== undefined) {
      updateData["registrationEnabled"] = dto.registrationEnabled;
    }
    if (dto.status !== undefined) updateData["status"] = dto.status;
    if (dto.attendancePolicy !== undefined) {
      updateData["attendancePolicy"] = dto.attendancePolicy;
      updateData["requiredBoardCount"] =
        dto.attendancePolicy === "BOARD_REQUIREMENTS" ? dto.requiredBoardCount : null;
    }
    if (dto.allowedDomains !== undefined) {
      updateData["allowedDomains"] = sanitizeDomainList(dto.allowedDomains);
    }
    if (dto.allowedEmails !== undefined) {
      updateData["allowedEmails"] = sanitizeEmailList(dto.allowedEmails);
    }
    if (dto.blockedEmails !== undefined) {
      updateData["blockedEmails"] = sanitizeEmailList(dto.blockedEmails);
    }
    if (dto.checkinModes !== undefined) {
      updateData["checkinModes"] = this.resolveCheckinModes(
        dto.checkinModes as CheckinMode[] | undefined,
      );
    }
    if (dto.eventQrBehavior !== undefined) {
      updateData["eventQrBehavior"] = dto.eventQrBehavior;
    }
    if (dto.credentialGraceSeconds !== undefined) {
      updateData["credentialGraceSeconds"] = dto.credentialGraceSeconds;
    }
    if (dto.customSessionsEnabled !== undefined) {
      updateData["customSessionsEnabled"] = dto.customSessionsEnabled;
    }

    const [updatedEvent] = await this.db.db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();

    if (dto.date || dto.startTime || dto.endTime || dto.location) {
      await this.db.db
        .update(eventSessions)
        .set({
          startsAt: updatedEvent.startTime,
          endsAt: updatedEvent.endTime,
          locationName: updatedEvent.locationName ?? updatedEvent.location,
        })
        .where(and(eq(eventSessions.eventId, eventId), eq(eventSessions.isDefault, true)));
    }

    const enriched = await this.fetchEventWithRelations(eventId, userId);
    return this.withResolvedStatusOrNull(enriched);
  }

  async getSettings(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.upsertEventSettings(eventId, {
      attendancePolicy: event.attendancePolicy,
      requiredBoardCount: event.requiredBoardCount,
    });
  }

  async updateSettings(eventId: string, dto: UpdateEventSettingsDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const [boardCount] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(boards)
      .where(eq(boards.eventId, eventId));
    this.validateAttendanceConfig(
      dto.attendancePolicy as AttendancePolicy | undefined,
      dto.requiredBoardCount,
      boardCount?.n ?? 0,
    );

    const existing = await this.upsertEventSettings(eventId);
    const settingsData: Record<string, unknown> = {};
    if (dto.attendancePolicy !== undefined) {
      settingsData["attendancePolicy"] = dto.attendancePolicy;
      settingsData["requiredBoardCount"] =
        dto.attendancePolicy === "BOARD_REQUIREMENTS" ? dto.requiredBoardCount : null;
    } else if (dto.requiredBoardCount !== undefined) {
      settingsData["requiredBoardCount"] = dto.requiredBoardCount;
    }
    if (dto.checkinModes !== undefined) {
      settingsData["checkinModes"] = this.resolveCheckinModes(
        dto.checkinModes as CheckinMode[] | undefined,
      );
    }
    if (dto.eventQrBehavior !== undefined) settingsData["eventQrBehavior"] = dto.eventQrBehavior;
    if (dto.qrTtlSeconds !== undefined) settingsData["qrTtlSeconds"] = dto.qrTtlSeconds;
    if (dto.credentialGraceSeconds !== undefined) {
      settingsData["credentialGraceSeconds"] = dto.credentialGraceSeconds;
    }
    if (dto.offlineSyncEnabled !== undefined) {
      settingsData["offlineSyncEnabled"] = dto.offlineSyncEnabled;
    }
    if (dto.geofenceEnabled !== undefined) settingsData["geofenceEnabled"] = dto.geofenceEnabled;
    if (dto.geofenceRadiusMeters !== undefined) {
      settingsData["geofenceRadiusMeters"] = dto.geofenceRadiusMeters;
    }
    if (dto.manualCheckinEnabled !== undefined) {
      settingsData["manualCheckinEnabled"] = dto.manualCheckinEnabled;
    }
    if (dto.manualCorrectionEnabled !== undefined) {
      settingsData["manualCorrectionEnabled"] = dto.manualCorrectionEnabled;
    }
    if (dto.requireCorrectionReason !== undefined) {
      settingsData["requireCorrectionReason"] = dto.requireCorrectionReason;
    }
    if (dto.certificateEnabled !== undefined) {
      settingsData["certificateEnabled"] = dto.certificateEnabled;
    }
    if (dto.attendanceProofEnabled !== undefined) {
      settingsData["attendanceProofEnabled"] = dto.attendanceProofEnabled;
    }

    const [settings] = await this.db.db
      .update(eventSettings)
      .set(settingsData)
      .where(eq(eventSettings.eventId, eventId))
      .returning();

    await this.db.db
      .update(events)
      .set({
        attendancePolicy: settings.attendancePolicy,
        requiredBoardCount: settings.requiredBoardCount,
        checkinModes: settings.checkinModes,
        eventQrBehavior: settings.eventQrBehavior,
        credentialGraceSeconds: settings.credentialGraceSeconds,
        geofenceRadius: settings.geofenceRadiusMeters,
      })
      .where(eq(events.id, eventId));

    await this.writeAudit(event.workspaceId, userId, "event.settings.updated", "EventSettings", settings.id, {
      after: settings,
      metadata: { eventId },
    });
    return settings;
  }

  async listSessions(eventId: string, userId: string) {
    await this.requireEventAccess(eventId, userId);
    return this.db.db
      .select({
        session: eventSessions,
        boards: { id: boards.id, name: boards.name, status: boards.status, checkinCount: boards.checkinCount },
        checkinCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_records WHERE checkin_records.session_id = ${eventSessions.id})`,
      })
      .from(eventSessions)
      .leftJoin(boards, eq(boards.sessionId, eventSessions.id))
      .where(eq(eventSessions.eventId, eventId))
      .orderBy(desc(eventSessions.isDefault), asc(eventSessions.startsAt));
  }

  async createSession(eventId: string, dto: CreateEventSessionDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateSessionWindow(startsAt, endsAt, dto.checkinOpensAt, dto.checkinClosesAt);
    this.validateSessionWithinEvent(startsAt, endsAt, event.startTime, event.endTime);
    await this.ensureNoOverlappingSession(eventId, startsAt, endsAt);

    const [session] = await this.db.db
      .insert(eventSessions)
      .values({
        eventId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        startsAt,
        endsAt,
        locationName: dto.locationName?.trim() || null,
        capacity: dto.capacity ?? null,
        status: dto.status ?? "SCHEDULED",
        isDefault: false,
        checkinOpensAt: dto.checkinOpensAt ? new Date(dto.checkinOpensAt) : null,
        checkinClosesAt: dto.checkinClosesAt ? new Date(dto.checkinClosesAt) : null,
      })
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.session.created",
      "EventSession",
      session.id,
      { after: session, metadata: { eventId } },
    );

    await this.db.db
      .update(events)
      .set({ customSessionsEnabled: true })
      .where(eq(events.id, eventId));

    return session;
  }

  async updateSession(
    eventId: string,
    sessionId: string,
    dto: UpdateEventSessionDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const [existing] = await this.db.db
      .select()
      .from(eventSessions)
      .where(and(eq(eventSessions.id, sessionId), eq(eventSessions.eventId, eventId)))
      .limit(1);
    if (!existing) throw new NotFoundException("Event session not found");
    if (existing.isDefault) {
      throw new BadRequestException("Default event session is managed by the event schedule");
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    this.validateSessionWindow(startsAt, endsAt, dto.checkinOpensAt, dto.checkinClosesAt);
    this.validateSessionWithinEvent(startsAt, endsAt, event.startTime, event.endTime);
    await this.ensureNoOverlappingSession(eventId, startsAt, endsAt, sessionId);

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData["title"] = dto.title.trim();
    if (dto.description !== undefined) updateData["description"] = dto.description.trim();
    if (dto.startsAt !== undefined) updateData["startsAt"] = startsAt;
    if (dto.endsAt !== undefined) updateData["endsAt"] = endsAt;
    if (dto.locationName !== undefined) updateData["locationName"] = dto.locationName.trim();
    if (dto.capacity !== undefined) updateData["capacity"] = dto.capacity;
    if (dto.status !== undefined) updateData["status"] = dto.status;
    if (dto.checkinOpensAt !== undefined) {
      updateData["checkinOpensAt"] = new Date(dto.checkinOpensAt);
    }
    if (dto.checkinClosesAt !== undefined) {
      updateData["checkinClosesAt"] = new Date(dto.checkinClosesAt);
    }

    const [updated] = await this.db.db
      .update(eventSessions)
      .set(updateData)
      .where(eq(eventSessions.id, sessionId))
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.session.updated",
      "EventSession",
      updated.id,
      { before: existing, after: updated, metadata: { eventId } },
    );
    return updated;
  }

  async listAttendeeFields(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.db.db
      .select()
      .from(attendeeFieldDefinitions)
      .where(
        and(
          eq(attendeeFieldDefinitions.workspaceId, event.workspaceId),
          or(
            eq(attendeeFieldDefinitions.eventId, eventId),
            sql`${attendeeFieldDefinitions.eventId} IS NULL`,
          ),
        ),
      )
      .orderBy(
        desc(attendeeFieldDefinitions.eventId),
        asc(attendeeFieldDefinitions.position),
        asc(attendeeFieldDefinitions.createdAt),
      );
  }

  async createAttendeeField(eventId: string, dto: CreateAttendeeFieldDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const key = this.normalizeFieldKey(dto.key);

    const [field] = await this.db.db
      .insert(attendeeFieldDefinitions)
      .values({
        workspaceId: event.workspaceId,
        eventId,
        key,
        label: dto.label.trim(),
        type: dto.type,
        required: dto.required ?? false,
        options: this.toJsonValue(dto.options),
        validation: this.toJsonValue(dto.validation),
        position: dto.position ?? 0,
      })
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.attendee_field.created",
      "AttendeeFieldDefinition",
      field.id,
      { after: field, metadata: { eventId } },
    );
    return field;
  }

  async updateAttendeeField(
    eventId: string,
    fieldId: string,
    dto: UpdateAttendeeFieldDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const [existing] = await this.db.db
      .select()
      .from(attendeeFieldDefinitions)
      .where(
        and(
          eq(attendeeFieldDefinitions.id, fieldId),
          eq(attendeeFieldDefinitions.eventId, eventId),
          eq(attendeeFieldDefinitions.workspaceId, event.workspaceId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Attendee field not found");

    const updateData: Record<string, unknown> = {};
    if (dto.label !== undefined) updateData["label"] = dto.label.trim();
    if (dto.type !== undefined) updateData["type"] = dto.type;
    if (dto.required !== undefined) updateData["required"] = dto.required;
    if (dto.options !== undefined) updateData["options"] = this.toJsonValue(dto.options);
    if (dto.validation !== undefined) updateData["validation"] = this.toJsonValue(dto.validation);
    if (dto.position !== undefined) updateData["position"] = dto.position;
    if (dto.isArchived !== undefined) updateData["isArchived"] = dto.isArchived;

    const [updated] = await this.db.db
      .update(attendeeFieldDefinitions)
      .set(updateData)
      .where(eq(attendeeFieldDefinitions.id, fieldId))
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.attendee_field.updated",
      "AttendeeFieldDefinition",
      updated.id,
      { before: existing, after: updated, metadata: { eventId } },
    );
    return updated;
  }

  async listConsentPolicies(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    return this.db.db
      .select()
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.workspaceId, event.workspaceId),
          or(
            eq(consentPolicies.eventId, eventId),
            sql`${consentPolicies.eventId} IS NULL`,
          ),
        ),
      )
      .orderBy(desc(consentPolicies.eventId), asc(consentPolicies.createdAt));
  }

  async createConsentPolicy(eventId: string, dto: CreateConsentPolicyDto, userId: string) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const [policy] = await this.db.db
      .insert(consentPolicies)
      .values({
        workspaceId: event.workspaceId,
        eventId,
        title: dto.title.trim(),
        body: dto.body.trim(),
        required: dto.required ?? true,
        active: dto.active ?? true,
      })
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.consent_policy.created",
      "ConsentPolicy",
      policy.id,
      { after: policy, metadata: { eventId } },
    );
    return policy;
  }

  async updateConsentPolicy(
    eventId: string,
    policyId: string,
    dto: UpdateConsentPolicyDto,
    userId: string,
  ) {
    const event = await this.requireEventManagerOrOwner(eventId, userId);
    const [existing] = await this.db.db
      .select()
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.id, policyId),
          eq(consentPolicies.eventId, eventId),
          eq(consentPolicies.workspaceId, event.workspaceId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Consent policy not found");

    const title = dto.title?.trim();
    const body = dto.body?.trim();
    const contentChanged =
      (title !== undefined && title !== existing.title) ||
      (body !== undefined && body !== existing.body);

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData["title"] = title;
    if (body !== undefined) updateData["body"] = body;
    if (dto.required !== undefined) updateData["required"] = dto.required;
    if (dto.active !== undefined) updateData["active"] = dto.active;
    if (contentChanged) {
      updateData["version"] = sql`${consentPolicies.version} + 1`;
    }

    const [updated] = await this.db.db
      .update(consentPolicies)
      .set(updateData)
      .where(eq(consentPolicies.id, policyId))
      .returning();

    await this.writeAudit(
      event.workspaceId,
      userId,
      "event.consent_policy.updated",
      "ConsentPolicy",
      updated.id,
      { before: existing, after: updated, metadata: { eventId, contentChanged } },
    );
    return updated;
  }

  async findEventBoards(eventId: string, userId: string) {
    await this.requireEventAccess(eventId, userId);
    const [event] = await this.db.db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    const rows = await this.db.db
      .select({
        board: boards,
        checkinCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_records WHERE checkin_records.board_id = ${boards.id})`,
      })
      .from(boards)
      .where(eq(boards.eventId, eventId))
      .orderBy(asc(boards.name));

    return rows.map((r) => ({
      id: r.board.id,
      name: r.board.name,
      status: this.mapDbStatusToApi(r.board.status as BoardStatus),
      checkinCount: r.checkinCount ?? 0,
    }));
  }

  async findRegistrations(eventId: string, userId: string) {
    await this.requireEventAccess(eventId, userId);
    const registrations = await this.db.db
      .select({
        registration: eventRegistrations,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(eventRegistrations)
      .innerJoin(users, eq(users.id, eventRegistrations.userId))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt));

    return registrations.map((reg) => ({
      id: reg.registration.id,
      userId: reg.registration.userId,
      user: reg.user,
      checkins: [],
      registeredAt: reg.registration.registeredAt,
    }));
  }

  async exportCsv(eventId: string, scope: "all" | "checked-in", userId: string): Promise<string> {
    await this.requireEventAccess(eventId, userId);

    const registrations = await this.db.db
      .select({
        registration: eventRegistrations,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(eventRegistrations)
      .innerJoin(users, eq(users.id, eventRegistrations.userId))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt));

    const checkins = await this.db.db
      .select({
        checkin: checkinRecords,
        boardName: boards.name,
        sessionTitle: eventSessions.title,
      })
      .from(checkinRecords)
      .leftJoin(boards, eq(boards.id, checkinRecords.boardId))
      .leftJoin(eventSessions, eq(eventSessions.id, checkinRecords.sessionId))
      .where(eq(checkinRecords.eventId, eventId))
      .orderBy(desc(checkinRecords.timestamp));

    const checkinMap = new Map<string, { boardName: string; sessionTitle: string; timestamp: Date }>();
    for (const c of checkins) {
      if (!checkinMap.has(c.checkin.userId)) {
        checkinMap.set(c.checkin.userId, {
          boardName: c.boardName ?? "",
          sessionTitle: c.sessionTitle ?? "",
          timestamp: c.checkin.timestamp,
        });
      }
    }

    const BOM = "\uFEFF";
    const headers = ["#", "Họ tên", "Email", "Trạng thái", "Board", "Phiên", "Thời gian check-in"];
    const rows = [headers.join(",")];

    const clean = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    let count = 0;
    registrations.forEach((reg) => {
      const user = reg.user;
      const checkinInfo = checkinMap.get(user.id);
      const isCheckedIn = Boolean(checkinInfo);

      if (scope === "checked-in" && !isCheckedIn) {
        return;
      }

      count++;
      const status = isCheckedIn ? "Đã check-in" : "Chưa check-in";
      const checkinTimeStr = checkinInfo?.timestamp ? checkinInfo.timestamp.toISOString() : "";

      const row = [
        count,
        clean(user.name),
        clean(user.email),
        clean(status),
        clean(checkinInfo?.boardName ?? ""),
        clean(checkinInfo?.sessionTitle ?? ""),
        clean(checkinTimeStr),
      ];
      rows.push(row.join(","));
    });

    return BOM + rows.join("\n");
  }

  async createBoard(eventId: string, name: string, userId: string) {
    await this.requireEventManagerOrOwner(eventId, userId);
    const [newBoard] = await this.db.db
      .insert(boards)
      .values({
        eventId,
        name: name.trim(),
        status: "ACTIVE",
      })
      .returning();
    return {
      id: newBoard.id,
      name: newBoard.name,
      status: this.mapDbStatusToApi(newBoard.status as BoardStatus),
      checkinCount: 0,
    };
  }

  async updateBoard(
    eventId: string,
    boardId: string,
    dto: { name?: string; status?: "ACTIVE" | "PAUSED" | "CLOSED" },
    userId: string,
  ) {
    await this.requireEventManagerOrOwner(eventId, userId);
    const [board] = await this.db.db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!board || board.eventId !== eventId) {
      throw new NotFoundException("Board not found");
    }

    const [checkinRow] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`checkin_records`)
      .where(sql`checkin_records.board_id = ${boardId}`);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData["name"] = dto.name.trim();
    if (dto.status !== undefined) updateData["status"] = this.mapApiStatusToDb(dto.status);

    const [updated] = await this.db.db
      .update(boards)
      .set(updateData)
      .where(eq(boards.id, boardId))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      status: this.mapDbStatusToApi(updated.status as BoardStatus),
      checkinCount: checkinRow?.n ?? 0,
    };
  }

  async deleteBoard(eventId: string, boardId: string, userId: string) {
    await this.requireEventManagerOrOwner(eventId, userId);
    const [board] = await this.db.db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!board || board.eventId !== eventId) {
      throw new NotFoundException("Board not found");
    }
    const [checkinRow] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`checkin_records`)
      .where(sql`checkin_records.board_id = ${boardId}`);
    if ((checkinRow?.n ?? 0) > 0) {
      throw new BadRequestException("Cannot delete board with check-in records");
    }
    await this.db.db.delete(boards).where(eq(boards.id, boardId));
    return { success: true };
  }

  private mapDbStatusToApi(status: BoardStatus): "ACTIVE" | "PAUSED" | "CLOSED" {
    if (status === "INACTIVE") return "PAUSED";
    return status as "ACTIVE" | "CLOSED";
  }

  private mapApiStatusToDb(status: "ACTIVE" | "PAUSED" | "CLOSED"): BoardStatus {
    if (status === "PAUSED") return "INACTIVE";
    return status as BoardStatus;
  }

  async assign(eventId: string, dto: AssignEventMemberDto, assignedById: string) {
    const event = await this.requireEventManagerOrOwner(eventId, assignedById);
    const assignerIsAdmin = await this.isWorkspaceAdmin(event.workspaceId, assignedById);
    if (dto.role === "MANAGER" && !assignerIsAdmin) {
      throw new ForbiddenException("Only workspace admins can assign event managers");
    }

    const [targetMember] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, dto.userId),
        ),
      )
      .limit(1);
    if (!targetMember) {
      throw new BadRequestException("Assigned user must be a workspace member");
    }

    const [assignment] = await this.db.db
      .insert(eventAssignments)
      .values({
        eventId,
        userId: dto.userId,
        role: dto.role as EventAssignmentRole,
        assignedById,
      })
      .onConflictDoUpdate({
        target: [eventAssignments.eventId, eventAssignments.userId],
        set: { role: dto.role as EventAssignmentRole, assignedById, updatedAt: new Date() },
      })
      .returning();

    return { ...assignment };
  }

  async removeAssignment(eventId: string, userId: string, removedById: string) {
    await this.requireEventManagerOrOwner(eventId, removedById);
    await this.db.db
      .delete(eventAssignments)
      .where(
        and(eq(eventAssignments.eventId, eventId), eq(eventAssignments.userId, userId)),
      );
    return { success: true };
  }

  async join(dto: JoinEventDto, userId: string) {
    const [event] = await this.db.db
      .select({
        id: events.id,
        registrationEnabled: events.registrationEnabled,
        allowedDomains: events.allowedDomains,
        allowedEmails: events.allowedEmails,
        blockedEmails: events.blockedEmails,
      })
      .from(events)
      .where(eq(events.joinCode, dto.joinCode.trim().toUpperCase()))
      .limit(1);
    if (!event) throw new NotFoundException("Event not found");
    const [user] = await this.db.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");
    if (!event.registrationEnabled) throw new ForbiddenException("Event registration is closed");
    assertEmailEligible(user.email, event, "Your account is not eligible to join this event");

    await this.db.db
      .insert(eventRegistrations)
      .values({ eventId: event.id, userId })
      .onConflictDoUpdate({
        target: [eventRegistrations.userId, eventRegistrations.eventId],
        set: { status: "APPROVED" },
      });

    return this.findOne(event.id, userId);
  }

  async getMeEvents(userId: string, view?: "attending" | "managing") {
    const where = this.meEventWhere(userId, view);
    const list = await this.db.db
      .select()
      .from(events)
      .where(where)
      .orderBy(desc(events.date));
    const enriched = await this.batchFetchEventsRelations(list, userId);
    return { data: enriched.map((e) => this.withResolvedStatusOrNull(e)) };
  }

  async canScanEvent(eventId: string, userId: string) {
    const [event] = await this.db.db
      .select({ workspaceId: events.workspaceId })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) throw new NotFoundException("Event not found");
    if (await this.isWorkspaceAdmin(event.workspaceId, userId)) return true;
    const [assignment] = await this.db.db
      .select()
      .from(eventAssignments)
      .where(
        and(eq(eventAssignments.eventId, eventId), eq(eventAssignments.userId, userId)),
      )
      .limit(1);
    if (!assignment) throw new ForbiddenException("Scanner permission required");
    return true;
  }

  async canScanBoard(boardId: string, userId: string) {
    const [board] = await this.db.db
      .select({ eventId: boards.eventId })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    if (!board) throw new NotFoundException("Board not found");
    await this.canScanEvent(board.eventId, userId);
    return board.eventId;
  }

  async canGenerateQr(eventId: string, userId: string) {
    await this.requireCheckinMode(eventId, "ATTENDEE_CREDENTIAL");
    const [registration] = await this.db.db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, userId),
        ),
      )
      .limit(1);
    if (registration) {
      await this.assertUserEligibleForEvent(
        eventId,
        userId,
        "Your account is not eligible for this event",
      );
      return true;
    }
    await this.requireEventAccess(eventId, userId);
    return true;
  }

  async requireCheckinMode(eventId: string, mode: CheckinMode) {
    const [event] = await this.db.db
      .select({ checkinModes: events.checkinModes })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    if (!event.checkinModes.includes(mode)) {
      throw new ForbiddenException(`This event does not allow ${mode} check-in`);
    }
  }

  async getEventQrBehavior(eventId: string) {
    const [event] = await this.db.db
      .select({ eventQrBehavior: events.eventQrBehavior })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    return event.eventQrBehavior;
  }

  private async requireEventAccess(eventId: string, userId: string) {
    const [event] = await this.db.db
      .select({
        id: events.id,
        workspaceId: events.workspaceId,
        attendancePolicy: events.attendancePolicy,
        requiredBoardCount: events.requiredBoardCount,
        checkinModes: events.checkinModes,
        eventQrBehavior: events.eventQrBehavior,
        credentialGraceSeconds: events.credentialGraceSeconds,
        geofenceRadius: events.geofenceRadius,
        customSessionsEnabled: events.customSessionsEnabled,
        registrationEnabled: events.registrationEnabled,
        allowedDomains: events.allowedDomains,
        allowedEmails: events.allowedEmails,
        blockedEmails: events.blockedEmails,
        date: events.date,
        startTime: events.startTime,
        endTime: events.endTime,
        location: events.location,
        locationName: events.locationName,
        status: events.status,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) throw new NotFoundException("Event not found");

    const [member] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, event.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    const [assignment] = await this.db.db
      .select()
      .from(eventAssignments)
      .where(
        and(eq(eventAssignments.eventId, eventId), eq(eventAssignments.userId, userId)),
      )
      .limit(1);
    const [registration] = await this.db.db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, userId),
        ),
      )
      .limit(1);

    if (!member && !assignment && !registration) {
      throw new ForbiddenException("Event access denied");
    }
    return event;
  }

  private async requireEventManagerOrOwner(eventId: string, userId: string) {
    const event = await this.requireEventAccess(eventId, userId);
    if (await this.isWorkspaceAdmin(event.workspaceId, userId)) return event;

    const [assignment] = await this.db.db
      .select()
      .from(eventAssignments)
      .where(
        and(eq(eventAssignments.eventId, eventId), eq(eventAssignments.userId, userId)),
      )
      .limit(1);
    if (assignment?.role !== "MANAGER") {
      throw new ForbiddenException("Event manager permission required");
    }
    return event;
  }

  private async requireWorkspaceMember(workspaceId: string, userId: string) {
    const [member] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Workspace access denied");
    return member;
  }


  private async isWorkspaceAdmin(workspaceId: string, userId: string) {
    const [member] = await this.db.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    return member?.role === "OWNER" || member?.role === "ADMIN";
  }

  private visibleEventWhere(userId: string) {
    return or(
      sql`EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = ${events.workspaceId} AND workspace_members.user_id = ${userId})`,
      sql`EXISTS (SELECT 1 FROM event_assignments WHERE event_assignments.event_id = ${events.id} AND event_assignments.user_id = ${userId})`,
      sql`EXISTS (SELECT 1 FROM event_registrations WHERE event_registrations.event_id = ${events.id} AND event_registrations.user_id = ${userId})`,
    );
  }

  private meEventWhere(userId: string, view?: "attending" | "managing") {
    if (view === "attending") {
      return and(
        sql`EXISTS (SELECT 1 FROM event_registrations WHERE event_registrations.event_id = ${events.id} AND event_registrations.user_id = ${userId})`,
        sql`NOT EXISTS (SELECT 1 FROM event_assignments WHERE event_assignments.event_id = ${events.id} AND event_assignments.user_id = ${userId})`,
        sql`NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = ${events.workspaceId} AND workspace_members.user_id = ${userId})`,
      );
    }

    if (view === "managing") {
      return or(
        sql`EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = ${events.workspaceId} AND workspace_members.user_id = ${userId})`,
        sql`EXISTS (SELECT 1 FROM event_assignments WHERE event_assignments.event_id = ${events.id} AND event_assignments.user_id = ${userId})`,
      );
    }

    return this.visibleEventWhere(userId);
  }

  private async batchFetchEventsRelations(
    eventsList: Array<typeof events.$inferSelect>,
    userId: string,
  ) {
    if (eventsList.length === 0) return [];
    const eventIds = eventsList.map((e) => e.id);
    const createdByIds = [...new Set(eventsList.map((e) => e.createdById).filter(Boolean))];
    const workspaceIds = [...new Set(eventsList.map((e) => e.workspaceId).filter(Boolean))];

    const [
      allBoards,
      allCreatedBy,
      checkinCountsRows,
      registrationCountsRows,
      allWorkspaces,
      allAssignments,
      allMyRegistrations,
    ] = await Promise.all([
      this.db.db.select().from(boards).where(inArray(boards.eventId, eventIds)),
      createdByIds.length > 0
        ? this.db.db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(inArray(users.id, createdByIds))
        : Promise.resolve([]),
      this.db.db
        .select({ eventId: checkinRecords.eventId, n: sql<number>`count(*)::int` })
        .from(checkinRecords)
        .where(inArray(checkinRecords.eventId, eventIds))
        .groupBy(checkinRecords.eventId),
      this.db.db
        .select({ eventId: eventRegistrations.eventId, n: sql<number>`count(*)::int` })
        .from(eventRegistrations)
        .where(inArray(eventRegistrations.eventId, eventIds))
        .groupBy(eventRegistrations.eventId),
      workspaceIds.length > 0
        ? this.db.db
            .select({ id: workspaces.id, name: workspaces.name })
            .from(workspaces)
            .where(inArray(workspaces.id, workspaceIds))
        : Promise.resolve([]),
      this.db.db
        .select({
          assignment: eventAssignments,
          user: { id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl },
        })
        .from(eventAssignments)
        .innerJoin(users, eq(users.id, eventAssignments.userId))
        .where(inArray(eventAssignments.eventId, eventIds)),
      this.db.db
        .select({
          id: eventRegistrations.id,
          eventId: eventRegistrations.eventId,
          registeredAt: eventRegistrations.registeredAt,
        })
        .from(eventRegistrations)
        .where(
          and(
            inArray(eventRegistrations.eventId, eventIds),
            eq(eventRegistrations.userId, userId),
          ),
        ),
    ]);

    const boardsByEvent = new Map<string, Array<typeof boards.$inferSelect>>();
    allBoards.forEach((b) => {
      const arr = boardsByEvent.get(b.eventId) ?? [];
      arr.push(b);
      boardsByEvent.set(b.eventId, arr);
    });

    const createdByMap = new Map(allCreatedBy.map((u) => [u.id, u]));
    const workspaceMap = new Map(allWorkspaces.map((w) => [w.id, w]));
    const checkinCountMap = new Map(checkinCountsRows.map((c) => [c.eventId, c.n]));
    const regCountMap = new Map(registrationCountsRows.map((r) => [r.eventId, r.n]));

    const assignmentsByEvent = new Map<string, Array<any>>();
    allAssignments.forEach((a) => {
      const arr = assignmentsByEvent.get(a.assignment.eventId) ?? [];
      arr.push({ ...a.assignment, user: a.user });
      assignmentsByEvent.set(a.assignment.eventId, arr);
    });

    const myRegByEvent = new Map<string, Array<any>>();
    allMyRegistrations.forEach((r) => {
      const arr = myRegByEvent.get(r.eventId) ?? [];
      arr.push({ id: r.id, registeredAt: r.registeredAt });
      myRegByEvent.set(r.eventId, arr);
    });

    return eventsList.map((event) => ({
      ...event,
      boards: boardsByEvent.get(event.id) ?? [],
      workspace: workspaceMap.get(event.workspaceId) ?? undefined,
      createdBy: createdByMap.get(event.createdById) ?? undefined,
      assignments: assignmentsByEvent.get(event.id) ?? [],
      registrations: myRegByEvent.get(event.id) ?? [],
      _count: {
        checkins: checkinCountMap.get(event.id) ?? 0,
        registrations: regCountMap.get(event.id) ?? 0,
      },
    }));
  }

  private async fetchEventWithRelations(eventId: string, userId: string) {
    const [event] = await this.db.db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) return null;

    const eventBoards = await this.db.db
      .select()
      .from(boards)
      .where(eq(boards.eventId, eventId));

    const [createdBy] = await this.db.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, event.createdById))
      .limit(1);

    const [checkinCount] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`checkin_records`)
      .where(sql`checkin_records.event_id = ${eventId}`);
    const [registrationCount] = await this.db.db
      .select({ n: sql<number>`count(*)::int` })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));

    const [workspace] = await this.db.db
      .select({ id: sql<string>`w.id`, name: sql<string>`w.name` })
      .from(sql`workspaces w`)
      .where(sql`w.id = ${event.workspaceId}`)
      .limit(1);

    const assignments = await this.db.db
      .select({
        assignment: eventAssignments,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(eventAssignments)
      .innerJoin(users, eq(users.id, eventAssignments.userId))
      .where(eq(eventAssignments.eventId, eventId));

    const myRegistrations = await this.db.db
      .select({ id: eventRegistrations.id, registeredAt: eventRegistrations.registeredAt })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, userId),
        ),
      );

    return {
      ...event,
      boards: eventBoards,
      workspace: workspace ?? undefined,
      createdBy: createdBy ?? undefined,
      assignments: assignments.map((a) => ({
        ...a.assignment,
        user: a.user,
      })),
      registrations: myRegistrations,
      _count: {
        checkins: checkinCount?.n ?? 0,
        registrations: registrationCount?.n ?? 0,
      },
    };
  }

  private async upsertWorkspaceSettings(workspaceId: string) {
    const [existing] = await this.db.db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .limit(1);
    if (existing) return existing;
    const [created] = await this.db.db
      .insert(workspaceSettings)
      .values({ workspaceId })
      .returning();
    return created;
  }

  private async upsertEventSettings(
    eventId: string,
    defaults?: { attendancePolicy?: AttendancePolicy; requiredBoardCount?: number | null },
  ) {
    const [existing] = await this.db.db
      .select()
      .from(eventSettings)
      .where(eq(eventSettings.eventId, eventId))
      .limit(1);
    if (existing) return existing;
    const [created] = await this.db.db
      .insert(eventSettings)
      .values({
        eventId,
        attendancePolicy: defaults?.attendancePolicy ?? "SINGLE_IN",
        requiredBoardCount: defaults?.requiredBoardCount ?? null,
      })
      .returning();
    return created;
  }

  private resolveEventStatus(startTime: Date, endTime: Date, now = new Date()): EventStatus {
    if (now < startTime) return "PUBLISHED";
    if (now > endTime) return "COMPLETED";
    return "ONGOING";
  }

  private withResolvedStatus<T extends { status: EventStatus; startTime: Date; endTime: Date }>(
    event: T,
  ): T {
    if (event.status === "CANCELLED") return event;
    return {
      ...event,
      status: this.resolveEventStatus(event.startTime, event.endTime),
    };
  }

  private withResolvedStatusOrNull<T extends { status: EventStatus; startTime: Date; endTime: Date }>(
    event: T | null,
  ): T | null {
    if (!event) return event;
    return this.withResolvedStatus(event);
  }

  private resolveEventDateTime(value: string | undefined, fallback: Date, eventDate: Date) {
    if (!value) {
      return this.copyTimeToDate(fallback, eventDate);
    }
    if (/^\d{2}:\d{2}$/.test(value)) {
      const [hours, minutes] = value.split(":").map(Number);
      const next = new Date(eventDate);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    return new Date(value);
  }

  private copyTimeToDate(source: Date, targetDate: Date) {
    const next = new Date(targetDate);
    next.setHours(
      source.getHours(),
      source.getMinutes(),
      source.getSeconds(),
      source.getMilliseconds(),
    );
    return next;
  }

  private async generateJoinCode() {
    for (let i = 0; i < 5; i++) {
      const joinCode = randomBytes(4).toString("hex").toUpperCase();
      const [exists] = await this.db.db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.joinCode, joinCode))
        .limit(1);
      if (!exists) return joinCode;
    }
    throw new BadRequestException("Could not generate event join code");
  }

  private validateAttendanceConfig(
    policy: AttendancePolicy | undefined,
    requiredBoardCount: number | undefined | null,
    boardCount: number,
  ) {
    const resolvedPolicy = policy ?? "SINGLE_IN";
    if (resolvedPolicy === "BOARD_REQUIREMENTS") {
      if (!requiredBoardCount || requiredBoardCount < 1) {
        throw new BadRequestException("requiredBoardCount is required for board requirement events");
      }
      if (requiredBoardCount > boardCount) {
        throw new BadRequestException("requiredBoardCount cannot exceed the number of boards");
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
      throw new BadRequestException("Session start time must be before end time");
    }
    const opensAt = checkinOpensAt ? new Date(checkinOpensAt) : undefined;
    const closesAt = checkinClosesAt ? new Date(checkinClosesAt) : undefined;
    if (opensAt && closesAt && opensAt >= closesAt) {
      throw new BadRequestException("Check-in open time must be before close time");
    }
  }

  private validateSessionWithinEvent(
    startsAt: Date,
    endsAt: Date,
    eventStart: Date,
    eventEnd: Date,
  ) {
    if (startsAt < eventStart || endsAt > eventEnd) {
      throw new BadRequestException("Session must be within the event schedule");
    }
  }

  private async ensureNoOverlappingSession(
    eventId: string,
    startsAt: Date,
    endsAt: Date,
    excludeSessionId?: string,
  ) {
    const overlapping = await this.db.db
      .select({ id: eventSessions.id })
      .from(eventSessions)
      .where(
        and(
          eq(eventSessions.eventId, eventId),
          eq(eventSessions.isDefault, false),
          excludeSessionId
            ? sql`${eventSessions.id} != ${excludeSessionId}`
            : sql`TRUE`,
          sql`${eventSessions.status} != 'CANCELLED'`,
          sql`${eventSessions.startsAt} < ${endsAt}`,
          sql`${eventSessions.endsAt} > ${startsAt}`,
        ),
      )
      .limit(1);
    if (overlapping.length > 0) {
      throw new BadRequestException("Session overlaps another custom session");
    }
  }

  private resolveCheckinModes(modes: CheckinMode[] | undefined): CheckinMode[] {
    return modes?.length
      ? ([...new Set(modes)] as CheckinMode[])
      : ["ATTENDEE_CREDENTIAL", "BOARD_QR"] as CheckinMode[];
  }

  private normalizeFieldKey(input: string) {
    const key = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) {
      throw new BadRequestException("Field key is required");
    }
    if (key.length > 64) {
      throw new BadRequestException("Field key must be 64 characters or fewer");
    }
    return key;
  }

  async assertUserEligibleForEvent(eventId: string, userId: string, message?: string) {
    const [event] = await this.db.db
      .select({
        id: events.id,
        allowedDomains: events.allowedDomains,
        allowedEmails: events.allowedEmails,
        blockedEmails: events.blockedEmails,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    const [user] = await this.db.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    assertEmailEligible(user.email, event, message ?? "Your account is not eligible for this event");
  }

  private async writeAudit(
    workspaceId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    payload: { before?: unknown; after?: unknown; metadata?: unknown },
  ) {
    await this.db.db.insert(auditLogs).values({
      workspaceId,
      actorUserId,
      action,
      entityType,
      entityId,
      before: this.toJsonValue(payload.before),
      after: this.toJsonValue(payload.after),
      metadata: this.toJsonValue(payload.metadata),
    });
  }

  private toJsonValue(value: unknown): unknown {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }
}

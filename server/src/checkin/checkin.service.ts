import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import {
  ATTENDANCE_POLICY_VALUES,
  BOARD_STATUS_VALUES,
  CHECKIN_DIRECTION_VALUES,
  CHECKIN_METHOD_VALUES,
  CHECKIN_MODE_VALUES,
  CHECKIN_SOURCE_VALUES,
  EVENT_QR_BEHAVIOR_VALUES,
  EVENT_STATUS_VALUES,
  SESSION_STATUS_VALUES,
  boards,
  checkinRecords,
  eventRegistrations,
  events,
  eventSessions,
  users,
} from "../database/schema";
import { RedisService } from "../redis/redis.service";
import { QrService } from "../qr/qr.service";
import { EventsGateway } from "../gateway/events.gateway";
import { OfflineCheckinDto } from "./dto/bulk-sync.dto";
import { assertEmailEligible } from "../events/event-eligibility";

type AttendancePolicy = (typeof ATTENDANCE_POLICY_VALUES)[number];
type BoardStatus = (typeof BOARD_STATUS_VALUES)[number];
type CheckinDirection = (typeof CHECKIN_DIRECTION_VALUES)[number];
type CheckinMethod = (typeof CHECKIN_METHOD_VALUES)[number];
type CheckinMode = (typeof CHECKIN_MODE_VALUES)[number];
type CheckinSource = (typeof CHECKIN_SOURCE_VALUES)[number];
type EventQrBehavior = (typeof EVENT_QR_BEHAVIOR_VALUES)[number];
type EventStatus = (typeof EVENT_STATUS_VALUES)[number];
type SessionStatus = (typeof SESSION_STATUS_VALUES)[number];

export interface ScanResult {
  success: boolean;
  message: string;
  attendance?: {
    policy: AttendancePolicy;
    completed: boolean;
    completedBoardCount?: number;
    requiredBoardCount?: number;
  };
  checkinRecord?: {
    id: string;
    userId: string;
    eventId: string;
    boardId: string;
    sessionId?: string | null;
    sessionName?: string | null;
    outsideSession?: boolean;
    direction: CheckinDirection;
    timestamp: Date;
    method: CheckinMethod;
    source: CheckinSource;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface BulkSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  details: Array<{
    hash: string;
    userId: string;
    eventId: string;
    status: "synced" | "skipped" | "error";
    reason?: string;
  }>;
}

interface ScanOptions {
  direction?: CheckinDirection;
  latitude?: number;
  longitude?: number;
  scannedById?: string;
  source?: CheckinSource;
  timestamp?: Date;
}

interface EventWithBoards {
  id: string;
  registrationEnabled: boolean;
  checkinModes: CheckinMode[];
  eventQrBehavior: EventQrBehavior;
  allowedDomains: string[];
  allowedEmails: string[];
  blockedEmails: string[];
  status: EventStatus;
  startTime: Date;
  endTime: Date;
  attendancePolicy: AttendancePolicy;
  requiredBoardCount: number | null;
  credentialGraceSeconds: number;
  customSessionsEnabled: boolean;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number | null;
  boards: Array<{ id: string }>;
  sessions: Array<{
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
    isDefault: boolean;
  }>;
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redisService: RedisService,
    private readonly qrService: QrService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async peekQr(hash: string) {
    return this.qrService.validateHash(hash);
  }

  async scanCheckin(
    hash: string,
    boardId: string,
    eventId: string,
    scannerUserId?: string,
    options: ScanOptions = {},
  ): Promise<ScanResult> {
    return this.scanPersonalQr(hash, boardId, eventId, {
      ...options,
      scannedById: scannerUserId,
      source: options.source ?? "PERSONAL_QR",
    });
  }

  async scanPersonalQr(
    hash: string,
    boardId: string,
    eventId: string,
    options: ScanOptions = {},
  ): Promise<ScanResult> {
    const [eventForGrace] = await this.db.db
      .select({ credentialGraceSeconds: events.credentialGraceSeconds })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const graceMs = (eventForGrace?.credentialGraceSeconds ?? 120) * 1000;
    const effectiveGraceMs = options.source === "OFFLINE_SYNC" ? graceMs : 0;

    const qrData = await this.qrService.validateToken(hash, effectiveGraceMs);
    if (!qrData || qrData.type !== "PERSONAL") {
      throw new BadRequestException("QR code expired or invalid");
    }
    if (qrData.eventId && qrData.eventId !== eventId) {
      throw new BadRequestException("QR code does not match this event");
    }

    if (await this.qrService.isJtiConsumed(qrData.jti)) {
      throw new BadRequestException("QR code has already been used");
    }

    return this.createPolicyCheckin(qrData.userId, eventId, boardId, options, hash);
  }

  async scanByShortCode(
    code: string,
    boardId: string,
    eventId: string,
    options: ScanOptions = {},
  ): Promise<ScanResult> {
    const hash = await this.qrService.resolveShortCode(code);
    if (!hash) {
      throw new BadRequestException("Short code not found or expired");
    }
    return this.scanPersonalQr(hash, boardId, eventId, options);
  }

  async scanBoardQr(
    hash: string,
    attendeeUserId: string,
    options: ScanOptions = {},
  ): Promise<ScanResult> {
    const qrData = await this.qrService.validateToken(hash);
    if (!qrData || qrData.type !== "BOARD") {
      throw new BadRequestException("QR code expired or invalid");
    }

    const [event] = await this.db.db
      .select({
        id: events.id,
        registrationEnabled: events.registrationEnabled,
        checkinModes: events.checkinModes,
        eventQrBehavior: events.eventQrBehavior,
        allowedDomains: events.allowedDomains,
        allowedEmails: events.allowedEmails,
        blockedEmails: events.blockedEmails,
      })
      .from(events)
      .where(eq(events.id, qrData.eventId))
      .limit(1);
    if (!event) {
      throw new BadRequestException("Event not found");
    }
    if (!event.checkinModes.includes("BOARD_QR")) {
      throw new ForbiddenException("This event does not allow board QR check-in");
    }

    if (event.eventQrBehavior === "JOIN_AND_CHECKIN") {
      if (!event.registrationEnabled) {
        throw new ForbiddenException("Event registration is closed");
      }
      const [attendee] = await this.db.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, attendeeUserId))
        .limit(1);
      if (!attendee) {
        throw new BadRequestException("Attendee not found");
      }
      assertEmailEligible(attendee.email, event, "Attendee is not eligible for this event");
    await this.db.db
      .insert(eventRegistrations)
      .values({ eventId: qrData.eventId, userId: attendeeUserId })
      .onConflictDoUpdate({
        target: [eventRegistrations.userId, eventRegistrations.eventId],
        set: { status: "APPROVED" },
      });
  }

    return this.createPolicyCheckin(attendeeUserId, qrData.eventId, qrData.boardId, {
      ...options,
      direction: qrData.direction,
      source: "BOARD_QR",
    });
  }

  async bulkSync(checkins: OfflineCheckinDto[]): Promise<BulkSyncResult> {
    const result: BulkSyncResult = {
      synced: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const item of checkins) {
      let resolvedUserId = "unknown";
      let resolvedEventId = "unknown";
      try {
        const [board] = await this.db.db
          .select({ eventId: boards.eventId })
          .from(boards)
          .where(eq(boards.id, item.boardId))
          .limit(1);
        if (!board) {
          throw new BadRequestException("Board not found");
        }

        const scanResult = await this.scanPersonalQr(item.hash, item.boardId, board.eventId, {
          direction: item.direction ?? "IN",
          source: "OFFLINE_SYNC",
          timestamp: new Date(item.scannedAt),
        });

        resolvedUserId = scanResult.checkinRecord?.userId ?? resolvedUserId;
        resolvedEventId = scanResult.checkinRecord?.eventId ?? board.eventId;

        if (scanResult.success) {
          result.synced++;
          result.details.push({
            hash: item.hash,
            userId: resolvedUserId,
            eventId: resolvedEventId,
            status: "synced",
          });
        } else {
          result.skipped++;
          result.details.push({
            hash: item.hash,
            userId: resolvedUserId,
            eventId: resolvedEventId,
            status: "skipped",
            reason: scanResult.message,
          });
        }
      } catch (error) {
        result.errors++;
        result.details.push({
          hash: item.hash,
          userId: resolvedUserId,
          eventId: resolvedEventId,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        });

        this.logger.error(
          `Bulk sync error for user=${resolvedUserId} event=${resolvedEventId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log(
      `Bulk sync complete: synced=${result.synced} skipped=${result.skipped} errors=${result.errors}`,
    );

    return result;
  }

  private async createPolicyCheckin(
    userId: string,
    eventId: string,
    boardId: string,
    options: ScanOptions,
    consumedHash?: string,
  ): Promise<ScanResult> {
    const direction = options.direction ?? "IN";
    const source = options.source ?? "PERSONAL_QR";

    const [board] = await this.db.db
      .select({
        board: boards,
        event: {
          id: events.id,
          registrationEnabled: events.registrationEnabled,
          checkinModes: events.checkinModes,
          eventQrBehavior: events.eventQrBehavior,
          allowedDomains: events.allowedDomains,
          allowedEmails: events.allowedEmails,
          blockedEmails: events.blockedEmails,
          status: events.status,
          startTime: events.startTime,
          endTime: events.endTime,
          attendancePolicy: events.attendancePolicy,
          requiredBoardCount: events.requiredBoardCount,
          credentialGraceSeconds: events.credentialGraceSeconds,
          customSessionsEnabled: events.customSessionsEnabled,
          latitude: events.latitude,
          longitude: events.longitude,
          geofenceRadius: events.geofenceRadius,
        },
      })
      .from(boards)
      .innerJoin(events, eq(events.id, boards.eventId))
      .where(eq(boards.id, boardId))
      .limit(1);

    if (!board || board.board.eventId !== eventId) {
      throw new BadRequestException("Board does not belong to this event");
    }
    if (board.board.status !== ("ACTIVE" as BoardStatus)) {
      throw new BadRequestException("This check-in board is not active");
    }

    const event = board.event;
    const serverNow = new Date();
    if (
      event.status === ("CANCELLED" as EventStatus) ||
      event.status === ("COMPLETED" as EventStatus) ||
      serverNow > event.endTime
    ) {
      throw new BadRequestException("This event is not accepting check-ins");
    }

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
    if (!registration) {
      throw new ForbiddenException("Attendee is not registered for this event");
    }

    const [attendee] = await this.db.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!attendee) {
      throw new BadRequestException("Attendee not found");
    }
    assertEmailEligible(attendee.email, event, "Attendee is not eligible for this event");

    const eventBoards = await this.db.db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.eventId, eventId));
    const eventSessionsList = await this.db.db
      .select({
        id: eventSessions.id,
        title: eventSessions.title,
        startsAt: eventSessions.startsAt,
        endsAt: eventSessions.endsAt,
        status: eventSessions.status,
        isDefault: eventSessions.isDefault,
      })
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId));

    const fullEvent: EventWithBoards = {
      ...event,
      boards: eventBoards,
      sessions: eventSessionsList,
    };

    this.assertGeofence(fullEvent, options.latitude, options.longitude);
    this.assertPolicyInput(fullEvent, boardId, direction);
    const resolvedSession = this.resolveCheckinSession(fullEvent, serverNow);

    const idempotencyKey = this.buildIdempotencyKey(
      fullEvent.attendancePolicy,
      eventId,
      userId,
      boardId,
      direction,
    );

    if (
      fullEvent.attendancePolicy === "IN_OUT" &&
      direction === "OUT"
    ) {
      const [inRecord] = await this.db.db
        .select()
        .from(checkinRecords)
        .where(eq(checkinRecords.idempotencyKey, this.buildIdempotencyKey(
          fullEvent.attendancePolicy,
          eventId,
          userId,
          boardId,
          "IN",
        )))
        .limit(1);
      if (!inRecord) {
        throw new BadRequestException("Cannot check out before check-in");
      }
    }

    const lockKey = `CHECKIN_LOCK:${idempotencyKey}`;
    const lockValue = await this.redisService.acquireLock(lockKey, 5);

    if (!lockValue) {
      throw new ConflictException("Check-in is being processed, please wait");
    }

    try {
      const existingCheckin = await this.findCheckinByIdempotencyKey(idempotencyKey);
      if (existingCheckin) {
        return this.toExistingResult(existingCheckin, fullEvent, boardId);
      }

      const inserted = await this.db.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(checkinRecords)
          .values({
            userId,
            eventId,
            boardId,
            sessionId: resolvedSession.sessionId,
            direction,
            source,
            scannedById: options.scannedById ?? null,
            timestamp: options.timestamp ?? new Date(),
            method: source === "OFFLINE_SYNC" ? "BULK_SYNC" : "QR_SCAN",
            idempotencyKey,
          })
          .returning();

        await tx
          .update(boards)
          .set({ checkinCount: sql`${boards.checkinCount} + 1` })
          .where(eq(boards.id, boardId));

        const [withRelations] = await tx
          .select({
            checkin: checkinRecords,
            user: { id: users.id, name: users.name, email: users.email },
            session: { id: eventSessions.id, title: eventSessions.title },
          })
          .from(checkinRecords)
          .innerJoin(users, eq(users.id, checkinRecords.userId))
          .leftJoin(eventSessions, eq(eventSessions.id, checkinRecords.sessionId))
          .where(eq(checkinRecords.id, created.id))
          .limit(1);

        return withRelations;
      });

      if (consumedHash && source !== "BOARD_QR") {
        await this.qrService.consumeHash(consumedHash);
      }

      this.eventsGateway.broadcastCheckin(eventId, {
        checkinId: inserted.checkin.id,
        userId: inserted.checkin.userId,
        boardId,
        timestamp: inserted.checkin.timestamp.toISOString(),
        method: inserted.checkin.method,
        user: inserted.user,
      });

      this.logger.log(
        `Check-in success: user=${userId} event=${eventId} board=${boardId} policy=${fullEvent.attendancePolicy}`,
      );

      return {
        success: true,
        message: "Check-in successful",
        attendance: await this.getAttendanceProgress(userId, fullEvent),
        checkinRecord: {
          id: inserted.checkin.id,
          userId: inserted.checkin.userId,
          eventId: inserted.checkin.eventId,
          boardId,
          sessionId: inserted.checkin.sessionId,
          sessionName: inserted.session?.title ?? null,
          outsideSession: resolvedSession.outsideSession,
          direction: inserted.checkin.direction,
          timestamp: inserted.checkin.timestamp,
          method: inserted.checkin.method,
          source: inserted.checkin.source,
          user: inserted.user,
        },
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existingCheckin = await this.findCheckinByIdempotencyKey(idempotencyKey);
        if (existingCheckin) {
          return this.toExistingResult(existingCheckin, fullEvent, boardId);
        }
      }
      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const e = error as { code?: string };
    return e.code === "23505";
  }

  private assertPolicyInput(event: EventWithBoards, boardId: string, direction: CheckinDirection) {
    if (event.attendancePolicy === "SINGLE_IN" && direction !== "IN") {
      throw new BadRequestException("This event only accepts a single check-in");
    }

    if (event.attendancePolicy === "BOARD_REQUIREMENTS" && direction !== "IN") {
      throw new BadRequestException("Board requirement events do not support check-out");
    }

    if (!event.boards.some((board) => board.id === boardId)) {
      throw new BadRequestException("Board does not belong to this event");
    }

    if (
      event.attendancePolicy === "BOARD_REQUIREMENTS" &&
      (!event.requiredBoardCount || event.requiredBoardCount < 1)
    ) {
      throw new BadRequestException("Board requirement count is not configured");
    }
  }

  private buildIdempotencyKey(
    policy: AttendancePolicy,
    eventId: string,
    userId: string,
    boardId: string,
    direction: CheckinDirection,
  ) {
    if (policy === "SINGLE_IN") {
      return `${eventId}:${userId}:single-in`;
    }
    if (policy === "IN_OUT") {
      return `${eventId}:${userId}:${direction.toLowerCase()}`;
    }
    return `${eventId}:${userId}:${boardId}:board`;
  }

  private resolveCheckinSession(event: EventWithBoards, serverNow: Date) {
    if (!event.customSessionsEnabled) {
      const defaultSession = event.sessions.find((session) => session.isDefault);
      return {
        sessionId: defaultSession?.id ?? null,
        outsideSession: false,
      };
    }

    const matchingSession = event.sessions.find((session) => {
      if (session.isDefault) return false;
      if (session.status !== "SCHEDULED" && session.status !== "OPEN") {
        return false;
      }
      return session.startsAt <= serverNow && serverNow <= session.endsAt;
    });

    return {
      sessionId: matchingSession?.id ?? null,
      outsideSession: !matchingSession,
    };
  }

  private async findCheckinByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.db.db
      .select({
        checkin: checkinRecords,
        user: { id: users.id, name: users.name, email: users.email },
        session: { id: eventSessions.id, title: eventSessions.title },
      })
      .from(checkinRecords)
      .innerJoin(users, eq(users.id, checkinRecords.userId))
      .leftJoin(eventSessions, eq(eventSessions.id, checkinRecords.sessionId))
      .where(eq(checkinRecords.idempotencyKey, idempotencyKey))
      .limit(1);
    return rows[0] ?? null;
  }

  private async toExistingResult(
    existing: {
      checkin: typeof checkinRecords.$inferSelect;
      user: { id: string; name: string; email: string };
      session: { id: string; title: string } | null;
    },
    event: EventWithBoards,
    fallbackBoardId: string,
  ): Promise<ScanResult> {
    return {
      success: false,
      message: "Already checked in for this attendance requirement",
      attendance: await this.getAttendanceProgress(existing.checkin.userId, event),
      checkinRecord: {
        id: existing.checkin.id,
        userId: existing.checkin.userId,
        eventId: existing.checkin.eventId,
        boardId: existing.checkin.boardId ?? fallbackBoardId,
        sessionId: existing.checkin.sessionId,
        sessionName: existing.session?.title ?? null,
        outsideSession: existing.checkin.sessionId == null,
        direction: existing.checkin.direction,
        timestamp: existing.checkin.timestamp,
        method: existing.checkin.method,
        source: existing.checkin.source,
        user: existing.user,
      },
    };
  }

  private async getAttendanceProgress(userId: string, event: EventWithBoards) {
    if (event.attendancePolicy === "BOARD_REQUIREMENTS") {
      const [completedRow] = await this.db.db
        .select({ n: sql<number>`count(*)::int` })
        .from(checkinRecords)
        .where(
          and(
            eq(checkinRecords.userId, userId),
            eq(checkinRecords.eventId, event.id),
            sql`${checkinRecords.source} != 'MANUAL'`,
          ),
        );
      const requiredBoardCount = Math.min(
        event.requiredBoardCount ?? event.boards.length,
        event.boards.length,
      );
      return {
        policy: event.attendancePolicy,
        completed: (completedRow?.n ?? 0) >= requiredBoardCount,
        completedBoardCount: completedRow?.n ?? 0,
        requiredBoardCount,
      };
    }

    if (event.attendancePolicy === "IN_OUT") {
      const [inRecord] = await this.db.db
        .select()
        .from(checkinRecords)
        .where(
          and(
            eq(checkinRecords.userId, userId),
            eq(checkinRecords.eventId, event.id),
            eq(checkinRecords.direction, "IN"),
          ),
        )
        .limit(1);
      const [outRecord] = await this.db.db
        .select()
        .from(checkinRecords)
        .where(
          and(
            eq(checkinRecords.userId, userId),
            eq(checkinRecords.eventId, event.id),
            eq(checkinRecords.direction, "OUT"),
          ),
        )
        .limit(1);
      return {
        policy: event.attendancePolicy,
        completed: Boolean(inRecord && outRecord),
      };
    }

    return {
      policy: event.attendancePolicy,
      completed: true,
    };
  }

  private assertGeofence(
    event: Pick<EventWithBoards, "latitude" | "longitude" | "geofenceRadius">,
    latitude?: number,
    longitude?: number,
  ) {
    if (event.latitude == null || event.longitude == null || event.geofenceRadius == null) {
      return;
    }
    if (latitude == null || longitude == null) {
      throw new BadRequestException("Location is required for this event");
    }

    const distance = this.haversineDistance(latitude, longitude, event.latitude, event.longitude);
    if (distance > event.geofenceRadius) {
      throw new BadRequestException("Outside event geofence");
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusMeters = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

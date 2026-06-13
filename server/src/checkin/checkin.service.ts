import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import {
  ATTENDANCE_POLICY,
  BOARD_STATUS,
  CHECKIN_DIRECTION,
  CHECKIN_METHOD,
  CHECKIN_SOURCE,
  CHECKIN_MODE,
  EVENT_STATUS,
  EVENT_QR_BEHAVIOR,
  Prisma,
  SESSION_STATUS,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { QrService } from "../qr/qr.service";
import { EventsGateway } from "../gateway/events.gateway";
import { OfflineCheckinDto } from "./dto/bulk-sync.dto";
import { assertEmailEligible } from "../events/event-eligibility";

export interface ScanResult {
  success: boolean;
  message: string;
  attendance?: {
    policy: ATTENDANCE_POLICY;
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
    direction: CHECKIN_DIRECTION;
    timestamp: Date;
    method: CHECKIN_METHOD;
    source: CHECKIN_SOURCE;
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
    userId: string;
    eventId: string;
    status: "synced" | "skipped" | "error";
    reason?: string;
  }>;
}

interface ScanOptions {
  direction?: CHECKIN_DIRECTION;
  latitude?: number;
  longitude?: number;
  scannedById?: string;
  source?: CHECKIN_SOURCE;
  timestamp?: Date;
}

type EventWithBoards = Prisma.EventGetPayload<{
  include: {
    boards: { select: { id: true } };
    sessions: {
      select: {
        id: true;
        title: true;
        startsAt: true;
        endsAt: true;
        status: true;
        isDefault: true;
      };
    };
  };
}>;

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
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
      source: options.source ?? CHECKIN_SOURCE.PERSONAL_QR,
    });
  }

  async scanPersonalQr(
    hash: string,
    boardId: string,
    eventId: string,
    options: ScanOptions = {},
  ): Promise<ScanResult> {
    // Load credentialGraceSeconds from event for offline-sync grace window
    const eventForGrace = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { credentialGraceSeconds: true },
    });
    const graceMs = (eventForGrace?.credentialGraceSeconds ?? 120) * 1000;
    // Online scans: graceMs is 0 (Redis TTL already enforces expiry).
    // Offline syncs pass options.source === OFFLINE_SYNC, so use grace only there.
    const effectiveGraceMs = options.source === CHECKIN_SOURCE.OFFLINE_SYNC ? graceMs : 0;

    const qrData = await this.qrService.validateToken(hash, effectiveGraceMs);
    if (!qrData || qrData.type !== "PERSONAL") {
      throw new BadRequestException("QR code expired or invalid");
    }
    if (qrData.eventId && qrData.eventId !== eventId) {
      throw new BadRequestException("QR code does not match this event");
    }

    // Enforce JTI single-use
    if (await this.qrService.isJtiConsumed(qrData.jti)) {
      throw new BadRequestException("QR code has already been used");
    }

    return this.createPolicyCheckin(qrData.userId, eventId, boardId, options, hash);
  }

  /**
   * Scan using a 6-character short code instead of a QR image.
   * Resolves the code to its credential hash, then delegates to scanPersonalQr.
   */
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

    const event = await this.prisma.event.findUnique({
      where: { id: qrData.eventId },
      select: {
        id: true,
        registrationEnabled: true,
        checkinModes: true,
        eventQrBehavior: true,
        allowedDomains: true,
        allowedEmails: true,
        blockedEmails: true,
      },
    });
    if (!event) {
      throw new BadRequestException("Event not found");
    }
    if (!event.checkinModes.includes(CHECKIN_MODE.BOARD_QR)) {
      throw new ForbiddenException("This event does not allow board QR check-in");
    }

    if (event.eventQrBehavior === EVENT_QR_BEHAVIOR.JOIN_AND_CHECKIN) {
      if (!event.registrationEnabled) {
        throw new ForbiddenException("Event registration is closed");
      }
      const attendee = await this.prisma.user.findUnique({
        where: { id: attendeeUserId },
        select: { email: true },
      });
      if (!attendee) {
        throw new BadRequestException("Attendee not found");
      }
      assertEmailEligible(attendee.email, event, "Attendee is not eligible for this event");
      await this.prisma.eventRegistration.upsert({
        where: {
          one_registration_per_event: {
            eventId: qrData.eventId,
            userId: attendeeUserId,
          },
        },
        update: {},
        create: { eventId: qrData.eventId, userId: attendeeUserId },
      });
    }

    return this.createPolicyCheckin(attendeeUserId, qrData.eventId, qrData.boardId, {
      ...options,
      direction: qrData.direction,
      source: CHECKIN_SOURCE.BOARD_QR,
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
        const board = await this.prisma.board.findUnique({
          where: { id: item.boardId },
          select: { eventId: true },
        });
        if (!board) {
          throw new BadRequestException("Board not found");
        }

        const scanResult = await this.scanPersonalQr(item.hash, item.boardId, board.eventId, {
          direction: item.direction ?? CHECKIN_DIRECTION.IN,
          source: CHECKIN_SOURCE.OFFLINE_SYNC,
          timestamp: new Date(item.scannedAt),
        });

        resolvedUserId = scanResult.checkinRecord?.userId ?? resolvedUserId;
        resolvedEventId = scanResult.checkinRecord?.eventId ?? board.eventId;

        if (scanResult.success) {
          result.synced++;
          result.details.push({
            userId: resolvedUserId,
            eventId: resolvedEventId,
            status: "synced",
          });
        } else {
          result.skipped++;
          result.details.push({
            userId: resolvedUserId,
            eventId: resolvedEventId,
            status: "skipped",
            reason: scanResult.message,
          });
        }
      } catch (error) {
        result.errors++;
        result.details.push({
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
    const direction = options.direction ?? CHECKIN_DIRECTION.IN;
    const source = options.source ?? CHECKIN_SOURCE.PERSONAL_QR;

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        event: {
          include: {
            boards: { select: { id: true } },
            sessions: {
              select: {
                id: true,
                title: true,
                startsAt: true,
                endsAt: true,
                status: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });

    if (!board || board.eventId !== eventId) {
      throw new BadRequestException("Board does not belong to this event");
    }
    if (board.status !== BOARD_STATUS.ACTIVE) {
      throw new BadRequestException("This check-in board is not active");
    }

    const event = board.event;
    const serverNow = new Date();
    if (
      event.status === EVENT_STATUS.CANCELLED ||
      event.status === EVENT_STATUS.COMPLETED ||
      serverNow > event.endTime
    ) {
      throw new BadRequestException("This event is not accepting check-ins");
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { one_registration_per_event: { userId, eventId } },
    });
    if (!registration) {
      throw new ForbiddenException("Attendee is not registered for this event");
    }

    const attendee = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!attendee) {
      throw new BadRequestException("Attendee not found");
    }
    assertEmailEligible(attendee.email, event, "Attendee is not eligible for this event");

    this.assertGeofence(event, options.latitude, options.longitude);
    this.assertPolicyInput(event, boardId, direction);
    const resolvedSession = this.resolveCheckinSession(event, serverNow);

    const idempotencyKey = this.buildIdempotencyKey(
      event.attendancePolicy,
      eventId,
      userId,
      boardId,
      direction,
    );

    if (
      event.attendancePolicy === ATTENDANCE_POLICY.IN_OUT &&
      direction === CHECKIN_DIRECTION.OUT
    ) {
      const inRecord = await this.prisma.checkinRecord.findUnique({
        where: {
          idempotencyKey: this.buildIdempotencyKey(
            event.attendancePolicy,
            eventId,
            userId,
            boardId,
            CHECKIN_DIRECTION.IN,
          ),
        },
      });
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
        return this.toExistingResult(existingCheckin, event, boardId);
      }

      const [checkinRecord] = await this.prisma.$transaction([
        this.prisma.checkinRecord.create({
          data: {
            userId,
            eventId,
            boardId,
            sessionId: resolvedSession.sessionId,
            direction,
            source,
            scannedById: options.scannedById,
            timestamp: options.timestamp,
            method:
              source === CHECKIN_SOURCE.OFFLINE_SYNC
                ? CHECKIN_METHOD.BULK_SYNC
                : CHECKIN_METHOD.QR_SCAN,
            idempotencyKey,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            session: { select: { id: true, title: true } },
          },
        }),
        this.prisma.board.update({
          where: { id: boardId },
          data: { checkinCount: { increment: 1 } },
        }),
      ]);

      if (consumedHash && source !== CHECKIN_SOURCE.BOARD_QR) {
        await this.qrService.consumeHash(consumedHash);
      }

      this.eventsGateway.broadcastCheckin(eventId, {
        checkinId: checkinRecord.id,
        userId: checkinRecord.userId,
        boardId,
        timestamp: checkinRecord.timestamp.toISOString(),
        method: checkinRecord.method,
        user: checkinRecord.user,
      });

      this.logger.log(
        `Check-in success: user=${userId} event=${eventId} board=${boardId} policy=${event.attendancePolicy}`,
      );

      return {
        success: true,
        message: "Check-in successful",
        attendance: await this.getAttendanceProgress(userId, event),
        checkinRecord: {
          id: checkinRecord.id,
          userId: checkinRecord.userId,
          eventId: checkinRecord.eventId,
          boardId,
          sessionId: checkinRecord.sessionId,
          sessionName: checkinRecord.session?.title ?? null,
          outsideSession: resolvedSession.outsideSession,
          direction: checkinRecord.direction,
          timestamp: checkinRecord.timestamp,
          method: checkinRecord.method,
          source: checkinRecord.source,
          user: checkinRecord.user,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existingCheckin = await this.findCheckinByIdempotencyKey(idempotencyKey);
        if (existingCheckin) {
          return this.toExistingResult(existingCheckin, event, boardId);
        }
      }
      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  private assertPolicyInput(event: EventWithBoards, boardId: string, direction: CHECKIN_DIRECTION) {
    if (
      event.attendancePolicy === ATTENDANCE_POLICY.SINGLE_IN &&
      direction !== CHECKIN_DIRECTION.IN
    ) {
      throw new BadRequestException("This event only accepts a single check-in");
    }

    if (
      event.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS &&
      direction !== CHECKIN_DIRECTION.IN
    ) {
      throw new BadRequestException("Board requirement events do not support check-out");
    }

    if (!event.boards.some((board) => board.id === boardId)) {
      throw new BadRequestException("Board does not belong to this event");
    }

    if (
      event.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS &&
      (!event.requiredBoardCount || event.requiredBoardCount < 1)
    ) {
      throw new BadRequestException("Board requirement count is not configured");
    }
  }

  private buildIdempotencyKey(
    policy: ATTENDANCE_POLICY,
    eventId: string,
    userId: string,
    boardId: string,
    direction: CHECKIN_DIRECTION,
  ) {
    if (policy === ATTENDANCE_POLICY.SINGLE_IN) {
      return `${eventId}:${userId}:single-in`;
    }
    if (policy === ATTENDANCE_POLICY.IN_OUT) {
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
      if (session.status !== SESSION_STATUS.SCHEDULED && session.status !== SESSION_STATUS.OPEN) {
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
    return this.prisma.checkinRecord.findUnique({
      where: { idempotencyKey },
      include: {
        user: { select: { id: true, name: true, email: true } },
        session: { select: { id: true, title: true } },
      },
    });
  }

  private async toExistingResult(
    existingCheckin: NonNullable<
      Awaited<ReturnType<CheckinService["findCheckinByIdempotencyKey"]>>
    >,
    event: EventWithBoards,
    fallbackBoardId: string,
  ): Promise<ScanResult> {
    return {
      success: false,
      message: "Already checked in for this attendance requirement",
      attendance: await this.getAttendanceProgress(existingCheckin.userId, event),
      checkinRecord: {
        id: existingCheckin.id,
        userId: existingCheckin.userId,
        eventId: existingCheckin.eventId,
        boardId: existingCheckin.boardId ?? fallbackBoardId,
        sessionId: existingCheckin.sessionId,
        sessionName: existingCheckin.session?.title ?? null,
        outsideSession: existingCheckin.sessionId == null,
        direction: existingCheckin.direction,
        timestamp: existingCheckin.timestamp,
        method: existingCheckin.method,
        source: existingCheckin.source,
        user: existingCheckin.user,
      },
    };
  }

  private async getAttendanceProgress(userId: string, event: EventWithBoards) {
    if (event.attendancePolicy === ATTENDANCE_POLICY.BOARD_REQUIREMENTS) {
      const completedBoardCount = await this.prisma.checkinRecord.count({
        where: {
          userId,
          eventId: event.id,
          source: { not: CHECKIN_SOURCE.MANUAL },
        },
      });
      const requiredBoardCount = Math.min(
        event.requiredBoardCount ?? event.boards.length,
        event.boards.length,
      );
      return {
        policy: event.attendancePolicy,
        completed: completedBoardCount >= requiredBoardCount,
        completedBoardCount,
        requiredBoardCount,
      };
    }

    if (event.attendancePolicy === ATTENDANCE_POLICY.IN_OUT) {
      const [inRecord, outRecord] = await Promise.all([
        this.prisma.checkinRecord.findFirst({
          where: { userId, eventId: event.id, direction: CHECKIN_DIRECTION.IN },
        }),
        this.prisma.checkinRecord.findFirst({
          where: { userId, eventId: event.id, direction: CHECKIN_DIRECTION.OUT },
        }),
      ]);
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

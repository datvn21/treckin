import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CheckinService } from "./checkin.service";
import {
  BoardQrCheckinDto,
  ScanCheckinDto,
  ShortCodeCheckinDto,
} from "./dto/scan-checkin.dto";
import { BulkSyncDto } from "./dto/bulk-sync.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { EventsService } from "../events/events.service";

@ApiTags("Check-in")
@Controller("checkin")
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly eventsService: EventsService,
  ) {}

  @Post("scan")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Scan QR code to check in" })
  @ApiResponse({ status: 200, description: "Check-in processed" })
  @ApiResponse({ status: 400, description: "QR code expired or invalid" })
  @ApiResponse({ status: 409, description: "Lock contention — try again" })
  async scan(@Body() dto: ScanCheckinDto, @CurrentUser() user: JwtPayload) {
    await this.eventsService.canScanEvent(dto.eventId, user.sub);
    await this.eventsService.requireCheckinMode(dto.eventId, "ATTENDEE_CREDENTIAL");
    return this.checkinService.scanCheckin(dto.hash, dto.boardId, dto.eventId, user.sub, {
      direction: dto.direction,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Post("by-personal-qr")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Scanner checks in an attendee by scanning their personal QR" })
  async scanPersonalQr(@Body() dto: ScanCheckinDto, @CurrentUser() user: JwtPayload) {
    await this.eventsService.canScanEvent(dto.eventId, user.sub);
    await this.eventsService.requireCheckinMode(dto.eventId, "ATTENDEE_CREDENTIAL");
    return this.checkinService.scanPersonalQr(dto.hash, dto.boardId, dto.eventId, {
      scannedById: user.sub,
      direction: dto.direction,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Post("by-board-qr")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Attendee checks in by scanning a projected event/board QR" })
  async scanBoardQr(@Body() dto: BoardQrCheckinDto, @CurrentUser() user: JwtPayload) {
    return this.checkinService.scanBoardQr(dto.hash, user.sub, {
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Post("by-short-code")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Scanner checks in an attendee using their 6-character short code fallback",
    description:
      "Use this when the QR cannot be scanned (bad lighting, cracked screen, camera failure). The attendee reads the 6-character code aloud and the scanner types it.",
  })
  @ApiResponse({ status: 200, description: "Check-in processed" })
  @ApiResponse({ status: 400, description: "Code not found, expired, or already used" })
  async scanByShortCode(@Body() dto: ShortCodeCheckinDto, @CurrentUser() user: JwtPayload) {
    await this.eventsService.canScanEvent(dto.eventId, user.sub);
    await this.eventsService.requireCheckinMode(dto.eventId, "ATTENDEE_CREDENTIAL");
    return this.checkinService.scanByShortCode(dto.code, dto.boardId, dto.eventId, {
      scannedById: user.sub,
      direction: dto.direction,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Post("bulk-sync")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Bulk sync offline check-ins (event scanner/manager/owner only)" })
  @ApiResponse({ status: 200, description: "Bulk sync results" })
  async bulkSync(@Body() dto: BulkSyncDto, @CurrentUser() user: JwtPayload) {
    for (const checkin of dto.checkins) {
      await this.eventsService.canScanBoard(checkin.boardId, user.sub);
    }
    return this.checkinService.bulkSync(dto.checkins);
  }
}

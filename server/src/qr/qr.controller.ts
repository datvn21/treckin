import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { CHECKIN_DIRECTION_VALUES, CHECKIN_MODE_VALUES } from "../database/schema/enums";

export const CHECKIN_DIRECTION = Object.fromEntries(
  CHECKIN_DIRECTION_VALUES.map((v) => [v, v]),
) as { [K in (typeof CHECKIN_DIRECTION_VALUES)[number]]: K };
export const CHECKIN_MODE = Object.fromEntries(
  CHECKIN_MODE_VALUES.map((v) => [v, v]),
) as { [K in (typeof CHECKIN_MODE_VALUES)[number]]: K };
import { QrService } from "./qr.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { EventsService } from "../events/events.service";

class GenerateQrDto {
  @ApiProperty({ description: "Event ID to generate QR for" })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;
}

class GenerateBoardQrDto {
  @ApiProperty({ description: "Event ID for the projected board QR" })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ description: "Board ID for the projected board QR" })
  @IsUUID()
  @IsNotEmpty()
  boardId!: string;

  @ApiPropertyOptional({ enum: CHECKIN_DIRECTION, default: CHECKIN_DIRECTION.IN })
  @IsEnum(CHECKIN_DIRECTION)
  @IsOptional()
  direction?: (typeof CHECKIN_DIRECTION)[keyof typeof CHECKIN_DIRECTION];
}

class ResolveShortCodeDto {
  @ApiProperty({
    description: "6-character short code printed on the credential screen",
    example: "A3X7KP",
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

@ApiTags("QR")
@Controller("qr")
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly eventsService: EventsService,
  ) {}

  @Post("generate")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a time-limited QR hash + short code for check-in" })
  @ApiResponse({ status: 201, description: "QR hash + short code generated with TTL" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async generate(@Body() dto: GenerateQrDto, @CurrentUser() user: JwtPayload) {
    await this.eventsService.canGenerateQr(dto.eventId, user.sub);
    const result = await this.qrService.generateHash(user.sub, dto.eventId);
    return {
      hash: result.hash,
      expiresAt: result.expiresAt,
      ttl: result.ttl,
      shortCode: result.shortCode,
    };
  }

  @Post("personal")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a time-limited personal attendee QR + short code" })
  async generatePersonal(@Body() dto: GenerateQrDto, @CurrentUser() user: JwtPayload) {
    await this.eventsService.canGenerateQr(dto.eventId, user.sub);
    const result = await this.qrService.generatePersonalQr(user.sub, dto.eventId);
    return {
      hash: result.hash,
      expiresAt: result.expiresAt,
      ttl: result.ttl,
      shortCode: result.shortCode,
    };
  }

  @Post("board")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a projected event/board QR for attendee self check-in" })
  async generateBoard(@Body() dto: GenerateBoardQrDto, @CurrentUser() user: JwtPayload) {
    const boardEventId = await this.eventsService.canScanBoard(dto.boardId, user.sub);
    if (boardEventId !== dto.eventId) {
      throw new BadRequestException("Board does not belong to this event");
    }
    await this.eventsService.requireCheckinMode(dto.eventId, CHECKIN_MODE.BOARD_QR);
    const result = await this.qrService.generateBoardQr(
      dto.eventId,
      dto.boardId,
      dto.direction ?? CHECKIN_DIRECTION.IN,
    );
    return {
      hash: result.hash,
      expiresAt: result.expiresAt,
      ttl: result.ttl,
      shortCode: result.shortCode,
    };
  }

  /**
   * Resolve a 6-character short code to its full credential hash.
   * Scanners call this when an attendee reads the code aloud instead of showing a QR.
   * The response is the full hash which can then be passed to the standard scan endpoints.
   */
  @Post("resolve-code")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Resolve a 6-character short code to the corresponding credential hash",
    description:
      "Use this when an attendee cannot show the QR and reads out their one-time code instead.",
  })
  @ApiResponse({ status: 200, description: "Hash resolved successfully" })
  @ApiResponse({ status: 400, description: "Code not found or expired" })
  async resolveShortCode(@Body() dto: ResolveShortCodeDto) {
    const hash = await this.qrService.resolveShortCode(dto.code);
    if (!hash) {
      throw new BadRequestException("Short code not found or expired");
    }
    return { hash };
  }
}

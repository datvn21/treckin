import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ATTENDANCE_POLICY, CHECKIN_MODE, EVENT_QR_BEHAVIOR } from "@prisma/client";

export class CreateBoardDto {
  @ApiProperty({ example: "Board A" })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateEventDto {
  @ApiProperty({ example: "Workshop on AI" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: "An introductory workshop covering AI fundamentals" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: "2026-06-15T00:00:00.000Z" })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: "2026-06-15T08:00:00.000Z" })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: "2026-06-15T12:00:00.000Z" })
  @IsDateString()
  endTime!: string;

  @ApiProperty({ example: "Room B201, Main Campus" })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ example: 10.7326 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.6998 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 100, description: "Geofence radius in meters" })
  @IsNumber()
  @IsOptional()
  @Min(10)
  geofenceRadius?: number;

  @ApiPropertyOptional({
    enum: ATTENDANCE_POLICY,
    default: ATTENDANCE_POLICY.SINGLE_IN,
    description: "How attendance completion is calculated for this event",
  })
  @IsEnum(ATTENDANCE_POLICY)
  @IsOptional()
  attendancePolicy?: ATTENDANCE_POLICY;

  @ApiPropertyOptional({
    example: 3,
    description: "Minimum number of distinct boards required for BOARD_REQUIREMENTS events",
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  requiredBoardCount?: number;

  @ApiProperty({ type: [CreateBoardDto], description: "Check-in boards for this event" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoardDto)
  boards!: CreateBoardDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ["example.com", "myorganization.org"],
    description:
      "Allowed attendee email domains. Empty means public unless other allow rules exist.",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["alice@example.com"],
    description: "Explicitly allowed attendee emails.",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedEmails?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["blocked@example.com"],
    description: "Explicitly blocked attendee emails.",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedEmails?: string[];

  @ApiPropertyOptional({
    enum: CHECKIN_MODE,
    isArray: true,
    default: [CHECKIN_MODE.ATTENDEE_CREDENTIAL, CHECKIN_MODE.BOARD_QR],
    description: "Check-in flows enabled for this event",
  })
  @IsArray()
  @IsEnum(CHECKIN_MODE, { each: true })
  @IsOptional()
  checkinModes?: CHECKIN_MODE[];

  @ApiPropertyOptional({
    enum: EVENT_QR_BEHAVIOR,
    default: EVENT_QR_BEHAVIOR.JOIN_ONLY,
    description: "What attendee-facing event/board QR codes do",
  })
  @IsEnum(EVENT_QR_BEHAVIOR)
  @IsOptional()
  eventQrBehavior?: EVENT_QR_BEHAVIOR;

  @ApiPropertyOptional({
    example: 120,
    description:
      "Grace window in seconds after credential expiry (0-300, default 120). Protects against network lag and clock skew.",
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300)
  credentialGraceSeconds?: number;

  @ApiPropertyOptional({
    default: false,
    description: "Enable custom event sessions for shift or time-block check-in classification.",
  })
  @IsBoolean()
  @IsOptional()
  customSessionsEnabled?: boolean;
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { ATTENDANCE_POLICY, CHECKIN_MODE, EVENT_QR_BEHAVIOR, EVENT_STATUS } from "./enums";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ enum: EVENT_STATUS })
  @IsEnum(EVENT_STATUS)
  @IsOptional()
  status?: keyof typeof EVENT_STATUS;

  @ApiPropertyOptional({ enum: ATTENDANCE_POLICY })
  @IsEnum(ATTENDANCE_POLICY)
  @IsOptional()
  attendancePolicy?: keyof typeof ATTENDANCE_POLICY;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  requiredBoardCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedEmails?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedEmails?: string[];

  @ApiPropertyOptional({ enum: CHECKIN_MODE, isArray: true })
  @IsArray()
  @IsEnum(CHECKIN_MODE, { each: true })
  @IsOptional()
  checkinModes?: (keyof typeof CHECKIN_MODE)[];

  @ApiPropertyOptional({ enum: EVENT_QR_BEHAVIOR })
  @IsEnum(EVENT_QR_BEHAVIOR)
  @IsOptional()
  eventQrBehavior?: keyof typeof EVENT_QR_BEHAVIOR;

  @ApiPropertyOptional({
    example: 120,
    description: "Grace window in seconds after credential expiry (0-300, default 120)",
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300)
  credentialGraceSeconds?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  customSessionsEnabled?: boolean;
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { ATTENDANCE_POLICY, CHECKIN_MODE, EVENT_QR_BEHAVIOR } from "./enums";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateEventSettingsDto {
  @ApiPropertyOptional({ enum: ATTENDANCE_POLICY })
  @IsEnum(ATTENDANCE_POLICY)
  @IsOptional()
  attendancePolicy?: keyof typeof ATTENDANCE_POLICY;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  requiredBoardCount?: number;

  @ApiPropertyOptional({ enum: CHECKIN_MODE, isArray: true })
  @IsArray()
  @IsEnum(CHECKIN_MODE, { each: true })
  @IsOptional()
  checkinModes?: (keyof typeof CHECKIN_MODE)[];

  @ApiPropertyOptional({ enum: EVENT_QR_BEHAVIOR })
  @IsEnum(EVENT_QR_BEHAVIOR)
  @IsOptional()
  eventQrBehavior?: keyof typeof EVENT_QR_BEHAVIOR;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(600)
  qrTtlSeconds?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3600)
  credentialGraceSeconds?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  offlineSyncEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  geofenceEnabled?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsInt()
  @IsOptional()
  @Min(10)
  @Max(10000)
  geofenceRadiusMeters?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  manualCheckinEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  manualCorrectionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireCorrectionReason?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  certificateEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  attendanceProofEnabled?: boolean;
}

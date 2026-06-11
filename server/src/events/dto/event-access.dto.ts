import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ATTENDANCE_POLICY,
  CHECKIN_MODE,
  EVENT_ASSIGNMENT_ROLE,
  EVENT_QR_BEHAVIOR,
  EVENT_STATUS,
  FIELD_TYPE,
  SESSION_STATUS,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AssignEventMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: [EVENT_ASSIGNMENT_ROLE.MANAGER, EVENT_ASSIGNMENT_ROLE.SCANNER] })
  @IsEnum(EVENT_ASSIGNMENT_ROLE)
  role!: EVENT_ASSIGNMENT_ROLE;
}

export class JoinEventDto {
  @ApiProperty({ example: 'A1B2C3D4' })
  @IsString()
  joinCode!: string;
}

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
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ enum: EVENT_STATUS })
  @IsEnum(EVENT_STATUS)
  @IsOptional()
  status?: EVENT_STATUS;

  @ApiPropertyOptional({ enum: ATTENDANCE_POLICY })
  @IsEnum(ATTENDANCE_POLICY)
  @IsOptional()
  attendancePolicy?: ATTENDANCE_POLICY;

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
  checkinModes?: CHECKIN_MODE[];

  @ApiPropertyOptional({ enum: EVENT_QR_BEHAVIOR })
  @IsEnum(EVENT_QR_BEHAVIOR)
  @IsOptional()
  eventQrBehavior?: EVENT_QR_BEHAVIOR;

  @ApiPropertyOptional({
    example: 120,
    description: 'Grace window in seconds after credential expiry (0-300, default 120)',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300)
  credentialGraceSeconds?: number;
}

export class UpdateEventSettingsDto {
  @ApiPropertyOptional({ enum: ATTENDANCE_POLICY })
  @IsEnum(ATTENDANCE_POLICY)
  @IsOptional()
  attendancePolicy?: ATTENDANCE_POLICY;

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
  checkinModes?: CHECKIN_MODE[];

  @ApiPropertyOptional({ enum: EVENT_QR_BEHAVIOR })
  @IsEnum(EVENT_QR_BEHAVIOR)
  @IsOptional()
  eventQrBehavior?: EVENT_QR_BEHAVIOR;

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

export class CreateEventSessionDto {
  @ApiProperty({ example: 'Morning session' })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ example: 'Main hall' })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: SESSION_STATUS, default: SESSION_STATUS.SCHEDULED })
  @IsEnum(SESSION_STATUS)
  @IsOptional()
  status?: SESSION_STATUS;

  @ApiPropertyOptional({ example: '2026-06-15T07:45:00.000Z' })
  @IsDateString()
  @IsOptional()
  checkinOpensAt?: string;

  @ApiPropertyOptional({ example: '2026-06-15T10:15:00.000Z' })
  @IsDateString()
  @IsOptional()
  checkinClosesAt?: string;
}

export class UpdateEventSessionDto {
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
  startsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: SESSION_STATUS })
  @IsEnum(SESSION_STATUS)
  @IsOptional()
  status?: SESSION_STATUS;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  checkinOpensAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  checkinClosesAt?: string;
}

export class CreateAttendeeFieldDto {
  @ApiProperty({ example: 'department' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'Department' })
  @IsString()
  label!: string;

  @ApiProperty({ enum: FIELD_TYPE })
  @IsEnum(FIELD_TYPE)
  type!: FIELD_TYPE;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ example: { choices: ['Engineering', 'Marketing'] } })
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { minLength: 2, maxLength: 120 } })
  @IsObject()
  @IsOptional()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  position?: number;
}

export class UpdateAttendeeFieldDto {
  @ApiPropertyOptional({ example: 'Department' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ enum: FIELD_TYPE })
  @IsEnum(FIELD_TYPE)
  @IsOptional()
  type?: FIELD_TYPE;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  validation?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

export class CreateConsentPolicyDto {
  @ApiProperty({ example: 'Attendance data consent' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'I agree that my attendance data can be processed for this event.' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateConsentPolicyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

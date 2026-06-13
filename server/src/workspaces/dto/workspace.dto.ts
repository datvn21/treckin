import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  DATA_DELETION_MODE,
  EVENT_VISIBILITY,
  WORKSPACE_MEMBER_ROLE,
} from '@prisma/client';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Acme Events Team' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'acme-events', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Operations workspace for Acme events', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Asia/Bangkok', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 'vi', required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}

export class InviteWorkspaceMemberDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: WORKSPACE_MEMBER_ROLE,
    default: WORKSPACE_MEMBER_ROLE.MEMBER,
    required: false,
  })
  @IsEnum(WORKSPACE_MEMBER_ROLE)
  @IsOptional()
  role?: WORKSPACE_MEMBER_ROLE;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'invite_token' })
  @IsString()
  @MinLength(12)
  token!: string;
}

export class UpdateWorkspaceSettingsDto {
  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  defaultRetentionDays?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  allowPublicEventJoin?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  requireEmailVerification?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowMemberEventView?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  allowViewerReports?: boolean;

  @ApiProperty({ enum: EVENT_VISIBILITY, required: false })
  @IsEnum(EVENT_VISIBILITY)
  @IsOptional()
  defaultEventVisibility?: EVENT_VISIBILITY;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(5)
  @Max(600)
  @IsOptional()
  defaultQrTtlSeconds?: number;

  @ApiProperty({ example: 120, required: false })
  @IsInt()
  @Min(0)
  @Max(3600)
  @IsOptional()
  defaultOfflineGraceSeconds?: number;
}

export class UpdateWorkspacePolicyDto {
  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  memberCanCreateEvents?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  eventManagerCanInviteScanner?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  eventManagerCanExportReports?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  scannerCanSeeAttendeeList?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  scannerCanManualCheckin?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  viewerCanExportReports?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  requireApprovalForEvents?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  requireApprovalForImports?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  requireReasonForManualEdit?: boolean;

  @ApiProperty({ enum: DATA_DELETION_MODE, required: false })
  @IsEnum(DATA_DELETION_MODE)
  @IsOptional()
  dataDeletionMode?: DATA_DELETION_MODE;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  retentionDays?: number;
}

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({ enum: WORKSPACE_MEMBER_ROLE })
  @IsEnum(WORKSPACE_MEMBER_ROLE)
  role!: WORKSPACE_MEMBER_ROLE;
}

export class UpdateWorkspaceDto {
  @ApiProperty({ example: 'Acme Events Team', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'acme-events', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Operations workspace for Acme events', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Asia/Bangkok', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 'vi', required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}


import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsString,
  IsEnum,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CHECKIN_DIRECTION_VALUES } from "../../database/schema/enums";

export const CHECKIN_DIRECTION = Object.fromEntries(
  CHECKIN_DIRECTION_VALUES.map((v) => [v, v]),
) as { [K in (typeof CHECKIN_DIRECTION_VALUES)[number]]: K };

export class OfflineCheckinDto {
  @ApiProperty({ description: "QR code hash / token string" })
  @IsString()
  @IsNotEmpty()
  hash!: string;

  @ApiProperty({ description: "Board ID where check-in was scanned" })
  @IsUUID()
  @IsNotEmpty()
  boardId!: string;

  @ApiProperty({ description: "Timestamp when the scan occurred" })
  @IsDateString()
  @IsNotEmpty()
  scannedAt!: string;

  @ApiPropertyOptional({ enum: CHECKIN_DIRECTION, default: CHECKIN_DIRECTION.IN })
  @IsEnum(CHECKIN_DIRECTION)
  @IsOptional()
  direction?: (typeof CHECKIN_DIRECTION_VALUES)[number];
}

export class BulkSyncDto {
  @ApiProperty({ type: [OfflineCheckinDto], description: "List of offline check-ins to sync" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineCheckinDto)
  checkins!: OfflineCheckinDto[];
}

import { CHECKIN_DIRECTION } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ScanCheckinDto {
  @ApiProperty({ description: "QR hash obtained from scanning" })
  @IsString()
  @IsNotEmpty()
  hash!: string;

  @ApiProperty({ description: "Board ID where the scan is performed" })
  @IsUUID()
  @IsNotEmpty()
  boardId!: string;

  @ApiProperty({ description: "Event ID for the check-in" })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiPropertyOptional({ enum: CHECKIN_DIRECTION, default: CHECKIN_DIRECTION.IN })
  @IsEnum(CHECKIN_DIRECTION)
  @IsOptional()
  direction?: CHECKIN_DIRECTION;

  @ApiPropertyOptional({ description: "Scanner/attendee latitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: "Scanner/attendee longitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

/**
 * Used by the by-short-code endpoint: scanner types the 6-character code
 * displayed on the attendee's screen when the QR cannot be scanned.
 */
export class ShortCodeCheckinDto {
  @ApiProperty({
    description: "6-character short code from attendee credential screen",
    example: "A3X7KP",
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ description: "Board ID where the check-in is performed" })
  @IsUUID()
  @IsNotEmpty()
  boardId!: string;

  @ApiProperty({ description: "Event ID for the check-in" })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiPropertyOptional({ enum: CHECKIN_DIRECTION, default: CHECKIN_DIRECTION.IN })
  @IsEnum(CHECKIN_DIRECTION)
  @IsOptional()
  direction?: CHECKIN_DIRECTION;

  @ApiPropertyOptional({ description: "Scanner latitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: "Scanner longitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class BoardQrCheckinDto {
  @ApiProperty({ description: "Board/event QR token obtained from scanning" })
  @IsString()
  @IsNotEmpty()
  hash!: string;

  @ApiPropertyOptional({ description: "Attendee latitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: "Attendee longitude for geofence validation" })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

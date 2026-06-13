import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SESSION_STATUS } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateEventSessionDto {
  @ApiProperty({ example: "Morning session" })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: "2026-06-15T08:00:00.000Z" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2026-06-15T10:00:00.000Z" })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ example: "Main hall" })
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

  @ApiPropertyOptional({ example: "2026-06-15T07:45:00.000Z" })
  @IsDateString()
  @IsOptional()
  checkinOpensAt?: string;

  @ApiPropertyOptional({ example: "2026-06-15T10:15:00.000Z" })
  @IsDateString()
  @IsOptional()
  checkinClosesAt?: string;
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { SESSION_STATUS } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

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

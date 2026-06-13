import { ApiPropertyOptional } from "@nestjs/swagger";
import { FIELD_TYPE } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class UpdateAttendeeFieldDto {
  @ApiPropertyOptional({ example: "Department" })
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

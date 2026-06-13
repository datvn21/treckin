import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FIELD_TYPE } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateAttendeeFieldDto {
  @ApiProperty({ example: "department" })
  @IsString()
  key!: string;

  @ApiProperty({ example: "Department" })
  @IsString()
  label!: string;

  @ApiProperty({ enum: FIELD_TYPE })
  @IsEnum(FIELD_TYPE)
  type!: FIELD_TYPE;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ example: { choices: ["Engineering", "Marketing"] } })
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

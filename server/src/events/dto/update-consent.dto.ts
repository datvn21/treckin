import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

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

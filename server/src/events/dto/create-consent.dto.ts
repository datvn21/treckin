import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateConsentPolicyDto {
  @ApiProperty({ example: "Attendance data consent" })
  @IsString()
  title!: string;

  @ApiProperty({ example: "I agree that my attendance data can be processed for this event." })
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

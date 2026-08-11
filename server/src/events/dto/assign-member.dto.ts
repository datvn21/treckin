import { ApiProperty } from "@nestjs/swagger";
import { EVENT_ASSIGNMENT_ROLE } from "./enums";
import { IsEnum, IsUUID } from "class-validator";

export class AssignEventMemberDto {
  @ApiProperty({ example: "00000000-0000-0000-0000-000000000000" })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: EVENT_ASSIGNMENT_ROLE })
  @IsEnum(EVENT_ASSIGNMENT_ROLE)
  role!: keyof typeof EVENT_ASSIGNMENT_ROLE;
}

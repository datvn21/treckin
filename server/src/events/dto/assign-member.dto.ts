import { ApiProperty } from "@nestjs/swagger";
import { EVENT_ASSIGNMENT_ROLE } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

export class AssignEventMemberDto {
  @ApiProperty({ example: "user-uuid" })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: [EVENT_ASSIGNMENT_ROLE.MANAGER, EVENT_ASSIGNMENT_ROLE.SCANNER] })
  @IsEnum(EVENT_ASSIGNMENT_ROLE)
  role!: EVENT_ASSIGNMENT_ROLE;
}

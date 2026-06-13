import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class JoinEventDto {
  @ApiProperty({ example: "A1B2C3D4" })
  @IsString()
  joinCode!: string;
}

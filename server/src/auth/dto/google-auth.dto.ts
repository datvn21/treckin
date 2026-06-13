import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GoogleAuthDto {
  @ApiProperty({
    description: "Google OAuth credential (ID token from Google Sign-In)",
    example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;
}

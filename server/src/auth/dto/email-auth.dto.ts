import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";
import { USER_ROLE_VALUES } from "../../database/schema/enums";

export const USER_ROLE = Object.fromEntries(
  USER_ROLE_VALUES.map((v) => [v, v]),
) as { [K in (typeof USER_ROLE_VALUES)[number]]: K };

/** Roles that can be self-assigned during registration (excludes ADMIN) */
const REGISTRABLE_ROLES = [USER_ROLE.USER] as const;
type RegistrableRole = (typeof REGISTRABLE_ROLES)[number];

export class RegisterDto {
  @ApiProperty({ example: "Nguyen Van A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "strong-password" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ enum: REGISTRABLE_ROLES, example: USER_ROLE.USER })
  @IsEnum(REGISTRABLE_ROLES)
  @IsOptional()
  role?: RegistrableRole;
}

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "strong-password" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

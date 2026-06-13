import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { LoginDto, RegisterDto } from "./dto/email-auth.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("google")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with Google OAuth credential" })
  @ApiResponse({ status: 200, description: "Login successful, returns user and tokens" })
  @ApiResponse({ status: 401, description: "Invalid credential" })
  async googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.authenticateWithGoogle(dto.credential);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register with email and password" })
  @ApiResponse({ status: 201, description: "Registration successful, returns user and tokens" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful, returns user and tokens" })
  @ApiResponse({ status: 401, description: "Invalid email or password" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

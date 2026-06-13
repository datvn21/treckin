import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Patch('users/me/avatar')
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiConsumes('multipart/form-data')
  async uploadUserAvatar(
    @Req() req: FastifyRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    const { buffer, mimeType, fileSize } = await this.parseFile(req);
    return this.uploadService.uploadUserAvatar(user.sub, buffer, mimeType, fileSize);
  }

  @Patch('workspaces/:id/avatar')
  @ApiOperation({ summary: 'Upload workspace logo (OWNER/ADMIN only)' })
  @ApiConsumes('multipart/form-data')
  async uploadWorkspaceAvatar(
    @Req() req: FastifyRequest,
    @Param('id', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const { buffer, mimeType, fileSize } = await this.parseFile(req);
    return this.uploadService.uploadWorkspaceAvatar(
      workspaceId,
      user.sub,
      buffer,
      mimeType,
      fileSize,
    );
  }

  // ── Multipart parsing helper ────────────────────────────────────

  private async parseFile(
    req: FastifyRequest,
  ): Promise<{ buffer: Buffer; mimeType: string; fileSize: number }> {
    const file = await (req as any).file();

    if (!file) {
      throw new BadRequestException('No file uploaded. Send a multipart/form-data request with a "file" field.');
    }

    const buffer = await file.toBuffer();
    const mimeType: string = file.mimetype;
    const fileSize: number = buffer.length;

    return { buffer, mimeType, fileSize };
  }
}

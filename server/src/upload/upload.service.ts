import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WORKSPACE_MEMBER_ROLE } from '@prisma/client';

/** Allowed MIME types for avatar uploads */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Max file size in bytes (2 MB) */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Upload or replace the current user's avatar.
   */
  async uploadUserAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    fileSize: number,
  ): Promise<{ avatarUrl: string }> {
    this.validateFile(mimeType, fileSize);

    // Fetch current user to get old avatar key
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Upload new avatar
    const result = await this.storage.uploadAvatar(buffer, 'user', userId);

    // Update DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.publicUrl },
    });

    // Cleanup old avatar (best-effort, only if it was our upload)
    this.cleanupOldAvatar(user.avatarUrl, result.key);

    this.logger.log(`User avatar updated: ${userId}`);
    return { avatarUrl: result.publicUrl };
  }

  /**
   * Upload or replace a workspace logo.
   * Only OWNER or ADMIN may do this.
   */
  async uploadWorkspaceAvatar(
    workspaceId: string,
    userId: string,
    buffer: Buffer,
    mimeType: string,
    fileSize: number,
  ): Promise<{ logoUrl: string }> {
    this.validateFile(mimeType, fileSize);

    // Permission check
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Workspace access denied');
    if (
      member.role !== WORKSPACE_MEMBER_ROLE.OWNER &&
      member.role !== WORKSPACE_MEMBER_ROLE.ADMIN
    ) {
      throw new ForbiddenException('Workspace admin permission required');
    }

    // Fetch current workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { logoUrl: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Upload
    const result = await this.storage.uploadAvatar(buffer, 'workspace', workspaceId);

    // Update DB
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { logoUrl: result.publicUrl },
    });

    // Cleanup old
    this.cleanupOldAvatar(workspace.logoUrl, result.key);

    this.logger.log(`Workspace avatar updated: ${workspaceId}`);
    return { logoUrl: result.publicUrl };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private validateFile(mimeType: string, fileSize: number): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Best-effort cleanup of previous avatar from storage.
   * Only attempts deletion if the old URL looks like it came from our storage
   * (contains 'avatars/' path), to avoid deleting external URLs like Google profile pics.
   */
  private cleanupOldAvatar(oldUrl: string | null, newKey: string): void {
    if (!oldUrl || !oldUrl.includes('avatars/')) return;

    // Extract key from URL — find 'avatars/' and take everything after
    const idx = oldUrl.indexOf('avatars/');
    if (idx === -1) return;
    const oldKey = oldUrl.substring(idx);

    // Don't delete if it's the same key (unlikely but safe)
    if (oldKey === newKey) return;

    this.storage.deleteAvatar(oldKey).catch((err) => {
      this.logger.warn(`Failed to cleanup old avatar: ${oldKey}`, err);
    });
  }
}

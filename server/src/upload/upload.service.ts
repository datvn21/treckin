import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { users, workspaceMembers, workspaces } from "../database/schema";
import { StorageService } from "../storage/storage.service";

/** Allowed MIME types for avatar uploads */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Max file size in bytes (2 MB) */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly db: DatabaseService,
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

    const [user] = await this.db.db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");

    const result = await this.storage.uploadAvatar(buffer, "user", userId);

    await this.db.db
      .update(users)
      .set({ avatarUrl: result.publicUrl })
      .where(eq(users.id, userId));

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

    const [member] = await this.db.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Workspace access denied");
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new ForbiddenException("Workspace admin permission required");
    }

    const [workspace] = await this.db.db
      .select({ logoUrl: workspaces.logoUrl })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!workspace) throw new NotFoundException("Workspace not found");

    const result = await this.storage.uploadAvatar(buffer, "workspace", workspaceId);

    await this.db.db
      .update(workspaces)
      .set({ logoUrl: result.publicUrl })
      .where(eq(workspaces.id, workspaceId));

    this.cleanupOldAvatar(workspace.logoUrl, result.key);

    this.logger.log(`Workspace avatar updated: ${workspaceId}`);
    return { logoUrl: result.publicUrl };
  }

  private validateFile(mimeType: string, fileSize: number): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
      );
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  private cleanupOldAvatar(oldUrl: string | null, newKey: string): void {
    if (!oldUrl || !oldUrl.includes("avatars/")) return;

    const idx = oldUrl.indexOf("avatars/");
    if (idx === -1) return;
    const oldKey = oldUrl.substring(idx);

    if (oldKey === newKey) return;

    this.storage.deleteAvatar(oldKey).catch((err) => {
      this.logger.warn(`Failed to cleanup old avatar: ${oldKey}`, err);
    });
  }
}

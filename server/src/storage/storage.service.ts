import { Inject, Injectable, Logger } from "@nestjs/common";
import * as sharp from "sharp";
import { STORAGE_PROVIDER, type StorageProvider, type UploadResult } from "./storage.interface";

/** Avatar output config */
const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 80;
const AVATAR_MAX_BYTES = 256 * 1024; // 256 KB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: StorageProvider,
  ) {}

  /**
   * Optimize an image buffer and upload it as an avatar.
   * Pipeline: resize → WebP → upload to active provider.
   */
  async uploadAvatar(
    buffer: Buffer,
    entityType: "user" | "workspace",
    entityId: string,
  ): Promise<UploadResult> {
    const optimized = await this.optimizeAvatar(buffer);
    const timestamp = Date.now();
    const filename = `${entityId}-${timestamp}.webp`;

    return this.provider.upload(optimized, {
      folder: `avatars/${entityType}`,
      filename,
      mimeType: "image/webp",
    });
  }

  /**
   * Delete a previously uploaded avatar by its storage key.
   */
  async deleteAvatar(key: string): Promise<void> {
    await this.provider.delete(key);
  }

  /**
   * Optimize image: resize to square, convert to WebP.
   */
  private async optimizeAvatar(buffer: Buffer): Promise<Buffer> {
    const optimized = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: AVATAR_QUALITY })
      .toBuffer();

    if (optimized.length > AVATAR_MAX_BYTES) {
      this.logger.warn(
        `Avatar exceeds ${AVATAR_MAX_BYTES}B after optimization (${optimized.length}B), re-compressing`,
      );
      return sharp(optimized)
        .webp({ quality: Math.round(AVATAR_QUALITY * 0.7) })
        .toBuffer();
    }

    return optimized;
  }
}

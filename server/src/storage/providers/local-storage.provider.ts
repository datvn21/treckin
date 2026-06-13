import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import type { StorageProvider, UploadOptions, UploadResult } from "../storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly publicDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.publicDir = path.resolve(process.cwd(), "public");
    this.baseUrl = this.config
      .get<string>("LOCAL_STORAGE_BASE_URL", "http://localhost:4000")
      .replace(/\/+$/, "");
    this.logger.log(`Local storage provider initialized. Directory: ${this.publicDir}`);
  }

  async upload(buffer: Buffer, opts: UploadOptions): Promise<UploadResult> {
    const key = `${opts.folder}/${opts.filename}`;
    const filePath = path.join(this.publicDir, key);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    const publicUrl = `${this.baseUrl}/public/${key}`;
    this.logger.log(`Uploaded locally: ${key} -> ${filePath}`);

    return {
      publicUrl,
      key,
      provider: "local",
    };
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.publicDir, key);
      await fs.unlink(filePath);
      this.logger.log(`Deleted locally: ${key}`);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        this.logger.warn(`Failed to delete locally: ${key}`, error);
      }
    }
  }
}

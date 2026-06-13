import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { StorageProvider, UploadOptions, UploadResult } from "../storage.interface";

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.config.getOrThrow<string>("CLOUDINARY_API_KEY"),
      api_secret: this.config.getOrThrow<string>("CLOUDINARY_API_SECRET"),
    });

    this.logger.log("Cloudinary storage provider initialized");
  }

  async upload(buffer: Buffer, opts: UploadOptions): Promise<UploadResult> {
    const publicId = `${opts.folder}/${opts.filename.replace(/\.[^.]+$/, "")}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "image",
          overwrite: true,
          invalidate: true,
          format: "webp",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload returned no result"));
          } else {
            resolve(result);
          }
        },
      );

      stream.end(buffer);
    });

    this.logger.log(`Uploaded to Cloudinary: ${result.public_id}`);

    return {
      publicUrl: result.secure_url,
      key: result.public_id,
      provider: "cloudinary",
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key, { resource_type: "image" });
      this.logger.log(`Deleted from Cloudinary: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete from Cloudinary: ${key}`, error);
    }
  }
}

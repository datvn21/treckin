import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { StorageProvider, UploadOptions, UploadResult } from '../storage.interface';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicUrl = this.config
      .getOrThrow<string>('R2_PUBLIC_URL')
      .replace(/\/+$/, '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });

    this.logger.log('R2 storage provider initialized');
  }

  async upload(buffer: Buffer, opts: UploadOptions): Promise<UploadResult> {
    const key = `${opts.folder}/${opts.filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const publicUrl = `${this.publicUrl}/${key}`;
    this.logger.log(`Uploaded to R2: ${key}`);

    return { publicUrl, key, provider: 'r2' };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted from R2: ${key}`);
    } catch (error) {
      // S3 DeleteObject is idempotent — log but don't throw
      this.logger.warn(`Failed to delete from R2: ${key}`, error);
    }
  }
}

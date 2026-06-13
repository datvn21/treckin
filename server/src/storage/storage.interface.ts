// ── Storage Provider — Strategy Pattern Interface ─────────────────────
// Each concrete provider (R2, Cloudinary) implements this contract.
// The active provider is selected at runtime via STORAGE_PROVIDER env.

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface UploadResult {
  /** Publicly accessible CDN URL */
  publicUrl: string;
  /** Storage key or public_id (used for deletion) */
  key: string;
  /** Which provider handled the upload */
  provider: 'r2' | 'cloudinary' | 'local';
}

export interface UploadOptions {
  folder: string;
  filename: string;
  mimeType: string;
}

export interface StorageProvider {
  /**
   * Upload a buffer to the storage backend.
   * @returns public URL and storage key
   */
  upload(buffer: Buffer, opts: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a previously uploaded object by its key.
   * Silently succeeds if the key does not exist.
   */
  delete(key: string): Promise<void>;
}

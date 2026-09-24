import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.S3_BUCKET_NAME;
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Necessary for MinIO compatibility
    });
  }

  /**
   * Stream / upload file buffer to S3 / MinIO storage.
   */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });
      await this.client.send(command);
    } catch (error: any) {
      logger.error('Failed to upload file to S3 storage', { key, error: error.message });
      throw new AppError(
        502,
        'STORAGE_PROVIDER_ERROR',
        'Storage provider rejected or failed to persist the validated media object.'
      );
    }
  }

  /**
   * Best-effort cleanup (delete file) from S3 / MinIO storage when database operations fail.
   */
  async deleteFile(key: string, requestId?: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      logger.info('Successfully cleaned up orphaned storage object', { key, requestId });
    } catch (error: any) {
      // Log silently with requestId and key without throwing or exposing to client
      logger.error('Failed best-effort storage object cleanup', {
        key,
        requestId,
        error: error.message,
      });
    }
  }
}

export const storageService = new StorageService();

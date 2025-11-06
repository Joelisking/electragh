import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export interface ImageUploadResult {
  success: boolean;
  url: string;
  key?: string;
  error?: string;
}

export interface ImageStorageService {
  uploadImage(
    file: Buffer,
    filename: string,
    folder: string
  ): Promise<ImageUploadResult>;
  deleteImage(url: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

// Local file storage implementation (fallback)
class LocalImageStorageService implements ImageStorageService {
  private basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'uploads');
  }

  async uploadImage(
    file: Buffer,
    filename: string,
    folder: string
  ): Promise<ImageUploadResult> {
    try {
      const folderPath = path.join(this.basePath, folder);
      const filePath = path.join(folderPath, filename);

      // Ensure directory exists
      await fs.mkdir(folderPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, file as Uint8Array);

      // Return local URL
      const url = `/uploads/${folder}/${filename}`;

      logger.info(`Image uploaded locally: ${url}`);

      return {
        success: true,
        url,
      };
    } catch (error) {
      logger.error('Local image upload failed:', error);
      return {
        success: false,
        url: '',
        error:
          error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async deleteImage(url: string): Promise<boolean> {
    try {
      if (!url.startsWith('/uploads/')) {
        return false;
      }

      const filePath = path.join(process.cwd(), url);
      await fs.unlink(filePath);

      logger.info(`Local image deleted: ${url}`);
      return true;
    } catch (error) {
      logger.error('Local image deletion failed:', error);
      return false;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // For local storage, just return the direct URL
    return `/uploads/${key}`;
  }
}

// S3-compatible storage implementation (AWS S3 or MinIO)
class S3CompatibleStorageService implements ImageStorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private cdnBaseUrl?: string;
  private endpoint?: string;
  private isMinIO: boolean;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET!;
    this.region = process.env.AWS_REGION!;
    this.cdnBaseUrl = process.env.CDN_BASE_URL;
    this.endpoint = process.env.S3_ENDPOINT;
    this.isMinIO = process.env.STORAGE_PROVIDER === 'minio';

    const clientConfig: any = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    // Add endpoint for MinIO
    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async uploadImage(
    file: Buffer,
    filename: string,
    folder: string
  ): Promise<ImageUploadResult> {
    try {
      const key = `${folder}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: 'image/webp',
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      let url: string;
      if (this.isMinIO) {
        // For MinIO, use the endpoint directly
        url = `${this.endpoint}/${this.bucket}/${key}`;
      } else {
        // For AWS S3, use CDN or direct S3 URL
        url = this.cdnBaseUrl
          ? `${this.cdnBaseUrl}/${key}`
          : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      }

      logger.info(
        `Image uploaded to ${this.isMinIO ? 'MinIO' : 'S3'}: ${url}`
      );

      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      logger.error(
        `${this.isMinIO ? 'MinIO' : 'S3'} image upload failed:`,
        error
      );
      return {
        success: false,
        url: '',
        error:
          error instanceof Error
            ? error.message
            : `${this.isMinIO ? 'MinIO' : 'S3'} upload failed`,
      };
    }
  }

  async deleteImage(url: string): Promise<boolean> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(url);
      if (!key) return false;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info(
        `${this.isMinIO ? 'MinIO' : 'S3'} image deleted: ${key}`
      );
      return true;
    } catch (error) {
      logger.error(
        `${this.isMinIO ? 'MinIO' : 'S3'} image deletion failed:`,
        error
      );
      return false;
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      return '';
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    if (
      this.isMinIO &&
      this.endpoint &&
      url.startsWith(this.endpoint)
    ) {
      return url.replace(`${this.endpoint}/${this.bucket}/`, '');
    }

    if (this.cdnBaseUrl && url.startsWith(this.cdnBaseUrl)) {
      return url.replace(this.cdnBaseUrl + '/', '');
    }

    const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (url.startsWith(s3Url)) {
      return url.replace(s3Url, '');
    }

    return null;
  }
}

// Factory function to create the appropriate storage service
export function createImageStorageService(): ImageStorageService {
  const storageProvider = process.env.STORAGE_PROVIDER || 'minio';

  if (storageProvider === 's3' || storageProvider === 'minio') {
    // Validate required environment variables
    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
      'AWS_REGION',
    ];

    // For MinIO, also check endpoint
    if (storageProvider === 'minio') {
      requiredEnvVars.push('S3_ENDPOINT');
    }

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      logger.warn(
        `Missing ${storageProvider.toUpperCase()} environment variables: ${missingVars.join(
          ', '
        )}. Falling back to local storage.`
      );
      return new LocalImageStorageService();
    }

    return new S3CompatibleStorageService();
  }

  return new LocalImageStorageService();
}

// Export convenience functions
const imageStorageService = createImageStorageService();

export const uploadCandidateImage = (
  file: Buffer,
  filename: string
) => imageStorageService.uploadImage(file, filename, 'candidates');

export const deleteCandidateImage = (url: string) =>
  imageStorageService.deleteImage(url);

export const getCandidateImageUrl = (
  key: string,
  expiresIn?: number
) => imageStorageService.getSignedUrl(key, expiresIn);

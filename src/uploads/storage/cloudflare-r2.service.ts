import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class CloudflareR2Service {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID ?? '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';

    this.bucketName = process.env.R2_BUCKET_NAME ?? '';
    this.publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(
      /\/+$/,
      '',
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private getFileExtension(file: Express.Multer.File): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif',
    };

    return extensions[file.mimetype] ?? '.jpg';
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ]);

    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported image type. Use JPEG, PNG, WebP, or AVIF.',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'Image is too large. Maximum size is 10MB.',
      );
    }
  }

  buildObjectKey(file: Express.Multer.File, prefix = 'uploads'): string {
    this.validateFile(file);

    const safePrefix = prefix
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..')
      .join('/');

    if (!safePrefix) {
      throw new BadRequestException('Invalid storage prefix');
    }

    return `${safePrefix}/${randomUUID()}${this.getFileExtension(file)}`;
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    this.validateFile(file);

    if (!this.bucketName) {
      throw new InternalServerErrorException(
        'Cloudflare R2 bucket is not configured',
      );
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'Failed to upload image to Cloudflare R2',
      );
    }

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`;
    }

    return `https://${this.bucketName}.r2.cloudflarestorage.com/${key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }

  async delete(key: string): Promise<void> {
    if (!key) {
      return;
    }

    if (!this.bucketName) {
      throw new InternalServerErrorException(
        'Cloudflare R2 bucket is not configured',
      );
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getObjectKeyFromUrl(url: string): string | null {
    if (!url || !this.publicBaseUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);
      const baseUrl = new URL(this.publicBaseUrl);

      if (
        parsedUrl.origin !== baseUrl.origin ||
        parsedUrl.search ||
        parsedUrl.hash
      ) {
        return null;
      }

      const basePath = baseUrl.pathname.replace(/\/+$/, '');
      const objectPath = parsedUrl.pathname;

      if (!objectPath.startsWith(`${basePath}/`)) {
        return null;
      }

      const encodedKey = objectPath.slice(basePath.length + 1);

      if (!encodedKey) {
        return null;
      }

      const key = encodedKey
        .split('/')
        .map((part) => decodeURIComponent(part))
        .join('/');

      if (
        !key ||
        key.split('/').some((part) => !part || part === '.' || part === '..')
      ) {
        return null;
      }

      return key;
    } catch {
      return null;
    }
  }
}

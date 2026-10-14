import { Injectable } from '@nestjs/common';
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
      /\/$/,
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
    const safeName = (file.originalname ?? 'file').split('.');
    const ext = safeName.pop()?.toLowerCase() ?? 'jpg';
    return ext && ext !== 'file' ? `.${ext}` : '.jpg';
  }

  validateFile(file: Express.Multer.File): void {
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new Error('Unsupported image type. Use JPEG, PNG, WebP, or AVIF.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image is too large. Max size is 10MB.');
    }
  }

  buildObjectKey(file: Express.Multer.File, prefix = 'uploads'): string {
    const ext = this.getFileExtension(file);
    return `${prefix}/${randomUUID()}${ext}`;
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    this.validateFile(file);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    if (!this.publicBaseUrl) {
      return `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`;
    }

    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    if (!key) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }
}

/**
 * AWS S3 Storage Service
 * 
 * Handles file uploads, downloads, and management in AWS S3
 */

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import axios from 'axios';
import { createHash } from 'crypto';

export interface S3UploadResult {
  bucket: string;
  key: string;
  url: string;
  cdnUrl?: string;
  etag?: string;
  size?: number;
}

export interface S3UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  public?: boolean;
  metadata?: Record<string, string>;
}

export class S3StorageService {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private cdnUrl?: string;

  constructor() {
    this.region = process.env.AWS_S3_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'real-estate-crm-properties';
    this.cdnUrl = process.env.AWS_CLOUDFRONT_URL;

    // Initialize S3 client
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload file buffer to S3
   */
  async uploadBuffer(
    buffer: Buffer,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult> {
    const {
      folder = 'properties',
      filename = this.generateFilename(),
      contentType = 'image/jpeg',
      public: isPublic = true,
      metadata = {},
    } = options;

    const key = folder ? `${folder}/${filename}` : filename;

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: isPublic ? 'public-read' : 'private',
          Metadata: metadata,
        },
      });

      const result = await upload.done();

      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      const cdnUrl = this.cdnUrl ? `${this.cdnUrl}/${key}` : undefined;

      return {
        bucket: this.bucket,
        key,
        url: s3Url,
        cdnUrl,
        etag: result.ETag,
      };
    } catch (error) {
      console.error(`Error uploading to S3:`, error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Upload file from URL
   */
  async uploadFromUrl(
    url: string,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult> {
    try {
      // Download file from URL
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds
        maxContentLength: 50 * 1024 * 1024, // 50MB limit
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'image/jpeg';

      // Generate filename from URL or hash
      const filename = options.filename || this.generateFilenameFromUrl(url);

      // Upload to S3
      return await this.uploadBuffer(buffer, {
        ...options,
        filename,
        contentType,
      });
    } catch (error) {
      console.error(`Error downloading/uploading from URL ${url}:`, error);
      throw new Error(`Failed to upload from URL: ${error}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      console.log(`✅ Deleted file from S3: ${key}`);
    } catch (error) {
      console.error(`Error deleting file from S3: ${key}`, error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Generate unique filename
   */
  private generateFilename(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.jpg`;
  }

  /**
   * Generate filename from URL
   */
  private generateFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'image.jpg';
      
      // If filename has no extension, add .jpg
      if (!filename.includes('.')) {
        return `${filename}.jpg`;
      }
      
      return filename;
    } catch {
      // If URL parsing fails, generate hash-based filename
      const hash = createHash('md5').update(url).digest('hex').substring(0, 16);
      return `${hash}.jpg`;
    }
  }

  /**
   * Get S3 configuration info
   */
  getConfig(): { bucket: string; region: string; cdnUrl?: string } {
    return {
      bucket: this.bucket,
      region: this.region,
      cdnUrl: this.cdnUrl,
    };
  }
}

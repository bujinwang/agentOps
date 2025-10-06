/**
 * Image Processing Service
 * 
 * Handles image optimization, resizing, and format conversion using Sharp
 */

import sharp from 'sharp';
import axios from 'axios';

export interface ImageVariants {
  original?: Buffer;
  thumbnail?: Buffer;
  medium?: Buffer;
  large?: Buffer;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  metadata: ImageMetadata;
}

export class ImageProcessingService {
  // Image size configurations
  private static readonly SIZES = {
    thumbnail: { width: 200, height: 150 },
    medium: { width: 800, height: 600 },
    large: { width: 1920, height: 1440 },
  };

  /**
   * Download image from URL
   */
  async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // 50MB
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error downloading image from ${url}:`, error);
      throw new Error(`Failed to download image: ${error}`);
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error}`);
    }
  }

  /**
   * Optimize image (compress and convert to WebP)
   */
  async optimize(buffer: Buffer, quality: number = 80): Promise<ProcessedImage> {
    try {
      const processed = await sharp(buffer)
        .webp({ quality })
        .toBuffer();

      const metadata = await this.getMetadata(processed);

      return {
        buffer: processed,
        metadata,
      };
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error}`);
    }
  }

  /**
   * Resize image to specific dimensions
   */
  async resize(
    buffer: Buffer,
    width: number,
    height: number,
    fit: 'cover' | 'contain' | 'fill' = 'cover'
  ): Promise<ProcessedImage> {
    try {
      const processed = await sharp(buffer)
        .resize(width, height, {
          fit,
          withoutEnlargement: true, // Don't upscale small images
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const metadata = await this.getMetadata(processed);

      return {
        buffer: processed,
        metadata,
      };
    } catch (error) {
      throw new Error(`Failed to resize image: ${error}`);
    }
  }

  /**
   * Generate all image variants (thumbnail, medium, large)
   */
  async generateVariants(buffer: Buffer): Promise<{
    thumbnail: ProcessedImage;
    medium: ProcessedImage;
    large: ProcessedImage;
  }> {
    try {
      const [thumbnail, medium, large] = await Promise.all([
        this.resize(
          buffer,
          ImageProcessingService.SIZES.thumbnail.width,
          ImageProcessingService.SIZES.thumbnail.height
        ),
        this.resize(
          buffer,
          ImageProcessingService.SIZES.medium.width,
          ImageProcessingService.SIZES.medium.height
        ),
        this.resize(
          buffer,
          ImageProcessingService.SIZES.large.width,
          ImageProcessingService.SIZES.large.height
        ),
      ]);

      return {
        thumbnail,
        medium,
        large,
      };
    } catch (error) {
      throw new Error(`Failed to generate image variants: ${error}`);
    }
  }

  /**
   * Process property image from URL
   * Downloads, optimizes, and generates variants
   */
  async processPropertyImage(url: string): Promise<{
    original: ProcessedImage;
    variants: {
      thumbnail: ProcessedImage;
      medium: ProcessedImage;
      large: ProcessedImage;
    };
  }> {
    try {
      console.log(`📸 Processing image from: ${url}`);

      // Download original
      const originalBuffer = await this.downloadImage(url);

      // Optimize original
      const original = await this.optimize(originalBuffer, 90);

      console.log(`✅ Original image processed: ${original.metadata.width}x${original.metadata.height} (${Math.round(original.metadata.size / 1024)}KB)`);

      // Generate variants
      const variants = await this.generateVariants(originalBuffer);

      console.log(`✅ Generated variants: thumbnail (${variants.thumbnail.metadata.width}x${variants.thumbnail.metadata.height}), medium (${variants.medium.metadata.width}x${variants.medium.metadata.height}), large (${variants.large.metadata.width}x${variants.large.metadata.height})`);

      return {
        original,
        variants,
      };
    } catch (error) {
      console.error(`❌ Failed to process property image:`, error);
      throw error;
    }
  }

  /**
   * Validate if buffer is a valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      await sharp(buffer).metadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert image to specific format
   */
  async convertFormat(
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<ProcessedImage> {
    try {
      let processed: Buffer;

      switch (format) {
        case 'jpeg':
          processed = await sharp(buffer).jpeg({ quality }).toBuffer();
          break;
        case 'png':
          processed = await sharp(buffer).png({ quality }).toBuffer();
          break;
        case 'webp':
          processed = await sharp(buffer).webp({ quality }).toBuffer();
          break;
      }

      const metadata = await this.getMetadata(processed);

      return {
        buffer: processed,
        metadata,
      };
    } catch (error) {
      throw new Error(`Failed to convert image format: ${error}`);
    }
  }
}

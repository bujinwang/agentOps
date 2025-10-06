import { query } from '../config/database';

export interface PropertyMedia {
  mediaId: number;
  propertyId: number;
  mediaType: string;
  mediaUrl: string;
  
  // S3 Storage
  s3Bucket: string | null;
  s3Key: string | null;
  s3Url: string | null;
  
  // Image Variants
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  
  // Metadata
  displayOrder: number;
  caption: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  
  // Processing Status
  processingStatus: string;
  processingError: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyMediaCreate {
  propertyId: number;
  mediaType?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  displayOrder?: number;
  caption?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  metadata?: string;
}

export interface PropertyMediaUpdate {
  s3Bucket?: string;
  s3Key?: string;
  s3Url?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  displayOrder?: number;
  caption?: string;
  processingStatus?: string;
  processingError?: string;
}

export class PropertyMediaModel {
  static async create(mediaData: PropertyMediaCreate): Promise<PropertyMedia> {
    const result = await query(
      `INSERT INTO property_media (
        property_id, media_type, media_url, display_order, caption,
        width, height, file_size, processing_status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
      RETURNING *`,
      [
        mediaData.propertyId,
        mediaData.mediaType || 'image',
        mediaData.mediaUrl,
        mediaData.displayOrder || 0,
        mediaData.caption || null,
        mediaData.width || null,
        mediaData.height || null,
        mediaData.fileSize || null,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findById(mediaId: number): Promise<PropertyMedia | null> {
    const result = await query(
      'SELECT * FROM property_media WHERE media_id = $1',
      [mediaId]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByPropertyId(propertyId: number): Promise<PropertyMedia[]> {
    const result = await query(
      'SELECT * FROM property_media WHERE property_id = $1 ORDER BY display_order ASC',
      [propertyId]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async findPendingProcessing(limit: number = 100): Promise<PropertyMedia[]> {
    const result = await query(
      `SELECT * FROM property_media 
       WHERE processing_status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  static async update(mediaId: number, updateData: PropertyMediaUpdate): Promise<PropertyMedia | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findById(mediaId);
    }

    updates.push(`updated_at = NOW()`);
    params.push(mediaId);

    const result = await query(
      `UPDATE property_media 
       SET ${updates.join(', ')}
       WHERE media_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async batchCreate(mediaList: PropertyMediaCreate[]): Promise<PropertyMedia[]> {
    const created: PropertyMedia[] = [];

    for (const mediaData of mediaList) {
      const media = await this.create(mediaData);
      created.push(media);
    }

    return created;
  }

  static async delete(mediaId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM property_media WHERE media_id = $1',
      [mediaId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  static async deleteByPropertyId(propertyId: number): Promise<number> {
    const result = await query(
      'DELETE FROM property_media WHERE property_id = $1',
      [propertyId]
    );

    return result.rowCount || 0;
  }

  private static mapRow(row: any): PropertyMedia {
    return {
      mediaId: row.media_id,
      propertyId: row.property_id,
      mediaType: row.media_type,
      mediaUrl: row.media_url,
      s3Bucket: row.s3_bucket,
      s3Key: row.s3_key,
      s3Url: row.s3_url,
      thumbnailUrl: row.thumbnail_url,
      mediumUrl: row.medium_url,
      largeUrl: row.large_url,
      displayOrder: row.display_order,
      caption: row.caption,
      width: row.width,
      height: row.height,
      fileSize: row.file_size ? parseInt(row.file_size, 10) : null,
      processingStatus: row.processing_status,
      processingError: row.processing_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

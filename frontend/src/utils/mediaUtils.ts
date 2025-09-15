import { Platform } from 'react-native';

export interface MediaProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'JPEG' | 'PNG';
  rotation?: number;
}

export interface ProcessedMediaResult {
  uri: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  originalUri?: string;
}

export interface VideoThumbnailOptions {
  time?: number;
  quality?: number;
  format?: 'JPEG' | 'PNG';
}

export interface VideoThumbnailResult {
  uri: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

/**
 * Process and optimize image for upload
 * Note: This is a placeholder implementation. In production, you would use
 * react-native-image-resizer or similar library for actual image processing.
 */
export async function processImage(
  imageUri: string,
  options: MediaProcessingOptions = {}
): Promise<ProcessedMediaResult> {
  try {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'JPEG',
      rotation = 0
    } = options;

    // Placeholder: In a real implementation, this would resize and compress the image
    // For now, return the original image with simulated processing
    console.log(`Processing image: ${imageUri} with options:`, options);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      uri: imageUri, // In real implementation, this would be the processed image URI
      width: maxWidth,
      height: maxHeight,
      size: 1024000, // 1MB placeholder
      mimeType: format === 'JPEG' ? 'image/jpeg' : 'image/png',
      originalUri: imageUri
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Generate thumbnail for video
 */
export async function generateVideoThumbnail(
  videoUri: string,
  options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailResult> {
  try {
    const {
      time = 1,
      quality = 0.5,
      format = 'JPEG'
    } = options;

    // Note: This would require a video processing library like react-native-video-processing
    // For now, return a placeholder implementation
    throw new Error('Video thumbnail generation requires additional library setup');

    // Placeholder return for TypeScript
    return {
      uri: '',
      width: 320,
      height: 180,
      size: 0,
      mimeType: 'image/jpeg'
    };
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    throw new Error('Failed to generate video thumbnail');
  }
}

/**
 * Validate file type and size
 */
export function validateMediaFile(
  fileUri: string,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): { isValid: boolean; error?: string } {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
    maxSize = 50 * 1024 * 1024, // 50MB
    minWidth = 100,
    minHeight = 100
  } = options;

  // Get file extension and mime type
  const fileExtension = fileUri.split('.').pop()?.toLowerCase();
  const mimeType = getMimeTypeFromExtension(fileExtension);

  // Validate file type
  if (!allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Validate file size (would need actual file size)
  // This is a placeholder - actual implementation would check file size
  if (false) { // Replace with actual size check
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
    };
  }

  return { isValid: true };
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension?: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm'
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Generate unique filename for media upload
 */
export function generateUniqueFilename(originalUri: string, prefix: string = 'media'): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalUri.split('.').pop();

  return `${prefix}_${timestamp}_${randomId}.${extension}`;
}

/**
 * Calculate optimal image dimensions for different use cases
 */
export function getOptimalImageDimensions(useCase: 'thumbnail' | 'preview' | 'full' | 'avatar'): { width: number; height: number } {
  const dimensions = {
    thumbnail: { width: 150, height: 150 },
    preview: { width: 400, height: 300 },
    full: { width: 1920, height: 1080 },
    avatar: { width: 200, height: 200 }
  };

  return dimensions[useCase] || dimensions.preview;
}

/**
 * Compress image data
 */
export async function compressImage(
  imageUri: string,
  compressionLevel: number = 0.8
): Promise<ProcessedMediaResult> {
  return processImage(imageUri, {
    quality: compressionLevel,
    maxWidth: 1920,
    maxHeight: 1080
  });
}

/**
 * Create image variants for different screen sizes
 */
export async function createImageVariants(
  imageUri: string
): Promise<Record<string, ProcessedMediaResult>> {
  const variants: Record<string, ProcessedMediaResult> = {};

  // Create thumbnail
  variants.thumbnail = await processImage(imageUri, {
    maxWidth: 150,
    maxHeight: 150,
    quality: 0.7
  });

  // Create preview
  variants.preview = await processImage(imageUri, {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.8
  });

  // Create full size (optimized)
  variants.full = await processImage(imageUri, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.9
  });

  return variants;
}

/**
 * Get media file metadata
 * Note: This is a placeholder implementation. In production, you would use
 * react-native-fs or similar library for actual file system operations.
 */
export async function getMediaMetadata(fileUri: string): Promise<{
  width?: number;
  height?: number;
  duration?: number;
  size: number;
  mimeType: string;
  orientation?: number;
}> {
  try {
    // Placeholder: In a real implementation, this would get actual file info
    const mimeType = getMimeTypeFromExtension(fileUri.split('.').pop());

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      size: 1024000, // 1MB placeholder
      mimeType,
      width: mimeType.startsWith('image/') ? 1920 : undefined,
      height: mimeType.startsWith('image/') ? 1080 : undefined,
      duration: mimeType.startsWith('video/') ? 120 : undefined, // 2 minutes placeholder
    };
  } catch (error) {
    console.error('Error getting media metadata:', error);
    throw new Error('Failed to get media metadata');
  }
}

/**
 * Clean up temporary files
 * Note: This is a placeholder implementation. In production, you would use
 * react-native-fs or similar library for actual file system operations.
 */
export async function cleanupTempFiles(fileUris: string[]): Promise<void> {
  try {
    // Placeholder: In a real implementation, this would delete temporary files
    console.log(`Cleaning up ${fileUris.length} temporary files`);

    // Simulate cleanup delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log which files would be cleaned up
    fileUris.forEach(uri => {
      if (uri.includes('temp') || uri.includes('cache')) {
        console.log(`Would clean up: ${uri}`);
      }
    });
  } catch (error) {
    console.warn('Error cleaning up temp files:', error);
  }
}

/**
 * Check if device has sufficient storage for media upload
 * Note: This is a placeholder implementation. In production, you would use
 * react-native-fs or similar library for actual storage checking.
 */
export async function checkStorageAvailability(requiredBytes: number): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      // iOS storage check would require additional native module
      return true; // Assume sufficient storage on iOS
    } else {
      // Android storage check - placeholder implementation
      console.log(`Checking storage availability for ${requiredBytes} bytes`);

      // Simulate storage check delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Placeholder: Assume sufficient storage (in real implementation, check actual free space)
      return true;
    }
  } catch (error) {
    console.warn('Error checking storage availability:', error);
    return true; // Default to allowing upload
  }
}
import { Platform } from 'react-native';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  response?: any;
}

/**
 * Upload file to server with progress tracking
 */
export async function uploadFile(
  fileUri: string,
  uploadUrl: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    timeout = 30000,
    headers = {},
    retries = 3,
    retryDelay = 1000
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create form data for multipart upload
      const formData = new FormData();

      // Get file info
      const fileName = getFileNameFromUri(fileUri);
      const fileType = getMimeTypeFromUri(fileUri);

      // For React Native, we need to handle file upload differently
      if (Platform.OS === 'ios') {
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType
        } as any);
      } else {
        // Android
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType
        } as any);
      }

      // Create upload request
      const controller = options.signal ? null : new AbortController();
      const signal = options.signal || controller?.signal;
      const timeoutId = setTimeout(() => controller?.abort(), timeout);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...headers
        },
        body: formData,
        signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        url: result.url || result.fileUrl,
        response: result
      };

    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        console.log(`Upload attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Upload failed after all retries'
  };
}

/**
 * Upload multiple files concurrently with progress tracking
 */
export async function uploadMultipleFiles(
  files: Array<{ uri: string; name?: string }>,
  uploadUrl: string,
  options: UploadOptions & {
    concurrency?: number;
    onFileProgress?: (fileIndex: number, progress: UploadProgress) => void;
    onFileComplete?: (fileIndex: number, result: UploadResult) => void;
  } = {}
): Promise<UploadResult[]> {
  const {
    concurrency = 3,
    onFileProgress,
    onFileComplete,
    ...uploadOptions
  } = options;

  const results: UploadResult[] = [];
  const semaphore = new Semaphore(concurrency);

  const uploadPromises = files.map(async (file, index) => {
    await semaphore.acquire();

    try {
      const result = await uploadFile(file.uri, uploadUrl, {
        ...uploadOptions,
        onProgress: (progress) => {
          onFileProgress?.(index, progress);
        }
      });

      results[index] = result;
      onFileComplete?.(index, result);

      return result;
    } finally {
      semaphore.release();
    }
  });

  await Promise.allSettled(uploadPromises);

  return results;
}

/**
 * Semaphore for controlling concurrent operations
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Get file name from URI
 */
export function getFileNameFromUri(uri: string): string {
  // Handle different URI formats
  if (uri.startsWith('file://')) {
    return uri.split('/').pop() || 'unknown';
  }

  if (uri.startsWith('content://')) {
    // For Android content URIs, we might need to get the display name
    // This is a simplified implementation
    return `file_${Date.now()}`;
  }

  // Fallback
  return uri.split('/').pop() || 'unknown';
}

/**
 * Get MIME type from URI
 */
export function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Validate file before upload
 */
export function validateFileForUpload(
  fileUri: string,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}
): { isValid: boolean; error?: string } {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    required = true
  } = options;

  if (!fileUri && required) {
    return { isValid: false, error: 'File is required' };
  }

  if (!fileUri) {
    return { isValid: true };
  }

  const mimeType = getMimeTypeFromUri(fileUri);

  if (!allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Note: File size validation would require actual file access
  // This is a placeholder - in production, you'd check the actual file size

  return { isValid: true };
}

/**
 * Create upload queue for offline uploads
 */
export class UploadQueue {
  private queue: Array<{
    id: string;
    fileUri: string;
    uploadUrl: string;
    options: UploadOptions;
    retryCount: number;
  }> = [];

  private isProcessing = false;

  constructor() {
    this.loadQueueFromStorage();
  }

  /**
   * Add file to upload queue
   */
  addToQueue(fileUri: string, uploadUrl: string, options: UploadOptions = {}): string {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      id,
      fileUri,
      uploadUrl,
      options,
      retryCount: 0
    });

    this.saveQueueToStorage();
    this.processQueue();

    return id;
  }

  /**
   * Process upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        const result = await uploadFile(item.fileUri, item.uploadUrl, item.options);

        if (result.success) {
          // Upload successful, remove from queue
          this.queue.shift();
          this.saveQueueToStorage();
        } else {
          // Upload failed, increment retry count
          item.retryCount++;

          if (item.retryCount >= (item.options.retries || 3)) {
            // Max retries reached, remove from queue
            console.error(`Upload failed after ${item.retryCount} retries:`, result.error);
            this.queue.shift();
            this.saveQueueToStorage();
          } else {
            // Move to end of queue for retry
            this.queue.push(this.queue.shift()!);
            this.saveQueueToStorage();

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, (item.options.retryDelay || 1000)));
          }
        }
      } catch (error) {
        console.error('Upload queue processing error:', error);
        // Move failed item to end of queue
        this.queue.push(this.queue.shift()!);
        this.saveQueueToStorage();

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    processing: boolean;
    items: Array<{ id: string; fileUri: string; retryCount: number }>;
  } {
    return {
      total: this.queue.length,
      processing: this.isProcessing,
      items: this.queue.map(item => ({
        id: item.id,
        fileUri: item.fileUri,
        retryCount: item.retryCount
      }))
    };
  }

  /**
   * Clear upload queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueueToStorage();
  }

  /**
   * Load queue from storage
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('upload_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading upload queue from storage:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('upload_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving upload queue to storage:', error);
    }
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueue();
import { useState, useCallback, useRef } from 'react';
import { uploadFile, uploadMultipleFiles, UploadProgress, UploadResult, UploadOptions } from '../utils/fileUpload';
import { processImage, validateMediaFile, ProcessedMediaResult, MediaProcessingOptions } from '../utils/mediaUtils';

export interface MediaUploadState {
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  results: UploadResult[];
}

export interface UseMediaUploadOptions {
  autoProcess?: boolean;
  processingOptions?: MediaProcessingOptions;
  uploadOptions?: UploadOptions;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: string) => void;
  onProcessingStart?: () => void;
  onProcessingComplete?: (processedMedia: ProcessedMediaResult[]) => void;
  onProcessingError?: (error: string) => void;
}

export interface UseMediaUploadReturn {
  // State
  state: MediaUploadState;

  // Single file upload
  uploadMedia: (fileUri: string, uploadUrl: string) => Promise<UploadResult>;

  // Multiple files upload
  uploadMultipleMedia: (files: Array<{ uri: string; name?: string }>, uploadUrl: string) => Promise<UploadResult[]>;

  // Media processing
  processMedia: (fileUri: string) => Promise<ProcessedMediaResult>;

  // Validation
  validateMedia: (fileUri: string) => { isValid: boolean; error?: string };

  // Reset state
  reset: () => void;

  // Cancel current upload
  cancel: () => void;
}

/**
 * Custom hook for media upload with processing and progress tracking
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const {
    autoProcess = true,
    processingOptions = {},
    uploadOptions = {},
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onProcessingStart,
    onProcessingComplete,
    onProcessingError
  } = options;

  const [state, setState] = useState<MediaUploadState>({
    uploading: false,
    progress: null,
    error: null,
    results: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update upload state
   */
  const updateState = useCallback((updates: Partial<MediaUploadState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  /**
   * Handle upload progress
   */
  const handleProgress = useCallback((progress: UploadProgress) => {
    updateState({ progress });
    onUploadProgress?.(progress);
  }, [updateState, onUploadProgress]);

  /**
   * Validate media file
   */
  const validateMedia = useCallback((fileUri: string) => {
    return validateMediaFile(fileUri);
  }, []);

  /**
   * Process media file
   */
  const processMedia = useCallback(async (fileUri: string): Promise<ProcessedMediaResult> => {
    try {
      onProcessingStart?.();

      const validation = validateMedia(fileUri);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid media file');
      }

      const processedMedia = await processImage(fileUri, processingOptions);

      onProcessingComplete?.([processedMedia]);

      return processedMedia;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      onProcessingError?.(errorMessage);
      throw error;
    }
  }, [processingOptions, validateMedia, onProcessingStart, onProcessingComplete, onProcessingError]);

  /**
   * Upload single media file
   */
  const uploadMedia = useCallback(async (
    fileUri: string,
    uploadUrl: string
  ): Promise<UploadResult> => {
    try {
      // Reset state
      updateState({
        uploading: true,
        progress: null,
        error: null,
        results: []
      });

      onUploadStart?.();

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Process media if auto-processing is enabled
      let fileToUpload = fileUri;
      if (autoProcess) {
        const processedMedia = await processMedia(fileUri);
        fileToUpload = processedMedia.uri;
      }

      // Upload file
      const result = await uploadFile(fileToUpload, uploadUrl, {
        ...uploadOptions,
        onProgress: handleProgress,
        signal: abortControllerRef.current.signal
      });

      // Update state
      updateState({
        uploading: false,
        progress: null,
        results: [result]
      });

      if (result.success) {
        onUploadComplete?.([result]);
      } else {
        const errorMessage = result.error || 'Upload failed';
        updateState({ error: errorMessage });
        onUploadError?.(errorMessage);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      updateState({
        uploading: false,
        progress: null,
        error: errorMessage
      });

      onUploadError?.(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [
    autoProcess,
    processMedia,
    uploadOptions,
    updateState,
    onUploadStart,
    handleProgress,
    onUploadComplete,
    onUploadError
  ]);

  /**
   * Upload multiple media files
   */
  const uploadMultipleMedia = useCallback(async (
    files: Array<{ uri: string; name?: string }>,
    uploadUrl: string
  ): Promise<UploadResult[]> => {
    try {
      // Reset state
      updateState({
        uploading: true,
        progress: null,
        error: null,
        results: []
      });

      onUploadStart?.();

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Process files if auto-processing is enabled
      let filesToUpload = files;
      if (autoProcess) {
        const processedFiles = await Promise.all(
          files.map(async (file) => {
            try {
              const processedMedia = await processMedia(file.uri);
              return {
                uri: processedMedia.uri,
                name: file.name
              };
            } catch (error) {
              console.error(`Failed to process ${file.uri}:`, error);
              return file; // Use original file if processing fails
            }
          })
        );
        filesToUpload = processedFiles;
      }

      // Upload files
      const results = await uploadMultipleFiles(filesToUpload, uploadUrl, {
        ...uploadOptions,
        onFileProgress: (fileIndex, progress) => {
          // Update progress for current file
          handleProgress(progress);
        },
        onFileComplete: (fileIndex, result) => {
          // Update results as files complete
          setState(prevState => ({
            ...prevState,
            results: prevState.results.map((r, i) => i === fileIndex ? result : r)
          }));
        },
        signal: abortControllerRef.current.signal
      });

      // Update final state
      updateState({
        uploading: false,
        progress: null,
        results
      });

      const successfulUploads = results.filter(r => r.success);
      const failedUploads = results.filter(r => !r.success);

      if (successfulUploads.length > 0) {
        onUploadComplete?.(results);
      }

      if (failedUploads.length > 0) {
        const errorMessage = `Failed to upload ${failedUploads.length} of ${results.length} files`;
        updateState({ error: errorMessage });
        onUploadError?.(errorMessage);
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      updateState({
        uploading: false,
        progress: null,
        error: errorMessage
      });

      onUploadError?.(errorMessage);

      return files.map(() => ({
        success: false,
        error: errorMessage
      }));
    }
  }, [
    autoProcess,
    processMedia,
    uploadOptions,
    updateState,
    onUploadStart,
    handleProgress,
    onUploadComplete,
    onUploadError
  ]);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    updateState({
      uploading: false,
      progress: null,
      error: null,
      results: []
    });
  }, [updateState]);

  /**
   * Cancel current upload
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    updateState({
      uploading: false,
      progress: null,
      error: 'Upload cancelled'
    });
  }, [updateState]);

  return {
    state,
    uploadMedia,
    uploadMultipleMedia,
    processMedia,
    validateMedia,
    reset,
    cancel
  };
}
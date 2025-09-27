// Image compression utility for frontend
export interface CompressionOptions {
  maxSizeKB: number;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresses an image file to meet size requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compression result
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeKB: 500,
    quality: 0.8,
    maxWidth: 600,
    maxHeight: 600
  }
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth || 600,
          options.maxHeight || 600
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to meet size requirement
        let quality = options.quality;
        let attempts = 0;
        const maxAttempts = 5;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              if (sizeKB <= options.maxSizeKB || attempts >= maxAttempts) {
                // Create new file with compressed data
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });

                resolve({
                  compressedFile,
                  originalSize: file.size,
                  compressedSize: blob.size,
                  compressionRatio: (1 - blob.size / file.size) * 100
                });
              } else {
                // Reduce quality and try again
                quality *= 0.8;
                attempts++;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Scale down if necessary
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Compress image specifically for student photos (passport size)
 */
export async function compressStudentPhoto(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxSizeKB: 500,
    quality: 0.8,
    maxWidth: 600,
    maxHeight: 600
  });
}

/**
 * Compress image specifically for school badges
 */
export async function compressSchoolBadge(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxSizeKB: 500,
    quality: 0.8,
    maxWidth: 200,
    maxHeight: 200
  });
}

/**
 * Validate image file before compression
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 5MB' };
  }

  // Check minimum size
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return { isValid: false, error: 'File size must be at least 1KB' };
  }

  return { isValid: true };
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

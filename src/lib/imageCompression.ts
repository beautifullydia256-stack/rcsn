// Image compression utility for frontend
export interface CompressionOptions {
  maxSizeKB: number;
  /** Initial JPEG quality 0–1 */
  quality: number;
  /** Do not reduce quality below this when iterating (default 0.4) */
  minQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Output filename base (extension forced to .jpg) */
  outputBaseName?: string;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/** Report storage: max width for student photos and school badges before save */
export const REPORT_IMAGE_MAX_WIDTH_PX = 600;
/** Target max encoded size per image for DB/storage */
export const REPORT_IMAGE_MAX_SIZE_KB = 100;
/** JPEG quality band for uploads (plan: 40–60%) */
export const REPORT_JPEG_QUALITY_INITIAL = 0.55;
export const REPORT_JPEG_QUALITY_MIN = 0.4;

/**
 * Compresses an image file to meet size requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compression result
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeKB: REPORT_IMAGE_MAX_SIZE_KB,
    quality: REPORT_JPEG_QUALITY_INITIAL,
    minQuality: REPORT_JPEG_QUALITY_MIN,
    maxWidth: REPORT_IMAGE_MAX_WIDTH_PX,
    maxHeight: REPORT_IMAGE_MAX_WIDTH_PX,
  }
): Promise<CompressionResult> {
  const minQ = options.minQuality ?? REPORT_JPEG_QUALITY_MIN;
  const outName = (options.outputBaseName ?? (file.name.replace(/\.[^.]+$/, '') || 'image')) + '.jpg';

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth || REPORT_IMAGE_MAX_WIDTH_PX,
          options.maxHeight || REPORT_IMAGE_MAX_WIDTH_PX
        );

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        let quality = options.quality;
        let attempts = 0;
        const maxAttempts = 8;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              if (sizeKB <= options.maxSizeKB || attempts >= maxAttempts || quality <= minQ + 0.001) {
                const compressedFile = new File([blob], outName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                resolve({
                  compressedFile,
                  originalSize: file.size,
                  compressedSize: blob.size,
                  compressionRatio: (1 - blob.size / file.size) * 100,
                });
              } else {
                quality = Math.max(minQ, quality * 0.85);
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
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
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

  const aspectRatio = width / height;

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
    maxSizeKB: REPORT_IMAGE_MAX_SIZE_KB,
    quality: REPORT_JPEG_QUALITY_INITIAL,
    minQuality: REPORT_JPEG_QUALITY_MIN,
    maxWidth: REPORT_IMAGE_MAX_WIDTH_PX,
    maxHeight: REPORT_IMAGE_MAX_WIDTH_PX,
    outputBaseName: 'student-photo',
  });
}

/**
 * Compress image specifically for school badges (same max width as plan; displayed small in header)
 */
export async function compressSchoolBadge(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxSizeKB: REPORT_IMAGE_MAX_SIZE_KB,
    quality: REPORT_JPEG_QUALITY_INITIAL,
    minQuality: REPORT_JPEG_QUALITY_MIN,
    maxWidth: REPORT_IMAGE_MAX_WIDTH_PX,
    maxHeight: REPORT_IMAGE_MAX_WIDTH_PX,
    outputBaseName: 'school-badge',
  });
}

/**
 * Validate image file before compression
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 5MB' };
  }

  const minSize = 1024;
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

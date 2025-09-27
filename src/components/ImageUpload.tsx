"use client";

import React, { useState, useRef } from 'react';
import { compressImage, validateImageFile, formatFileSize, CompressionResult } from '@/src/lib/imageCompression';

interface ImageUploadProps {
  onImageSelect: (file: File, compressionResult: CompressionResult) => void;
  onError: (error: string) => void;
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  accept?: string;
  placeholder?: string;
  className?: string;
}

export default function ImageUpload({
  onImageSelect,
  onError,
  maxSizeKB = 500,
  maxWidth = 600,
  maxHeight = 600,
  accept = "image/*",
  placeholder = "Click to upload image",
  className = ""
}: ImageUploadProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onError(validation.error || 'Invalid file');
      return;
    }

    setIsCompressing(true);
    setCompressionProgress(0);
    setOriginalSize(file.size);

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setCompressionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Compress image
      const compressionResult = await compressImage(file, {
        maxSizeKB,
        maxWidth,
        maxHeight,
        quality: 0.8
      });

      clearInterval(progressInterval);
      setCompressionProgress(100);
      setCompressedSize(compressionResult.compressedSize);

      // Call the callback with compressed file
      onImageSelect(compressionResult.compressedFile, compressionResult);

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Compression failed');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setOriginalSize(null);
    setCompressedSize(null);
    setCompressionProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
          ${isCompressing 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isCompressing}
        />

        {isCompressing ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-blue-600">Compressing image...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${compressionProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{compressionProgress}%</p>
          </div>
        ) : preview ? (
          <div className="text-center">
            <img
              src={preview}
              alt="Preview"
              className="max-h-32 mx-auto rounded-lg mb-2"
            />
            <p className="text-sm text-gray-600">Image ready for upload</p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">{placeholder}</p>
            <p className="text-xs text-gray-500">Max size: {maxSizeKB}KB</p>
          </div>
        )}
      </div>

      {/* File Info */}
      {originalSize && (
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Original size:</span>
            <span>{formatFileSize(originalSize)}</span>
          </div>
          {compressedSize && (
            <div className="flex justify-between">
              <span>Compressed size:</span>
              <span className="text-green-600">{formatFileSize(compressedSize)}</span>
            </div>
          )}
          {compressedSize && originalSize && (
            <div className="flex justify-between">
              <span>Compression ratio:</span>
              <span className="text-green-600">
                {((1 - compressedSize / originalSize) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Clear Button */}
      {preview && !isCompressing && (
        <button
          onClick={clearImage}
          className="w-full px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          Remove Image
        </button>
      )}
    </div>
  );
}

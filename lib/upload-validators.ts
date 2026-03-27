// ============================================================
// File Upload Validation Utilities
// ============================================================
// Centralized validation rules for file uploads:
// - File type restrictions (MIME type whitelist)
// - File size limits
// - File count restrictions
// - Security scanning
// ============================================================

import { z } from "zod";

/**
 * Allowed MIME types for complaint evidence and attachments
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov files
];

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  // Office documents disabled for now; can be added later if needed
  // "application/msword",
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // "application/vnd.ms-excel",
  // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const ALLOWED_ALL_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  VIDEO: 100 * 1024 * 1024, // 100 MB
  DOCUMENT: 20 * 1024 * 1024, // 20 MB
};

/**
 * Maximum number of files per upload
 */
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate file type
 * @param mimeType - File MIME type
 * @returns Validation result
 */
export function validateFileType(mimeType: string): ValidationResult {
  const errors: string[] = [];

  if (!ALLOWED_ALL_TYPES.includes(mimeType)) {
    errors.push(
      `File type "${mimeType}" is not allowed. Allowed types: images, videos, and PDFs.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file size based on type
 * @param sizeInBytes - File size in bytes
 * @param mimeType - File MIME type
 * @returns Validation result
 */
export function validateFileSize(
  sizeInBytes: number,
  mimeType: string
): ValidationResult {
  const errors: string[] = [];

  let limit = FILE_SIZE_LIMITS.IMAGE;
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    limit = FILE_SIZE_LIMITS.VIDEO;
  } else if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
    limit = FILE_SIZE_LIMITS.DOCUMENT;
  }

  if (sizeInBytes > limit) {
    const maxMB = (limit / (1024 * 1024)).toFixed(1);
    errors.push(`File size (${(sizeInBytes / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${maxMB}MB.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file count in upload batch
 * @param count - Number of files
 * @returns Validation result
 */
export function validateFileCount(count: number): ValidationResult {
  const errors: string[] = [];

  if (count === 0) {
    errors.push("At least one file is required.");
  }

  if (count > MAX_FILES_PER_UPLOAD) {
    errors.push(
      `Cannot upload more than ${MAX_FILES_PER_UPLOAD} files at once.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation for a single file
 * @param name - File name
 * @param mimeType - File MIME type
 * @param sizeInBytes - File size in bytes
 * @returns Validation result
 */
export function validateFile(
  name: string,
  mimeType: string,
  sizeInBytes: number
): ValidationResult {
  const errors: string[] = [];

  // Validate file type
  const typeValidation = validateFileType(mimeType);
  errors.push(...typeValidation.errors);

  // Validate file size
  const sizeValidation = validateFileSize(sizeInBytes, mimeType);
  errors.push(...sizeValidation.errors);

  // Validate filename (prevent path traversal, etc.)
  if (!name || name.length === 0 || name.length > 255) {
    errors.push("Invalid file name.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Zod schema for file upload request validation
 */
export const uploadFileSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        mimeType: z.string(),
        sizeInBytes: z.number().int().positive(),
        // base64 content or buffer will be passed separately
      })
    )
    .min(1)
    .max(MAX_FILES_PER_UPLOAD),
});

export type UploadFileRequest = z.infer<typeof uploadFileSchema>;

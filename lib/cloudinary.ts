// ============================================================
// Cloudinary Configuration & Upload Utilities
// ============================================================
// This module provides server-side Cloudinary integration for:
// - Uploading files (images, PDFs) to Cloudinary
// - Generating optimized image URLs with transformations
// - Deleting assets by public ID
//
// All operations use server-side secrets; never expose API key/secret to client.
// ============================================================

import { v2 as cloudinary } from "cloudinary";

// Lazy initialization: only configure when first used
let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) return;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME environment variable");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  isConfigured = true;
}

/**
 * Cloudinary upload response metadata
 */
export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer to upload
 * @param filename - Original filename (used for public ID)
 * @param folder - Cloudinary folder path (e.g., "crm/complaints")
 * @returns Normalized upload result
 */
export async function uploadFileToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = "crm/uploads"
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: `${folder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "-")}`,
        resource_type: "auto", // auto-detect image/video/pdf
        quality: "auto",
        // For images: enable automatic format optimization
        fetch_format: "auto",
        // Store metadata for future reference
        tags: ["crm-upload"],
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            url: result.url,
            resourceType: result.resource_type as "image" | "video" | "raw",
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        } else {
          reject(new Error("Cloudinary upload returned empty result"));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Generate an optimized Cloudinary image URL with transformations
 * Useful for avatars, thumbnails, and CRM card images
 * @param publicId - Cloudinary public ID
 * @param width - Target width in pixels
 * @param height - Target height in pixels
 * @param options - Additional transformation options
 * @returns Transformed secure URL
 */
export function buildOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: "fill" | "thumb" | "scale" | "fit" | "pad";
    quality?: "auto" | "best" | "good" | "eco" | "low";
    format?: "auto" | "webp" | "jpg" | "png";
    gravity?: string; // e.g., "face" for avatar cropping
  } = {}
): string {
  const transformations: Array<Record<string, any>> = [];

  if (options.width || options.height) {
    transformations.push({
      width: options.width,
      height: options.height,
      crop: options.crop || "fill",
      gravity: options.gravity || "auto",
    });
  }

  transformations.push({
    quality: options.quality || "auto",
    fetch_format: options.format || "auto",
  });

  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformations,
  });
}

/**
 * Generate optimized avatar URL (square, centered on face if detected)
 * @param publicId - Cloudinary public ID
 * @param size - Avatar size in pixels (default 128)
 * @returns Transformed secure URL
 */
export function buildAvatarUrl(publicId: string, size: number = 128): string {
  return buildOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: "thumb",
    gravity: "face",
    quality: "auto",
    format: "auto",
  });
}

/**
 * Generate optimized card image URL (landscape, for complaint cards)
 * @param publicId - Cloudinary public ID
 * @param width - Card width (default 400)
 * @param height - Card height (default 300)
 * @returns Transformed secure URL
 */
export function buildCardImageUrl(
  publicId: string,
  width: number = 400,
  height: number = 300
): string {
  return buildOptimizedImageUrl(publicId, {
    width,
    height,
    crop: "fill",
    gravity: "auto",
    quality: "auto",
    format: "auto",
  });
}

/**
 * Delete a file from Cloudinary by public ID
 * @param publicId - Cloudinary public ID
 * @returns Deletion result
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  ensureConfigured();

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset ${publicId}:`, error);
    return false;
  }
}

/**
 * Validate if a URL is a Cloudinary URL
 * @param url - URL to check
 * @returns True if URL is hosted on Cloudinary CDN
 */
export function isCloudinaryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes("cloudinary.com") || urlObj.hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

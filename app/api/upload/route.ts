// ============================================================
// POST /api/upload — Secure File Upload Handler
// ============================================================
// Handles authenticated multipart file uploads to Cloudinary.
// Supports both Clerk user sessions and worker sessions.
//
// Request: multipart/form-data with file fields
// Response: { urls: [...CloudinaryUploadResult], metadata: {...} }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getWorkerSessionFromRequest } from "@/lib/worker-auth";
import {
  uploadFileToCloudinary,
  CloudinaryUploadResult,
  buildCardImageUrl,
} from "@/lib/cloudinary";
import {
  validateFile,
  validateFileCount,
  MAX_FILES_PER_UPLOAD,
} from "@/lib/upload-validators";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Normalized upload response for a single file
 */
interface NormalizedUploadResponse {
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  bytes: number;
  // Optional: optimized card image URL (for image previews in UI)
  cardImageUrl?: string;
}

interface UploadResponse {
  urls: NormalizedUploadResponse[];
  metadata: {
    totalFiles: number;
    totalBytes: number;
    uploadedAt: string;
    userId?: string;
    officerId?: string;
  };
}

/**
 * Helper: Parse multipart form data (Node.js native, no extra library)
 * Returns array of [fieldName, file: { name, mimeType, buffer }]
 */
async function parseMultipartFormData(
  request: NextRequest
): Promise<Map<string, { name: string; mimeType: string; buffer: Buffer }>> {
  const formData = await request.formData();
  const files = new Map<string, { name: string; mimeType: string; buffer: Buffer }>();

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.set(key, {
        name: value.name,
        mimeType: value.type,
        buffer,
      });
    }
  }

  return files;
}

export async function POST(request: NextRequest) {
  try {
    // ─── Authentication ───────────────────────────────────────────────────
    // Support both Clerk users and worker sessions
    let userId: string | undefined;
    let officerId: string | undefined;
    let userType: "citizen" | "worker" | null = null;

    // Check Clerk session (citizen users)
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json(
          { error: "Clerk user not found" },
          { status: 401 }
        );
      }
      userId = clerkUserId;
      userType = "citizen";
    }

    // Check worker session
    const workerSession = getWorkerSessionFromRequest(request);
    if (workerSession) {
      officerId = workerSession.officerId;
      userType = "worker";
    }

    // Require one of the two auth methods
    if (!userType) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in or login as an officer.",
        },
        { status: 401 }
      );
    }

    const uploadRateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:upload:post",
      limit: 10,
      windowSec: 60,
      identifier: userId ?? officerId,
    });

    if (uploadRateLimitResponse) {
      return uploadRateLimitResponse;
    }

    // ─── Parse Multipart Form Data ───────────────────────────────────────
    let files: Map<string, { name: string; mimeType: string; buffer: Buffer }>;
    try {
      files = await parseMultipartFormData(request);
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to parse file upload. Ensure files are sent as multipart/form-data." },
        { status: 400 }
      );
    }

    if (files.size === 0) {
      return NextResponse.json(
        { error: "No files provided in request." },
        { status: 400 }
      );
    }

    // ─── Validate File Count ──────────────────────────────────────────────
    const countValidation = validateFileCount(files.size);
    if (!countValidation.isValid) {
      return NextResponse.json(
        { error: countValidation.errors[0] },
        { status: 400 }
      );
    }

    // ─── Validate and Upload Each File ──────────────────────────────────
    const uploadedFiles: NormalizedUploadResponse[] = [];
    const uploadErrors: string[] = [];
    let totalBytes = 0;

    for (const [, file] of files.entries()) {
      // Validate individual file
      const fileValidation = validateFile(
        file.name,
        file.mimeType,
        file.buffer.length
      );

      if (!fileValidation.isValid) {
        uploadErrors.push(
          `${file.name}: ${fileValidation.errors.join(", ")}`
        );
        continue;
      }

      try {
        // Upload to Cloudinary
        const folder = userType === "worker" ? "crm/evidence" : "crm/complaints";
        const result = await uploadFileToCloudinary(
          file.buffer,
          file.name,
          folder
        );

        totalBytes += file.buffer.length;

        // Build response with optional optimizations
        const response: NormalizedUploadResponse = {
          publicId: result.publicId,
          secureUrl: result.secureUrl,
          resourceType: result.resourceType,
          format: result.format,
          bytes: result.bytes,
        };

        // Generate optimized card image URL for image files
        if (result.resourceType === "image") {
          response.cardImageUrl = buildCardImageUrl(result.publicId, 400, 300);
        }

        uploadedFiles.push(response);
      } catch (uploadError) {
        const errorMessage =
          uploadError instanceof Error ? uploadError.message : "Unknown error";
        uploadErrors.push(`${file.name}: ${errorMessage}`);
      }
    }

    // Return success response even if some files failed (partial success)
    // unless ALL files failed
    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        {
          error: "All file uploads failed.",
          details: uploadErrors,
        },
        { status: 400 }
      );
    }

    const uploadResponse: UploadResponse = {
      urls: uploadedFiles,
      metadata: {
        totalFiles: uploadedFiles.length,
        totalBytes,
        uploadedAt: new Date().toISOString(),
        ...(userId && { userId }),
        ...(officerId && { officerId }),
      },
    };

    // Include partial error details if some files failed
    if (uploadErrors.length > 0) {
      return NextResponse.json(
        {
          ...uploadResponse,
          warnings: uploadErrors,
        },
        { status: 207 } // 207 Multi-Status for partial success
      );
    }

    return NextResponse.json(uploadResponse, { status: 200 });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      {
        error: "File upload failed. Please try again.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload?publicId=xxx — Delete an uploaded asset
 * Requires authentication (Clerk user or worker session)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check (same as POST)
    const { userId: clerkUserId } = await auth();
    const workerSession = getWorkerSessionFromRequest(request);

    if (!clerkUserId && !workerSession) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const deleteRateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:upload:delete",
      limit: 20,
      windowSec: 60,
      identifier: clerkUserId ?? workerSession?.officerId,
    });

    if (deleteRateLimitResponse) {
      return deleteRateLimitResponse;
    }

    // Get publicId from query params
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json(
        { error: "publicId query parameter is required." },
        { status: 400 }
      );
    }

    // TODO: In production, verify ownership of asset before deletion
    // This would require tracking publicId in database with owner info

    // For now, delete based on auth (any citizen/worker can delete their own uploads)
    // In future, add Cloudinary metadata or database tracking for owner verification

    const { deleteCloudinaryAsset } = await import("@/lib/cloudinary");
    const deleted = await deleteCloudinaryAsset(publicId);

    if (deleted) {
      return NextResponse.json({
        message: `Asset ${publicId} deleted successfully.`,
      });
    } else {
      return NextResponse.json(
        {
          error: `Failed to delete asset ${publicId}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[DELETE /api/upload]", error);
    return NextResponse.json(
      {
        error: "Failed to delete asset.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

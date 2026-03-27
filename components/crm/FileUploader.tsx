"use client";

// ============================================================
// FileUploader Component
// ============================================================
// Reusable, production-grade file uploader with:
// - Drag-and-drop support
// - File preview (images + PDF icons)
// - Upload progress tracking
// - Error handling with user-friendly messages
// - Support for images, videos, and PDFs
//
// Props:
//   value: Current file URLs (string[])
//   onChange: Callback when files are uploaded (urls: string[]) => void
//   maxFiles: Max files to upload (default 5)
//   maxSizePerFile: Max size per file in bytes (default 10MB)
//   acceptedTypes: Allowed MIME types (default: images + video + PDF)
// ============================================================

import { useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";

export interface FileUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number;
  acceptedTypes?: string[];
  label?: string;
  description?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface UploadedFile {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  cardImageUrl?: string;
}

export default function FileUploader({
  value,
  onChange,
  maxFiles = 5,
  maxSizePerFile = 10 * 1024 * 1024, // 10 MB
  acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "application/pdf",
  ],
  label = "Upload Files",
  description = "Drag and drop files here, or click to select from your device",
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(
    new Map()
  );
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, UploadedFile>>(
    new Map()
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine threshold of max files for upload button visibility
  const canAddMore = (uploadedFiles.size + uploadingFiles.size) < maxFiles;

  /**
   * Validate a single file before upload
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check MIME type
    if (!acceptedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" not allowed. Allowed: ${acceptedTypes.join(", ")}`,
      };
    }

    // Check file size
    if (file.size > maxSizePerFile) {
      const maxMB = (maxSizePerFile / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${maxMB}MB`,
      };
    }

    return { valid: true };
  };

  /**
   * Upload a single file to /api/upload
   */
  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const fileId = `${Date.now()}-${Math.random()}`;

    // Validate
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          id: fileId,
          name: file.name,
          progress: 0,
          error: validation.error,
        });
        return next;
      });
      return null;
    }

    // Create FormData
    const formData = new FormData();
    formData.append("files", file);

    try {
      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          id: fileId,
          name: file.name,
          progress: 50,
        });
        return next;
      });

      // Upload to /api/upload
      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadResponse = response.data;
      const uploadedFile = uploadResponse.urls?.[0];

      if (!uploadedFile) {
        throw new Error("No upload result in response");
      }

      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });

      return {
        url: uploadedFile.secureUrl,
        publicId: uploadedFile.publicId,
        resourceType: uploadedFile.resourceType,
        format: uploadedFile.format,
        cardImageUrl: uploadedFile.cardImageUrl,
      };
    } catch (error) {
      const errorMessage =
        axios.isAxiosError(error)
          ? error.response?.data?.error ?? error.message
          : error instanceof Error
            ? error.message
            : "Upload failed";

      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          id: fileId,
          name: file.name,
          progress: 0,
          error: errorMessage,
        });
        return next;
      });

      return null;
    }
  };

  /**
   * Handle file selection (from input or drag-drop)
   */
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const filesToUpload: File[] = [];
      let errorCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateFile(file);

        if (!validation.valid) {
          // Show validation error
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.set(`error-${Date.now()}-${i}`, {
              id: `error-${Date.now()}-${i}`,
              name: file.name,
              progress: 0,
              error: validation.error,
            });
            return next;
          });
          errorCount++;
        } else if (uploadedFiles.size + filesToUpload.length < maxFiles) {
          filesToUpload.push(file);
        }
      }

      // Upload valid files
      const uploadPromises = filesToUpload.map((file) => uploadFile(file));
      const results = await Promise.all(uploadPromises);

      // Add uploaded files to state and callback
      const newFiles = results.filter(
        (f): f is UploadedFile => f !== null
      );

      if (newFiles.length > 0) {
        setUploadedFiles((prev) => {
          const next = new Map(prev);
          newFiles.forEach((file) => {
            next.set(file.publicId, file);
          });
          return next;
        });

        // Call parent onChange with all URLs
        const allUrls = Array.from(uploadedFiles.values())
          .map((f) => f.url)
          .concat(newFiles.map((f) => f.url));
        onChange(allUrls);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadedFiles, maxFiles, onChange]
  );

  /**
   * Remove an uploaded file
   */
  const removeFile = (publicId: string) => {
    setUploadedFiles((prev) => {
      const next = new Map(prev);
      next.delete(publicId);
      return next;
    });

    // Update parent with remaining URLs
    const remainingUrls = Array.from(uploadedFiles.values())
      .filter((f) => f.publicId !== publicId)
      .map((f) => f.url);
    onChange(remainingUrls);

    // TODO: Call DELETE /api/upload?publicId=xxx to clean up on Cloudinary
  };

  /**
   * Clear all error messages
   */
  const clearErrors = () => {
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      for (const [key] of next.entries()) {
        if (key.startsWith("error-")) {
          next.delete(key);
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 bg-gray-50 hover:border-blue-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="space-y-3"
        >
          <div className="flex justify-center">
            {canAddMore ? (
              <Upload className="w-8 h-8 text-blue-600" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {canAddMore ? "Drop files to upload" : "Maximum files reached"}
            </p>
            {description && canAddMore && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>

          {canAddMore && (
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
            >
              <ImagePlus className="w-4 h-4 inline mr-2" />
              Choose Files
            </button>
          )}
        </div>
      </div>

      {/* File List (Uploaded) */}
      {uploadedFiles.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {uploadedFiles.size} File
            {uploadedFiles.size !== 1 ? "s" : ""} Uploaded
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Array.from(uploadedFiles.values()).map((file) => (
              <div
                key={file.publicId}
                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-all"
              >
                {/* Preview */}
                {file.resourceType === "image" ? (
                  <img
                    src={file.cardImageUrl || file.url}
                    alt="preview"
                    className="w-full h-24 object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(file.publicId)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Filename */}
                <div className="p-2 bg-gray-50">
                  <p className="text-xs text-gray-700 truncate font-medium">
                    {file.format?.toUpperCase() || "File"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Uploading...
          </h4>
          {Array.from(uploadingFiles.values()).map((file) => (
            <div key={file.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 truncate font-medium">
                  {file.name}
                </p>
                {file.error ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                )}
              </div>

              {file.error ? (
                <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  {file.error}
                </p>
              ) : (
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clear Errors Button */}
      {Array.from(uploadingFiles.values()).some((f) => f.error) && (
        <button
          type="button"
          onClick={clearErrors}
          className="text-xs text-red-600 font-semibold hover:underline"
        >
          Clear Errors
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { ComplaintCategory, Priority } from "@prisma/client";
import {
  MapPin,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Navigation,
  Mic,
  Square,
} from "lucide-react";
import FileUploader from "./FileUploader";

// ============================================================
// Simplified Complaint Schema (description + image + location)
// ============================================================
const quickComplaintSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  photosUrls: z.array(z.string().url()).default([]),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationAddress: z.string().optional(),
  category: z.nativeEnum(ComplaintCategory).default(ComplaintCategory.OTHER),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
});

type QuickComplaintData = z.input<typeof quickComplaintSchema>;

interface QuickComplaintFormProps {
  citizenId: string;
  onSuccess?: (complaint: any) => void;
}

export default function QuickComplaintForm({
  citizenId,
  onSuccess,
}: QuickComplaintFormProps) {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "found">(
    "idle"
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
    reset,
  } = useForm<QuickComplaintData>({
    resolver: zodResolver(quickComplaintSchema),
    defaultValues: {
      description: "",
      photosUrls: [],
      category: ComplaintCategory.OTHER,
      priority: Priority.MEDIUM,
      locationLat: undefined,
      locationLng: undefined,
    },
    mode: "onChange",
  });

  const formData = watch();
  const hasLocation = formData.locationLat && formData.locationLng;

  // Auto-detect location on mount
  useEffect(() => {
    setIsVoiceSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
    detectLocation();
  }, []);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getPreferredAudioType = () => {
    if (typeof MediaRecorder === "undefined") {
      return "";
    }

    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  };

  const startVoiceRecording = async () => {
    if (!isVoiceSupported) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      setVoiceError(null);
      setRecordedAudio(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = getPreferredAudioType();
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setRecordedAudio(audioBlob);
        setIsRecording(false);
        recorder.stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
    } catch {
      setVoiceError(
        "Microphone access failed. Please allow microphone permission and try again."
      );
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return;
    }
    recorder.stop();
  };

  const clearVoiceRecording = () => {
    setRecordedAudio(null);
    setVoiceError(null);
  };

  const transcribeVoiceRecording = async () => {
    if (!recordedAudio) {
      setVoiceError("Please record your voice before transcribing.");
      return;
    }

    try {
      setVoiceError(null);
      setIsTranscribing(true);

      const extension = recordedAudio.type.includes("wav")
        ? "wav"
        : recordedAudio.type.includes("ogg")
          ? "ogg"
          : recordedAudio.type.includes("mp4")
            ? "m4a"
            : "webm";

      const audioFile = new File([recordedAudio], `voice-note-${Date.now()}.${extension}`, {
        type: recordedAudio.type || "audio/webm",
      });

      const payload = new FormData();
      payload.append("audio", audioFile);
      payload.append("language", "auto");

      const response = await axios.post("/api/agents/transcribe", payload);
      const transcript = response.data?.data?.text?.trim();

      if (!transcript) {
        throw new Error("No speech was detected in the recording.");
      }

      // Auto-fill the complaint description from voice transcription.
      setValue("description", transcript, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setVoiceError(error.response?.data?.error ?? "Unable to transcribe audio.");
      } else if (error instanceof Error) {
        setVoiceError(error.message);
      } else {
        setVoiceError("Unable to transcribe audio.");
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  /**
   * Auto-detect user's current location using browser geolocation
   */
  const detectLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not available on this device");
      setLocationStatus("idle");
      return;
    }

    setLocationError(null);
    setIsLocating(true);
    setLocationStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setValue("locationLat", latitude, { shouldValidate: true });
        setValue("locationLng", longitude, { shouldValidate: true });

        // Reverse geocode to get friendly address name (optional enhancement)
        const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setValue("locationAddress", address, { shouldValidate: true });

        setIsLocating(false);
        setLocationStatus("found");
      },
      (geoError) => {
        setIsLocating(false);
        setLocationStatus("idle");

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError(
            "Location permission denied. Enable it in browser settings to auto-detect."
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          setLocationError("Location detection timed out. Please try again.");
        } else {
          setLocationError("Unable to detect location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Submit complaint to API
   */
  const onSubmit = async (data: QuickComplaintData) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await axios.post("/api/complaint", {
        title: `${data.category} Report`,
        description: data.description,
        photosUrls: data.photosUrls,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        locationAddress: data.locationAddress,
        category: data.category,
        priority: data.priority,
        citizenId,
      });

      setSubmitSuccess(true);

      // Reset form after success
      setTimeout(() => {
        reset();
        setLocationStatus("idle");
        setSubmitSuccess(false);
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      }, 2000);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setSubmitError(err.response?.data?.error ?? "Failed to submit complaint");
      } else {
        setSubmitError("Failed to submit complaint. Please try again.");
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">File a Complaint</h2>
        <p className="text-gray-600">
          Share details with photos and your location will help us respond faster.
        </p>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Complaint submitted successfully!</p>
            <p className="text-sm text-green-700">
              Our team will review it and contact you soon.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Description Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What happened? *
          </label>
          <textarea
            {...register("description")}
            placeholder="Provide a clear description of the issue... (min 10 characters)"
            rows={4}
            className={`w-full px-4 py-3 border text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
              errors.description
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-2">{errors.description.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {formData.description.length}/1000 characters
          </p>
        </div>

        {/* Voice-to-Text */}
        <div className="bg-linear-to-br from-emerald-50 to-teal-100 rounded-xl p-6 border border-emerald-200">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Voice to Text (Groq)
          </label>
          <p className="text-xs text-gray-600 mb-4">
            Record your complaint and convert voice to text with automatic language detection.
          </p>

          {voiceError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {voiceError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={!isVoiceSupported || isRecording || isTranscribing}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>

            <button
              type="button"
              onClick={stopVoiceRecording}
              disabled={!isRecording}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-black disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>

            <button
              type="button"
              onClick={transcribeVoiceRecording}
              disabled={!recordedAudio || isRecording || isTranscribing}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                "Transcribe & Fill"
              )}
            </button>

            <button
              type="button"
              onClick={clearVoiceRecording}
              disabled={!recordedAudio || isRecording || isTranscribing}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>

          <p className="text-xs text-gray-700 mt-3">
            {isRecording
              ? "Recording in progress. Click Stop when finished."
              : recordedAudio
                ? `Recording ready (${Math.max(1, Math.round(recordedAudio.size / 1024))} KB)`
                : "No recording yet."}
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <FileUploader
            value={formData.photosUrls ?? []}
            onChange={(urls) => setValue("photosUrls", urls)}
            maxFiles={5}
            label="Attach Photos (Optional)"
            description="Upload photos of the issue. Supports JPG, PNG, WebP, GIF, MP4, WebM, MOV, PDF"
            maxSizePerFile={10 * 1024 * 1024}
            acceptedTypes={[
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/gif",
              "video/mp4",
              "video/webm",
              "video/quicktime",
              "application/pdf",
            ]}
          />
        </div>

        {/* Location Section */}
        <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin className="w-5 h-5 text-blue-600" />
              Your Location
            </label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={isLocating}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isLocating
                  ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                  : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Location Status */}
          {locationStatus === "locating" && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Detecting your location...
            </div>
          )}

          {hasLocation ? (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-green-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Latitude: {formData.locationLat?.toFixed(6)}
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    Longitude: {formData.locationLng?.toFixed(6)}
                  </p>
                  {formData.locationAddress && (
                    <p className="text-xs text-gray-600 mt-1">{formData.locationAddress}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">
                {locationError ? (
                  <span className="text-red-600 font-medium">{locationError}</span>
                ) : (
                  "Click 'Refresh' to detect your location automatically"
                )}
              </p>
            </div>
          )}
        </div>

        {/* Category & Priority (Hidden but submitted) */}
        <input type="hidden" {...register("category")} value={ComplaintCategory.OTHER} />
        <input type="hidden" {...register("priority")} value={Priority.MEDIUM} />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting || isRecording || isTranscribing}
          className={`w-full py-3 px-4 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${
            isValid && !isRecording && !isTranscribing
              ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Complaint
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Fields marked with * are required. We'll use your location to route this to the
          right department.
        </p>
      </form>
    </div>
  );
}

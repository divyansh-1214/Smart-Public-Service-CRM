import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/ogg;codecs=opus",
]);

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || "Transcription provider request failed.";
  } catch {
    return response.statusText || "Transcription provider request failed.";
  }
};

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        status: "error",
        error: "GROQ_API_KEY is not configured on the server.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const languageField = formData.get("language");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          status: "error",
          error: "Missing audio file. Send multipart/form-data with an 'audio' field.",
        },
        { status: 400 }
      );
    }

    if (audio.size <= 0) {
      return NextResponse.json(
        {
          status: "error",
          error: "Uploaded audio file is empty.",
        },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        {
          status: "error",
          error: "Audio file is too large. Maximum allowed size is 15MB.",
        },
        { status: 400 }
      );
    }

    if (audio.type && !ALLOWED_AUDIO_TYPES.has(audio.type)) {
      return NextResponse.json(
        {
          status: "error",
          error: `Unsupported audio format '${audio.type}'.`,
        },
        { status: 400 }
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("file", audio, audio.name || `recording-${Date.now()}.webm`);
    upstreamForm.append("model", GROQ_TRANSCRIPTION_MODEL);
    upstreamForm.append("response_format", "verbose_json");

    if (typeof languageField === "string" && languageField !== "auto") {
      upstreamForm.append("language", languageField);
    }

    const upstreamResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: upstreamForm,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      const message = await parseErrorMessage(upstreamResponse);
      return NextResponse.json(
        {
          status: "error",
          error: message,
        },
        { status: 502 }
      );
    }

    const result = await upstreamResponse.json();
    const transcript = typeof result?.text === "string" ? result.text.trim() : "";

    if (!transcript) {
      return NextResponse.json(
        {
          status: "error",
          error: "Transcription completed but no text was returned.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      status: "ok",
      data: {
        text: transcript,
        language: result?.language || "auto",
        duration: typeof result?.duration === "number" ? result.duration : null,
        model: GROQ_TRANSCRIPTION_MODEL,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to process transcription request.",
      },
      { status: 500 }
    );
  }
}

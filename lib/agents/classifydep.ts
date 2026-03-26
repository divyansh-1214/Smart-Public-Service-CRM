import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_PLACE_API_KEY,
  maxOutputTokens: 30,
});

const groqModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: 30,
  maxRetries: 2,
});


function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toShortTitle(value: string): string {
  const cleaned = value
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Complaint Reported";

  const words = cleaned.split(" ").slice(0, 6);
  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

function fallbackTitleFromText(input: string): string {
  const words = normalizeText(input).split(" ").filter(Boolean).slice(0, 6);
  if (words.length === 0) {
    return "Complaint Reported";
  }

  return toShortTitle(words.join(" "));
}

export async function decideDiscription(complaint: string): Promise<string> {
  const normalizedComplaint = normalizeText(complaint);

  try {
    const res = await model.invoke(
      `Generate one short complaint title in 5 to 6 words only: ${normalizedComplaint}`
    );

    const geminiTitle = toShortTitle(res.text ?? "");
    if (geminiTitle) {
      return geminiTitle;
    }
  } catch (error) {
    console.warn("Gemini title generation failed, trying Groq fallback", error);
  }

  try {
    const groqRes = await groqModel.invoke([
      [
        "system",
        "Generate a concise complaint title. Respond with exactly one line and at most 6 words.",
      ],
      ["user", `Complaint description: ${normalizedComplaint}`],
    ]);

    const content =
      typeof groqRes.content === "string"
        ? groqRes.content
        : JSON.stringify(groqRes.content ?? "");

    const groqTitle = toShortTitle(content);
    if (groqTitle) {
      return groqTitle;
    }
  } catch (error) {
    console.warn("Groq title generation failed, using deterministic fallback", error);
  }

  return fallbackTitleFromText(normalizedComplaint);
}

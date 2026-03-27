import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ComplaintCategory, Priority } from "@prisma/client";

export type ComplaintPrediction = {
  predictedCategory: ComplaintCategory;
  predictedPriority: Priority;
  confidence: number;
  alternativeCategories: Array<{ category: ComplaintCategory; confidence: number }>;
  modelVersion: string;
};

type ParsedPrediction = {
  category?: string;
  priority?: string;
  confidence?: number;
  alternatives?: Array<{ category?: string; confidence?: number }>;
};

const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_PLACE_API_KEY,
  maxOutputTokens: 200,
});

const groqModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: 200,
  maxRetries: 2,
});

const categoryKeywords: Record<ComplaintCategory, string[]> = {
  POTHOLE: ["pothole", "road crack", "damaged road", "broken road"],
  STREETLIGHT: ["streetlight", "street light", "light pole", "dark street"],
  GARBAGE: ["garbage", "waste", "trash", "overflowing bin", "dump"],
  WATER_SUPPLY: ["water", "pipeline", "leakage", "no water", "sewage water"],
  SANITATION: ["toilet", "drain", "sewer", "filth", "unclean"],
  NOISE_POLLUTION: ["noise", "loud", "horn", "sound", "disturbance"],
  ROAD_DAMAGE: ["road damage", "broken divider", "collapsed road", "uneven road"],
  ILLEGAL_CONSTRUCTION: ["illegal construction", "encroachment", "unauthorized building"],
  OTHER: [],
};

const criticalityKeywords: Array<{ priority: Priority; keywords: string[]; score: number }> = [
  {
    priority: Priority.CRITICAL,
    score: 5,
    keywords: [
      "accident",
      "injury",
      "danger",
      "life threatening",
      "electrocution",
      "fire",
      "collapsed",
      "emergency",
    ],
  },
  {
    priority: Priority.HIGH,
    score: 4,
    keywords: ["urgent", "severe", "major", "flooding", "large", "blocked road"],
  },
  {
    priority: Priority.MEDIUM,
    score: 3,
    keywords: ["issue", "problem", "not working", "frequent", "pending"],
  },
  {
    priority: Priority.LOW,
    score: 2,
    keywords: ["minor", "small", "less urgent", "clean up"],
  },
  {
    priority: Priority.MINIMAL,
    score: 1,
    keywords: ["suggestion", "improvement", "request"],
  },
];

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseJsonPrediction(raw: string): ParsedPrediction | null {
  try {
    return JSON.parse(raw) as ParsedPrediction;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as ParsedPrediction;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toCategory(value: unknown): ComplaintCategory | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (Object.values(ComplaintCategory) as string[]).includes(normalized)
    ? (normalized as ComplaintCategory)
    : null;
}

function toPriority(value: unknown): Priority | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (Object.values(Priority) as string[]).includes(normalized)
    ? (normalized as Priority)
    : null;
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function deterministicFallback(description: string): ComplaintPrediction {
  const text = normalizeText(description);

  const categoryScores = Object.entries(categoryKeywords).map(([category, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      return text.includes(keyword) ? acc + keyword.split(" ").length : acc;
    }, 0);

    return { category: category as ComplaintCategory, score };
  });

  categoryScores.sort((a, b) => b.score - a.score);
  const primary = categoryScores[0] && categoryScores[0].score > 0
    ? categoryScores[0].category
    : ComplaintCategory.OTHER;

  const alternatives = categoryScores
    .filter((entry) => entry.score > 0 && entry.category !== primary)
    .slice(0, 2)
    .map((entry) => ({
      category: entry.category,
      confidence: clampConfidence(0.35 + entry.score * 0.08),
    }));

  const matchedPriority = criticalityKeywords
    .map((rule) => {
      const hits = rule.keywords.filter((keyword) => text.includes(keyword)).length;
      return { priority: rule.priority, score: hits * rule.score };
    })
    .sort((a, b) => b.score - a.score)[0];

  const predictedPriority = matchedPriority && matchedPriority.score > 0
    ? matchedPriority.priority
    : Priority.MEDIUM;

  return {
    predictedCategory: primary,
    predictedPriority,
    confidence: primary === ComplaintCategory.OTHER ? 0.52 : 0.7,
    alternativeCategories: alternatives,
    modelVersion: "deterministic-v1",
  };
}

function normalizePrediction(
  parsed: ParsedPrediction,
  modelVersion: string,
): ComplaintPrediction | null {
  const predictedCategory = toCategory(parsed.category);
  const predictedPriority = toPriority(parsed.priority);

  if (!predictedCategory || !predictedPriority) {
    return null;
  }

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? clampConfidence(parsed.confidence)
      : 0.65;

  const alternativeCategories = Array.isArray(parsed.alternatives)
    ? parsed.alternatives
        .map((item) => {
          const category = toCategory(item.category);
          const itemConfidence =
            typeof item.confidence === "number" && Number.isFinite(item.confidence)
              ? clampConfidence(item.confidence)
              : 0.4;

          if (!category || category === predictedCategory) {
            return null;
          }

          return {
            category,
            confidence: itemConfidence,
          };
        })
        .filter((item): item is { category: ComplaintCategory; confidence: number } => item !== null)
        .slice(0, 2)
    : [];

  return {
    predictedCategory,
    predictedPriority,
    confidence,
    alternativeCategories,
    modelVersion,
  };
}

const systemPrompt =
  "You classify civic complaints. Respond only with strict JSON: " +
  "{\"category\": ComplaintCategory, \"priority\": Priority, \"confidence\": number 0..1, " +
  "\"alternatives\": [{\"category\": ComplaintCategory, \"confidence\": number 0..1}]}.";

async function predictWithGemini(description: string): Promise<ComplaintPrediction | null> {
  const response = await geminiModel.invoke([
    ["system", systemPrompt],
    [
      "user",
      `Description: ${description}. Allowed categories: ${Object.values(ComplaintCategory).join(", ")}. Allowed priorities: ${Object.values(Priority).join(", ")}.`,
    ],
  ]);

  const parsed = parseJsonPrediction(response.text ?? "");
  if (!parsed) return null;
  return normalizePrediction(parsed, "gemini-2.5-flash-lite");
}

async function predictWithGroq(description: string): Promise<ComplaintPrediction | null> {
  const response = await groqModel.invoke([
    ["system", systemPrompt],
    [
      "user",
      `Description: ${description}. Allowed categories: ${Object.values(ComplaintCategory).join(", ")}. Allowed priorities: ${Object.values(Priority).join(", ")}.`,
    ],
  ]);

  const raw = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content ?? "");

  const parsed = parseJsonPrediction(raw);
  if (!parsed) return null;
  return normalizePrediction(parsed, "llama-3.3-70b-versatile");
}

export async function predictComplaintCategoryAndCriticality(
  description: string,
): Promise<ComplaintPrediction> {
  try {
    const geminiPrediction = await predictWithGemini(description);
    if (geminiPrediction) {
      return geminiPrediction;
    }
  } catch (error) {
    console.warn("Gemini complaint prediction failed, trying Groq fallback", error);
  }

  try {
    const groqPrediction = await predictWithGroq(description);
    if (groqPrediction) {
      return groqPrediction;
    }
  } catch (error) {
    console.warn("Groq complaint prediction failed, using deterministic fallback", error);
  }

  return deterministicFallback(description);
}

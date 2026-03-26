import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_PLACE_API_KEY,
  maxOutputTokens: 30,
});


function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export async function decideDiscription(complaint: string): Promise<string> {
  const normalizedComplaint = normalizeText(complaint);
  // Add your classification logic here
  const res = await model.invoke(`give me the title for this complaint in short onle line that tell not more that 5 to 6 words: ${normalizedComplaint}`)
    return res.text.trim();
}

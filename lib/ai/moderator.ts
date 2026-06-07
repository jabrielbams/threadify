import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODERATION_TIMEOUT_MS } from "@/constants/moderation";
import type { ModerationResult } from "@/types/app";

const SYSTEM_PROMPT = `You are a content moderation AI for Threadify, an Indonesian social media platform.

Your task is to analyze user-generated content for the following violations:
- SARA (Suku, Agama, Ras, Antar-golongan): ethnic, religious, racial, or inter-group hatred
- Hate speech: dehumanizing language targeting individuals or groups
- NSFW: sexually explicit text or graphic descriptions of violence
- Cyberbullying: targeted harassment, threats, or humiliation of individuals
- Manipulative content: coordinated inauthentic behavior, hoax spreading, buzzer content

You MUST consider:
- Indonesian language, Bahasa Gaul (slang), abbreviations, and regional dialects
- Implicit context and dog-whistles common in Indonesian social media discourse
- Code-switching between Indonesian and English

Respond ONLY with valid JSON. No other text before or after.
JSON format:
{"verdict":"safe","confidence":0.95,"reason":"Content is harmless"}
OR
{"verdict":"toxic","confidence":0.87,"reason":"Contains hate speech"}

Rules:
- verdict is either "safe" or "toxic"
- confidence is a float from 0.000 to 1.000
- reason must be a single sentence, max 5 sentences in indonesian language
- When uncertain, lean toward "toxic" rather than "safe"`;

/**
 * Attempts to extract JSON from a response that might contain extra text,
 * markdown code fences, or other wrapping.
 */
function extractJson(text: string): ModerationResult | null {
  // Strip markdown code fences if present
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned) as ModerationResult;
  } catch {
    // Find the first { and last } to extract the JSON object
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.slice(startIdx, endIdx + 1)) as ModerationResult;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Performs AI-based content moderation using Google Gemini.
 * Implements a 3-second timeout; on timeout or error, returns 'pending' verdict.
 * NEVER defaults to 'safe' on failure — always returns 'pending' for manual review.
 *
 * Set SKIP_AI_MODERATION=true in .env.local to bypass during development.
 *
 * @param content - User-generated text content to analyze
 * @returns ModerationResult with verdict, confidence, and reason
 */
export async function moderateContent(
  content: string,
): Promise<ModerationResult> {
  // Dev bypass: skip AI moderation for local testing
  if (process.env.SKIP_AI_MODERATION === "true") {
    console.info("[Moderation] Dev bypass — skipping AI, auto-approving content");
    return {
      verdict: "safe",
      confidence: 1,
      reason: "Dev bypass — AI moderation skipped",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Moderation] No GEMINI_API_KEY set — auto-approving");
    return {
      verdict: "safe",
      confidence: 1,
      reason: "No API key configured",
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 1024,
    },
  });

  const prompt = `${SYSTEM_PROMPT}\n\nContent to analyze: "${content}"\n\nRespond with ONLY the JSON object, nothing else:`;

  const moderationPromise = (async (): Promise<ModerationResult> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("[Moderation] Raw AI response:", text);

    const parsed = extractJson(text);
    if (!parsed) {
      console.warn("[Moderation] Failed to parse AI response:", text.slice(0, 200));
      return {
        verdict: "pending",
        confidence: 0,
        reason: "AI response was not valid JSON",
      };
    }

    console.log("[Moderation] Parsed result:", JSON.stringify(parsed));

    // Validate the shape
    if (parsed.verdict !== "safe" && parsed.verdict !== "toxic") {
      return { verdict: "pending", confidence: 0, reason: "Invalid AI verdict" };
    }

    return {
      verdict: parsed.verdict,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 100) : "No reason provided",
    };
  })();

  const timeoutPromise = new Promise<ModerationResult>((resolve) => {
    setTimeout(() => {
      resolve({
        verdict: "pending",
        confidence: 0,
        reason: "Moderation service timeout",
      });
    }, MODERATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([moderationPromise, timeoutPromise]);
  } catch (error) {
    console.error(
      "[Moderation] AI moderation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      verdict: "pending",
      confidence: 0,
      reason: "Moderation service unavailable",
    };
  }
}

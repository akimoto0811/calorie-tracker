import "server-only";
import type { LabelReader } from "./types";
import { GeminiLabelReader } from "./gemini";

/**
 * Picks the label-reading AI from the AI_PROVIDER environment variable.
 * To add another provider: implement LabelReader in a new file and add a case here.
 */
export function getLabelReader(): LabelReader {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  switch (provider) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Label reading is not set up yet (GEMINI_API_KEY is missing).");
      return new GeminiLabelReader(key, process.env.GEMINI_MODEL || undefined);
    }
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}".`);
  }
}

export type { LabelReading } from "./types";

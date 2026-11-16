import "server-only";
import type { LabelReader, LabelReading } from "./types";
import { LABEL_PROMPT } from "./types";
import { NUTRIENT_KEYS } from "../types";

const NUM = { type: "NUMBER", nullable: true };
const STR = { type: "STRING", nullable: true };

// Nutrients come back as a list of { field, value } pairs rather than one property each:
// a schema with ~50 optional properties is too complex for Gemini and gets rejected.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: STR,
    brand: STR,
    serving_label: STR,
    nutrients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { field: { type: "STRING" }, value: { type: "NUMBER" } },
        required: ["field", "value"],
      },
    },
    uncertain: { type: "ARRAY", items: { type: "STRING" } },
    note: STR,
  },
  required: ["nutrients", "uncertain"],
};

export class GeminiLabelReader implements LabelReader {
  readonly name = "Gemini";

  constructor(
    private apiKey: string,
    private model = "gemini-2.5-flash",
  ) {}

  async readLabel(image: { data: Buffer; mimeType: string }): Promise<LabelReading> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model,
    )}:generateContent`;

    const call = (withSchema: boolean) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: LABEL_PROMPT },
                { inline_data: { mime_type: image.mimeType, data: image.data.toString("base64") } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            ...(withSchema ? { responseSchema: RESPONSE_SCHEMA } : {}),
          },
        }),
      });

    let res = await call(true);
    // If Gemini rejects the request shape, ask again with plain JSON output.
    if (res.status === 400) {
      console.error("Gemini rejected the schema, retrying without it:", (await res.text().catch(() => "")).slice(0, 500));
      res = await call(false);
    }

    if (res.status === 429) {
      throw new Error("The free AI quota is used up for now. Try again in a minute, or enter the values by hand.");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Gemini error", res.status, detail.slice(0, 500));
      throw new Error(
        res.status === 401 || res.status === 403
          ? "The AI key isn't working. Check GEMINI_API_KEY in Vercel, or enter the values by hand."
          : `The AI could not read this photo (error ${res.status}). Try again, or enter the values by hand.`,
      );
    }

    const body = await res.json();
    const text: string | undefined = body?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) throw new Error("The AI returned no answer. Try a clearer photo.");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("The AI answer could not be understood. Try again.");
    }

    const n = (k: string) => {
      const v = parsed[k];
      return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
    };
    const s = (k: string) => {
      const v = parsed[k];
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };

    // { field, value } pairs from the schema; flat keys are accepted too (the retry without a schema).
    const fromList = new Map<string, number>();
    if (Array.isArray(parsed.nutrients)) {
      for (const item of parsed.nutrients as { field?: unknown; value?: unknown }[]) {
        if (typeof item?.field === "string" && typeof item.value === "number" && Number.isFinite(item.value) && item.value >= 0) {
          fromList.set(item.field.trim(), item.value);
        }
      }
    }

    return {
      name: s("name"),
      brand: s("brand"),
      serving_label: s("serving_label"),
      values: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, fromList.get(k) ?? n(k)])),
      uncertain: Array.isArray(parsed.uncertain)
        ? (parsed.uncertain as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      note: s("note"),
    };
  }
}

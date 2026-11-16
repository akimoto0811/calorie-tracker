import "server-only";
import type { LabelReader, LabelReading } from "./types";
import { LABEL_PROMPT } from "./types";
import { NUTRIENT_KEYS } from "../types";

const NUM = { type: "NUMBER", nullable: true };
const STR = { type: "STRING", nullable: true };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: STR,
    brand: STR,
    serving_label: STR,
    ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, NUM])),
    uncertain: { type: "ARRAY", items: { type: "STRING" } },
    note: STR,
  },
  required: ["uncertain"],
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

    const res = await fetch(url, {
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
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (res.status === 429) {
      throw new Error("The free AI quota is used up for now. Try again in a minute, or enter the values by hand.");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Gemini error", res.status, detail.slice(0, 500));
      throw new Error("The AI could not read this photo. Try again, or enter the values by hand.");
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

    return {
      name: s("name"),
      brand: s("brand"),
      serving_label: s("serving_label"),
      values: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, n(k)])),
      uncertain: Array.isArray(parsed.uncertain)
        ? (parsed.uncertain as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      note: s("note"),
    };
  }
}

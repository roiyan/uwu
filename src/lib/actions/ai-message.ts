"use server";

import { requireSessionUserFast } from "@/lib/auth-guard";
import { buildPrompt } from "@/lib/ai/prompt-builder";
import {
  aiMessageInputSchema,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

const MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES = 3;

export type GenerateResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

export async function generateBroadcastMessage(
  raw: AiMessageInput,
): Promise<GenerateResult> {
  const user = await requireSessionUserFast();
  if (!user) return { ok: false, error: "Silakan masuk kembali." };

  const parsed = aiMessageInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ada yang kurang — pastikan semua opsi dipilih.",
    };
  }
  const input = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Asisten AI belum diaktifkan." };
  }

  const { system, user: userPrompt } = buildPrompt(input);

  let body: GeminiResponse;
  try {
    body = await callGeminiWithRetry(apiKey, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.8,
        topP: 0.95,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menghubungi asisten AI.";
    console.error("[ai-message] generation failed", err);
    return { ok: false, error: message };
  }

  if (body.promptFeedback?.blockReason) {
    console.error(
      "[ai-message] prompt blocked",
      body.promptFeedback.blockReason,
    );
    return { ok: false, error: "Pesan diblokir filter AI. Ubah preferensi." };
  }

  const text = body.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    console.error("[ai-message] empty response", body);
    return { ok: false, error: "AI tidak menghasilkan pesan. Coba lagi." };
  }

  return { ok: true, message: text };
}

async function callGeminiWithRetry(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Network error");
      // Network blip — backoff and retry
      await sleep(backoffMs(attempt));
      continue;
    }

    if (res.status === 429) {
      // Rate limited. Gemini's 429 body explains *which* quota was hit
      // (per-minute RPM, per-day, per-million-tokens) under
      // error.details[].quotaMetric — surface it to the server logs so
      // operators can decide whether to bump tier or wait. The user
      // still sees a generic "Sedang ramai" message.
      const errText = await safeText(res);
      console.error(
        `[ai-message] 429 from gemini (attempt ${attempt + 1}/${MAX_RETRIES})`,
        errText.slice(0, 600),
      );
      lastError = new Error("Sedang ramai — coba lagi dalam beberapa detik.");
      await sleep(backoffMs(attempt));
      continue;
    }

    if (!res.ok) {
      const errText = await safeText(res);
      console.error(
        `[ai-message] non-2xx ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES})`,
        errText.slice(0, 600),
      );
      if (res.status === 403)
        throw new Error("API key belum aktif. Hubungi admin.");
      if (res.status === 400)
        throw new Error("Ada yang kurang — pastikan semua opsi dipilih.");
      if (res.status >= 500) {
        // Server-side hiccup — worth a retry
        lastError = new Error("Layanan AI sedang gangguan. Coba lagi.");
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(`Asisten AI error (${res.status}).`);
    }

    const json = (await res.json().catch(() => null)) as GeminiResponse | null;
    if (!json) throw new Error("Respons AI tidak terbaca. Coba lagi.");
    return json;
  }

  // All retries exhausted — make this loud in the logs so the silent-
  // failure pattern doesn't return.
  console.error(
    "[ai-message] all retries exhausted",
    lastError?.message ?? "unknown",
  );
  throw (
    lastError ??
    new Error("Sedang ramai — coba lagi dalam beberapa detik.")
  );
}

function backoffMs(attempt: number): number {
  return Math.pow(2, attempt) * 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

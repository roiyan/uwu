"use server";

import { requireSessionUserFast } from "@/lib/auth-guard";
import { buildPrompt } from "@/lib/ai/prompt-builder";
import {
  aiMessageInputSchema,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

// `gemini-1.5-flash` is end-of-life as of late 2025 — calls now
// 404 with `models/gemini-1.5-flash is not found for API version
// v1beta`. Switch to the current GA fast model. Response JSON
// shape is identical across 1.5 / 2.0 / 2.5, so the parser below
// stays unchanged.
const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES = 3;

export type GenerateResult =
  | {
      ok: true;
      /** Body of the message (WA: full text; email: body without subject). */
      message: string;
      /** Email subject line, parsed from the model's `SUBJECT:` prefix.
       *  Always undefined for the WhatsApp channel. */
      subject?: string;
    }
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

  // Output budget: WA messages cap around 7-10 lines, email bodies
  // around 14 lines + a short subject. 400 / 600 tokens cover both
  // with headroom; pushing higher just bills the user for tokens
  // the prompt explicitly asks the model not to emit.
  const maxOutputTokens = input.channel === "email" ? 600 : 400;

  let body: GeminiResponse;
  try {
    body = await callGeminiWithRetry(apiKey, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens,
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

  // Email prompt asks for a `SUBJECT:` / `BODY:` framed output so the
  // composer can populate the two fields independently. Fall back to
  // treating the whole text as body when the model ignores the
  // framing — keeps WhatsApp-only flows untouched.
  if (input.channel === "email") {
    const subjectMatch = text.match(/^\s*SUBJECT:\s*(.+?)\s*$/im);
    const bodyMatch = text.match(/^\s*BODY:\s*([\s\S]+)$/im);
    const subject = subjectMatch?.[1]?.trim();
    const messageBody = bodyMatch?.[1]?.trim() ?? text;
    return {
      ok: true,
      message: messageBody,
      subject: subject || undefined,
    };
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
      // Rate limited — exponential backoff (2s, 4s, 8s)
      lastError = new Error("Sedang ramai — coba lagi dalam beberapa detik.");
      await sleep(backoffMs(attempt));
      continue;
    }

    if (!res.ok) {
      const errText = await safeText(res);
      console.error("[ai-message] non-2xx", res.status, errText.slice(0, 400));
      if (res.status === 403)
        throw new Error("API key belum aktif. Hubungi admin.");
      if (res.status === 404)
        // Hits when Google retires the configured model (e.g. 1.5
        // sunset late 2025). User can't fix this — surface it
        // clearly so the operator pings us instead of guessing.
        throw new Error("Model AI tidak tersedia. Hubungi admin.");
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

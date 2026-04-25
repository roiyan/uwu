"use server";

import { requireSessionUserFast } from "@/lib/auth-guard";
import {
  aiMessageInputSchema,
  RECIPIENT_RELATION_LABEL,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

// Gemini 2.0 Flash — generous free tier (15 RPM) and ~30× cheaper than
// Claude Sonnet for paid usage. The system prompt below is model-
// agnostic; only the transport differs from the prior Anthropic call.
const MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GenerateResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Generate a personalised broadcast invitation body via Google's
 * Gemini API. The user-facing text comes back already formatted for
 * the target channel (WhatsApp = emojis OK; Email = formal, no emojis).
 *
 * The action is hidden in the UI when GEMINI_API_KEY is unset, so
 * normal callers won't hit the "AI belum dikonfigurasi" path. The
 * guard is here for defense-in-depth in case the key is wiped after a
 * page render.
 */
export async function generateBroadcastMessage(
  raw: AiMessageInput,
): Promise<GenerateResult> {
  const user = await requireSessionUserFast();
  if (!user) return { ok: false, error: "Tidak ter-autentikasi." };

  const parsed = aiMessageInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const input = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Asisten AI belum dikonfigurasi.",
    };
  }

  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);

  let res: Response;
  try {
    // API key passed via x-goog-api-key header rather than the
    // ?key= query string — keeps it out of access logs.
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
        },
      }),
    });
  } catch (err) {
    console.error("[ai-message] fetch failed", err);
    return { ok: false, error: "Gagal menghubungi layanan AI." };
  }

  if (!res.ok) {
    const errBody = await safeText(res);
    console.error("[ai-message] non-2xx", res.status, errBody.slice(0, 400));
    return {
      ok: false,
      error: `Gagal generate pesan (${res.status}).`,
    };
  }

  const body = (await res.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      }
    | null;

  // Gemini may block the response upstream (safety filters etc.) —
  // surface that as a clear error rather than a generic "empty".
  if (body?.promptFeedback?.blockReason) {
    console.error(
      "[ai-message] prompt blocked",
      body.promptFeedback.blockReason,
    );
    return { ok: false, error: "Pesan diblokir filter AI. Ubah preferensi." };
  }

  const text = body?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    console.error("[ai-message] empty response", body);
    return { ok: false, error: "Pesan kosong dari AI. Coba lagi." };
  }

  return { ok: true, message: text };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * System prompt — encodes the writer's role + every rule the model
 * must respect. Kept readable so we can tune fast without re-deriving
 * intent.
 */
function buildSystemPrompt(input: AiMessageInput): string {
  const channelLabel = input.channel === "whatsapp" ? "WhatsApp" : "email";
  const cultures = mergeCultures(input);
  const language = mergeLanguage(input);
  const eventTypes = input.eventTypes
    .map((t) =>
      t === "akad" ? "Akad/Pemberkatan" : t === "resepsi" ? "Resepsi" : "Keduanya",
    )
    .join(", ");
  const relation = RECIPIENT_RELATION_LABEL[input.recipientRelation];
  const lengthGuide =
    input.length === "singkat"
      ? "singkat (~3 baris isi)"
      : input.length === "sedang"
        ? "sedang (~5 baris isi)"
        : "lengkap (~8 baris isi)";

  const date = input.eventContext.eventDate ?? "(belum ditentukan)";
  const venue = input.eventContext.venue ?? "(belum ditentukan)";

  return [
    "Kamu adalah penulis undangan pernikahan Indonesia yang berpengalaman.",
    "",
    `Tugas: tulis pesan undangan pernikahan untuk dikirim via ${channelLabel}.`,
    "",
    "KONTEKS PERNIKAHAN (dari database — JANGAN minta user mengisi ulang):",
    `- Mempelai: ${input.eventContext.coupleName}`,
    `- Tanggal: ${date}`,
    `- Lokasi: ${venue}`,
    `- Slug undangan: ${input.eventContext.slug}`,
    "",
    "PREFERENSI USER:",
    `- Gaya bahasa: ${input.tone}`,
    `- Nuansa budaya: ${cultures}`,
    `- Jenis acara: ${eventTypes}`,
    `- Hubungan penerima: ${relation}`,
    `- Bahasa: ${language}`,
    `- Panjang: ${lengthGuide}`,
    input.customNotes
      ? `- Catatan tambahan: ${input.customNotes.slice(0, 200)}`
      : "",
    "",
    "ATURAN WAJIB:",
    "1. HARUS sertakan variabel {panggilan} untuk sapaan personal.",
    "2. HARUS sertakan variabel {link_undangan} untuk link undangan.",
    "3. Boleh sertakan {nama} jika relevan.",
    "4. JANGAN sertakan variabel lain selain {nama}, {panggilan}, {link_undangan}.",
    "5. Jika nuansa Islam: gunakan salam dan doa yang sesuai.",
    "6. Jika nuansa Kristen/Katolik: gunakan salam dan berkat yang sesuai.",
    "7. Jika adat tertentu: gunakan sapaan dan frasa khas adat tersebut.",
    "8. Jika campuran budaya: blend dengan natural, jangan terasa awkward.",
    `9. ${
      input.channel === "whatsapp"
        ? "Boleh pakai emoji secukupnya, jangan berlebihan."
        : "Lebih formal, tanpa emoji."
    }`,
    "10. Tulis HANYA pesan, tanpa penjelasan, tanpa pembuka, tanpa catatan tambahan.",
    `11. Panjang ${lengthGuide}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUserPrompt(input: AiMessageInput): string {
  const channelLabel = input.channel === "whatsapp" ? "WhatsApp" : "email";
  return `Tulis pesan undangan pernikahan untuk ${channelLabel} dengan preferensi di atas. Langsung tulis pesannya saja, tanpa pembuka atau penjelasan.`;
}

function mergeCultures(input: AiMessageInput): string {
  const parts = [...input.cultures];
  const custom = input.customCulture?.trim();
  if (custom && !parts.some((c) => c.toLowerCase() === custom.toLowerCase())) {
    parts.push(custom);
  }
  return parts.join(", ");
}

function mergeLanguage(input: AiMessageInput): string {
  const custom = input.customLanguage?.trim();
  if (custom) return `${input.language} + ${custom}`;
  return input.language;
}

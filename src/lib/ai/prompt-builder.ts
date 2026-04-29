import {
  RECIPIENT_RELATION_LABEL,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

// Slim prompt builders for the broadcast AI helper. The previous
// implementation rendered ~3 kB of bullet-point ruleset per call
// (every tone × every relation × every culture × etc.), which on
// `gemini-2.5-flash` translates to ~3 000 input tokens for a single
// generation. Most of that bulk was redundant — the model already
// handles tone / register from a one-line cue. The builders below
// target ~400 tokens for WhatsApp and ~600 for email.
//
// Public API stays the same — `buildPrompt(input)` returns
// `{ system, user }` — so the action layer is unchanged.

const TONE_LINES: Record<AiMessageInput["tone"], string> = {
  formal: "formal dan sopan",
  santai: "santai dan akrab",
  puitis: "puitis dan romantis",
};

const LENGTH_WA: Record<AiMessageInput["length"], string> = {
  singkat: "2–3 baris (langsung inti, untuk reminder)",
  sedang: "4–6 baris (salam + inti + link + penutup)",
  lengkap: "7–10 baris (lengkap, untuk undangan utama)",
};

const LENGTH_EMAIL: Record<AiMessageInput["length"], string> = {
  singkat: "1 paragraf (3–4 kalimat)",
  sedang: "2–3 paragraf (6–8 kalimat total)",
  lengkap: "3–4 paragraf (10–14 kalimat total)",
};

const RELATION_LINES: Record<AiMessageInput["recipientRelation"], string> = {
  umum: "sapaan universal Bapak/Ibu/Saudara/i, tengah-tengah formalitas",
  keluarga: "sapaan kekeluargaan, hangat, sertakan permohonan doa restu",
  teman_dekat: "casual personal, energi 'kamu harus datang'",
  rekan_kerja: "profesional tapi hangat, singkat dan jelas",
  atasan: "sangat sopan, kehadiran sebagai kehormatan, tanpa casual",
  kenalan: "netral, sopan, langsung ke inti",
};

// Compress 13 cultures into 4 buckets — model already knows the
// nuances; we just need to flag which register to use. Adat-only
// entries get a one-liner so the unggah-ungguh / siri / horas cue
// still lands.
function cultureCue(cultures: string[], custom?: string): string {
  const list = cultures.length > 0 ? cultures : ["Umum"];
  const lines: string[] = [];

  for (const c of list) {
    if (c === "Islam") {
      lines.push(
        "Islam: buka 'Assalamu'alaikum Warahmatullahi Wabarakatuh', tutup 'Wassalamu'alaikum…', sisipkan doa islami (insyaAllah / barakallah).",
      );
    } else if (c === "Kristen Protestan") {
      lines.push(
        "Kristen Protestan: salam 'Salam sejahtera dalam kasih Tuhan', tutup 'Tuhan memberkati'.",
      );
    } else if (c === "Katolik") {
      lines.push(
        "Katolik: buka 'Dengan rahmat Tuhan Yang Maha Esa', tutup berkat Tuhan, sedikit lebih formal dari Protestan.",
      );
    } else if (c === "Hindu Bali") {
      lines.push(
        "Hindu Bali: buka 'Om Swastyastu', tutup 'Om Shanti Shanti Shanti Om'.",
      );
    } else if (c === "Buddha") {
      lines.push("Buddha: buka 'Namo Buddhaya', tone tenang dan bermakna.");
    } else if (c === "Konghucu") {
      lines.push(
        "Konghucu: rasa syukur kepada Tian, hormat leluhur, tone harmonis.",
      );
    } else if (c.startsWith("Adat ")) {
      const adat = c.replace("Adat ", "");
      lines.push(
        `Adat ${adat}: gunakan unggah-ungguh / sapaan khas ${adat} (mis. Jawa: ngaturaken/rawuh; Sunda: wilujeng; Batak: horas; Minang: pepatah). Tetap sopan dan natural.`,
      );
    } else if (c === "Umum") {
      lines.push("Umum: netral, tanpa nuansa agama spesifik, cocok semua kalangan.");
    } else {
      lines.push(`${c}: gunakan sapaan dan nuansa khas ${c} secara natural.`);
    }
  }

  if (custom?.trim()) {
    lines.push(`Tambahan: ${custom.trim()}.`);
  }
  if (list.length > 1) {
    lines.push(
      "Pernikahan campuran: blend natural, prioritas salam dari budaya pertama.",
    );
  }
  return lines.join("\n");
}

function eventTypeLine(types: AiMessageInput["eventTypes"]): string {
  const labels = types.map((t) =>
    t === "akad" ? "Akad/Pemberkatan" : t === "resepsi" ? "Resepsi" : "Akad + Resepsi",
  );
  return labels.join(", ");
}

function languageLine(input: AiMessageInput): string {
  const custom = input.customLanguage?.trim();
  return custom ? `${input.language} + ${custom}` : input.language;
}

function commonContext(input: AiMessageInput): string {
  const ec = input.eventContext;
  const bride = ec.brideName ?? "(mempelai wanita)";
  const groom = ec.groomName ?? "(mempelai pria)";
  const date = ec.eventDate ?? "(tanggal menyusul)";
  const venue = ec.venue ?? "(lokasi menyusul)";
  const relation = RECIPIENT_RELATION_LABEL[input.recipientRelation] ?? "Umum";

  return `DATA ACARA:
- Mempelai: ${bride} & ${groom}
- Acara: ${eventTypeLine(input.eventTypes)}
- Tanggal: ${date}
- Lokasi: ${venue}

PENERIMA: ${relation} — ${RELATION_LINES[input.recipientRelation]}

FORMAT:
- Bahasa: ${languageLine(input)}
- Nada: ${TONE_LINES[input.tone]}
- Budaya: ${cultureCue(input.cultures, input.customCulture)}`;
}

// `{date}` and `{venue}` were marked optional in earlier iterations
// and the model often dropped them entirely on shorter outputs —
// users complained that the generated message "tidak ada tanggal /
// lokasi". They're now WAJIB on `sedang` / `lengkap` because every
// proper wedding invitation needs the where-and-when. Substitution
// happens server-side before sending each guest's message (see the
// broadcast pipeline), so the AI's job here is just to leave the
// placeholders in the right spots.
const VARIABLE_RULES = `VARIABEL (HANYA INI — placeholder template, akan diganti otomatis saat kirim):
- {panggilan} → sapaan personal tamu — WAJIB minimal 1×
- {link_undangan} → link undangan digital — WAJIB minimal 1×
- {date} → tanggal acara — WAJIB minimal 1× untuk panjang sedang & lengkap
- {venue} → lokasi acara — WAJIB minimal 1× untuk panjang sedang & lengkap
- {nama}, {bride}, {groom} → opsional
DILARANG: tulis nama mempelai / tanggal / lokasi sebagai teks biasa (HARUS pakai variabel di atas), buat variabel baru, output dalam HURUF KAPITAL semua, atau menulis ulang label kurung kurawal seperti "[Nama]" / "[Tanggal]".`;

function buildWaPrompt(input: AiMessageInput): string {
  const customNote = input.customNotes?.trim()
    ? `\n- Catatan khusus: ${input.customNotes.trim().slice(0, 200)}`
    : "";

  return `Tulis pesan undangan pernikahan untuk WhatsApp.

${commonContext(input)}
- Panjang: ${LENGTH_WA[input.length]}${customNote}

CHANNEL WA:
- Line breaks untuk readability, bukan paragraf panjang.
- Bold pakai *teks*, italic pakai _teks_.
- Emoji secukupnya (formal max 2, santai max 5, puitis max 3).
- Link plain URL.

${VARIABLE_RULES}

OUTPUT: pesan saja, langsung dari salam pertama. Tanpa pembuka penjelasan, tanpa code block.`;
}

function buildEmailPrompt(input: AiMessageInput): string {
  const customNote = input.customNotes?.trim()
    ? `\n- Catatan khusus: ${input.customNotes.trim().slice(0, 200)}`
    : "";

  return `Tulis email undangan pernikahan.

${commonContext(input)}
- Panjang isi: ${LENGTH_EMAIL[input.length]}${customNote}

CHANNEL EMAIL:
- Format formal terstruktur, paragraf rapi (line breaks antar paragraf).
- TIDAK ada emoji.
- Link bisa dibungkus "Buka undangan: {link_undangan}".

${VARIABLE_RULES}

OUTPUT FORMAT (wajib persis):
SUBJECT: [subject line, max 60 karakter, menarik]
BODY:
[isi email]`;
}

export function buildPrompt(input: AiMessageInput): {
  system: string;
  user: string;
} {
  // System prompt is now a single sentence — the model already
  // knows how to write Indonesian wedding invitations; the heavy
  // lifting happens in the user prompt's structured cues.
  const system =
    "Kamu adalah penulis undangan pernikahan Indonesia yang berpengalaman. Pilih kata yang tepat untuk konteks penerima dan budaya yang diminta.";

  const user =
    input.channel === "email" ? buildEmailPrompt(input) : buildWaPrompt(input);

  return { system, user };
}

import {
  RECIPIENT_RELATION_LABEL,
  type AiMessageInput,
} from "@/lib/schemas/ai-message";

const TONE_RULES: Record<AiMessageInput["tone"], string> = {
  formal: `NADA FORMAL:
- Gunakan sapaan resmi: "Dengan hormat" / "Yang terhormat" / sapaan budaya yang setara
- Struktur: salam → undangan → detail acara → link → penutup doa
- Bahasa baku, tidak ada singkatan, tidak ada emoji (kecuali channel WhatsApp boleh 1-2 emoji sopan)
- Cocok untuk: atasan, keluarga besar, relasi formal`,
  santai: `NADA SANTAI:
- Sapaan akrab: "Hai" / "Halo" / nama langsung
- Struktur bebas tapi tetap sopan
- Boleh pakai emoji secukupnya (max 3-4 untuk WhatsApp)
- Bahasa sehari-hari, boleh campur formal-informal
- Cocok untuk: teman dekat, sahabat, komunitas`,
  puitis: `NADA PUITIS:
- Buka dengan metafora atau imagery: "Di antara bintang dan doa..."
- Gunakan bahasa figuratif: perumpamaan, personifikasi
- Rhythm dan flow penting — setiap kalimat punya irama
- Tetap ada informasi praktis (tanggal, link) tapi dibungkus indah
- Cocok untuk: semua, terutama undangan yang ingin berkesan`,
};

const RELATION_RULES: Record<AiMessageInput["recipientRelation"], string> = {
  keluarga: `PENERIMA KELUARGA:
- Gunakan sapaan kekeluargaan: "Bapak/Ibu", "Om/Tante", "Kakak/Adik"
- Sertakan permohonan doa restu
- Tone lebih hangat dan personal
- Boleh menyebut hubungan: "sebagai keluarga yang kami cintai"`,
  teman_dekat: `PENERIMA TEMAN DEKAT:
- Boleh lebih casual dan personal
- Bisa reference shared memories secara generic
- Emoji lebih bebas (WhatsApp)
- "Kamu harus datang ya!" energy`,
  rekan_kerja: `PENERIMA REKAN KERJA:
- Professional tapi hangat
- Sapaan: "Bapak/Ibu [nama]" atau "Rekan"
- Tidak terlalu personal, tidak terlalu kaku
- Singkat dan clear`,
  atasan: `PENERIMA ATASAN:
- Sangat sopan dan formal
- "Yang kami hormati Bapak/Ibu..."
- Permohonan kehadiran sebagai kehormatan
- Tidak boleh casual sama sekali`,
  kenalan: `PENERIMA KENALAN:
- Netral dan sopan
- Tidak terlalu personal
- "Bapak/Ibu/Saudara/i"
- Straight to the point`,
  umum: `PENERIMA UMUM (satu pesan untuk semua):
- Gunakan sapaan universal: "Bapak/Ibu/Saudara/i"
- Harus cocok dibaca oleh siapapun
- Tidak terlalu formal, tidak terlalu santai — tengah-tengah
- Variabel {panggilan} akan di-replace per tamu`,
};

const LENGTH_RULES: Record<AiMessageInput["length"], string> = {
  singkat: `PANJANG SINGKAT (~3-4 baris body):
- Salam + 1 kalimat undangan + link + penutup
- Tanpa basa-basi, langsung inti
- Ideal untuk WhatsApp reminder atau follow-up`,
  sedang: `PANJANG SEDANG (~5-6 baris body):
- Salam + undangan + detail acara + link + doa penutup
- Balance antara informatif dan ringkas
- Paling versatile, cocok untuk semua konteks`,
  lengkap: `PANJANG LENGKAP (~8-10 baris body):
- Salam + intro personal + undangan resmi + detail acara lengkap + link + doa + penutup
- Untuk undangan utama / pertama kali kirim
- Boleh lebih elaborate dan emosional`,
};

const CULTURE_MAPPINGS: Record<string, string> = {
  Islam: `ISLAM:
- Buka: "Assalamu'alaikum Warahmatullahi Wabarakatuh"
- Tutup: "Wassalamu'alaikum Warahmatullahi Wabarakatuh"
- Sisipkan: "Dengan memohon rahmat dan ridha Allah SWT"
- Doa: "Semoga Allah memberkahi" / "Barakallahu lakuma"
- JANGAN gunakan salam Kristen/Hindu`,
  "Kristen Protestan": `KRISTEN PROTESTAN:
- Buka: "Salam sejahtera dalam kasih Tuhan"
- Sisipkan: "Dengan mengucap syukur atas anugerah-Nya"
- Doa: "Tuhan memberkati" / "God bless"
- Kutipan Alkitab boleh (singkat)
- JANGAN gunakan salam Islam`,
  Katolik: `KATOLIK:
- Buka: "Dengan rahmat Tuhan Yang Maha Esa"
- Sisipkan: "Dengan penuh sukacita dan syukur"
- Doa: "Semoga Tuhan memberkati perjalanan kami"
- Lebih formal dari Protestan umumnya
- JANGAN gunakan salam Islam`,
  "Hindu Bali": `HINDU BALI:
- Buka: "Om Swastyastu"
- Tutup: "Om Shanti Shanti Shanti Om"
- Sisipkan: "Dengan asung kertha wara nugraha Ida Sang Hyang Widhi Wasa"
- Nuansa: kekhidmatan dan rasa syukur kepada Sang Hyang Widhi`,
  Buddha: `BUDDHA:
- Buka: "Namo Buddhaya"
- Sisipkan: "Dengan penuh rasa syukur"
- Tone: tenang, penuh kesadaran
- Sederhana dan bermakna`,
  Konghucu: `KONGHUCU:
- Buka: "Dengan rasa syukur kepada Tian"
- Nuansa: hormat kepada leluhur, keharmonisan keluarga
- Nilai: ren (kasih), li (tata krama), xiao (bakti)`,
  "Adat Jawa": `ADAT JAWA:
- Nuansa: halus, penuh unggah-ungguh
- Boleh sisipkan: "Dengan segala kerendahan hati"
- Frasa khas: "ngaturaken", "rawuh", "among tamu"
- Jika bahasa Jawa Krama: gunakan krama inggil
- Mencerminkan: kehalusan dan tata krama Jawa`,
  "Adat Sunda": `ADAT SUNDA:
- Nuansa: ramah, hangat, someah hade ka semah
- Boleh sisipkan frasa Sunda: "Wilujeng" (selamat)
- Mencerminkan: keramahan dan kehangatan khas Sunda`,
  "Adat Batak": `ADAT BATAK:
- Nuansa: tegas, penuh harga diri, kekeluargaan kuat
- Bisa sebut marga jika relevan
- Dalihan na tolu: somba (hormat), elek (kasih), manat (hati-hati)
- Frasa: "Horas!" sebagai salam`,
  "Adat Minang": `ADAT MINANG:
- Nuansa: santun, penuh petuah, adat basandi syarak
- Boleh sisipkan pepatah Minang yang relevan
- "Adat basandi syarak, syarak basandi Kitabullah"
- Mencerminkan: kebijaksanaan dan adat yang kuat`,
  "Adat Bugis/Makassar": `ADAT BUGIS/MAKASSAR:
- Nuansa: kehormatan (siri'), keberanian, kekeluargaan
- Nilai: siri' na pacce (harga diri dan empati)
- Formal dan penuh penghormatan`,
  "Adat Bali": `ADAT BALI (non-Hindu):
- Nuansa: keharmonisan, tri hita karana
- Keseimbangan: manusia-manusia, manusia-alam, manusia-Tuhan
- Hangat dan penuh makna spiritual`,
  Umum: `UMUM/NETRAL:
- Tidak ada nuansa agama spesifik
- Sapaan universal: "Dengan hormat" atau langsung nama
- Cocok untuk undangan multi-agama/multi-budaya`,
};

function buildCultureMap(cultures: string[], custom?: string): string {
  if (cultures.length === 0 && !custom) {
    return `BUDAYA: Umum/netral — tidak ada nuansa agama atau adat khusus.`;
  }

  const parts = cultures
    .map(
      (c) =>
        CULTURE_MAPPINGS[c] ??
        `${c}: gunakan sapaan dan nuansa yang sesuai dengan budaya ${c}.`,
    )
    .join("\n\n");

  const customPart = custom?.trim()
    ? `\nBUDAYA TAMBAHAN: ${custom.trim()} — gunakan sapaan dan nuansa yang sesuai, blend secara natural dengan budaya lain yang dipilih.`
    : "";

  const blendNote =
    cultures.length > 1
      ? `\nPERNIKAHAN CAMPURAN (${cultures.join(" + ")}):
Blend kedua/semua nuansa budaya secara NATURAL. Jangan terasa dipaksakan.
Prioritaskan salam dari budaya pertama yang dipilih, sisipkan nuansa budaya lain di body.
Contoh Islam + Jawa: Salam Islam + body dengan kehalusan Jawa.`
      : "";

  return [parts, customPart, blendNote].filter(Boolean).join("\n");
}

function buildLanguageLine(input: AiMessageInput): string {
  const custom = input.customLanguage?.trim();
  if (custom) return `BAHASA: ${input.language} + ${custom}`;
  return `BAHASA: ${input.language}`;
}

function buildEventTypeLine(input: AiMessageInput): string {
  const labels = input.eventTypes.map((t) =>
    t === "akad"
      ? "Akad/Pemberkatan"
      : t === "resepsi"
        ? "Resepsi"
        : "Keduanya (Akad + Resepsi)",
  );
  return `JENIS ACARA: ${labels.join(", ")}`;
}

export function buildPrompt(input: AiMessageInput): {
  system: string;
  user: string;
} {
  const bride = input.eventContext.brideName ?? "(mempelai wanita)";
  const groom = input.eventContext.groomName ?? "(mempelai pria)";
  const date = input.eventContext.eventDate ?? "(belum ditentukan)";
  const venue = input.eventContext.venue ?? "(lokasi menyusul)";
  const channelLabel = input.channel === "whatsapp" ? "WhatsApp" : "email";
  const relationLabel =
    RECIPIENT_RELATION_LABEL[input.recipientRelation] ?? "Umum";

  const identity = `Kamu adalah penulis undangan pernikahan Indonesia yang berpengalaman 20 tahun.
Kamu memahami 1.300+ suku dan budaya Indonesia secara mendalam.
Kamu menulis seperti penyair yang juga memahami etika sosial —
setiap kata dipilih bukan hanya karena indah, tapi karena TEPAT untuk konteks penerima.`;

  const context = `DATA PERNIKAHAN (sudah pasti, JANGAN minta ulang):
- Mempelai wanita: ${bride}
- Mempelai pria: ${groom}
- Nama couple: ${input.eventContext.coupleName}
- Tanggal: ${date}
- Lokasi: ${venue}
- Channel: ${channelLabel}
- Hubungan penerima: ${relationLabel}`;

  const cultureMap = buildCultureMap(input.cultures, input.customCulture);
  const toneRule = TONE_RULES[input.tone] ?? TONE_RULES.formal;
  const relationRule =
    RELATION_RULES[input.recipientRelation] ?? RELATION_RULES.umum;
  const lengthRule = LENGTH_RULES[input.length] ?? LENGTH_RULES.sedang;
  const languageLine = buildLanguageLine(input);
  const eventTypeLine = buildEventTypeLine(input);

  const channelRules =
    input.channel === "whatsapp"
      ? `CHANNEL WHATSAPP:
- Gunakan line breaks untuk readability (bukan paragraf panjang)
- Emoji boleh sesuai tone (formal: max 2, santai: max 5, puitis: max 3)
- Bold pakai *teks* untuk penekanan
- Link cukup plain URL, tidak perlu hyperlink text
- Total panjang: jangan lebih dari 1 layar scroll HP`
      : `CHANNEL EMAIL:
- Format lebih formal dan terstruktur
- TIDAK ada emoji
- Paragraf proper (indent, spacing)
- Link bisa dibungkus "Buka undangan di sini: {link_undangan}"
- Boleh lebih panjang dari WhatsApp`;

  const variableRules = `VARIABEL YANG TERSEDIA (HANYA INI, TIDAK ADA LAIN):
- {panggilan} → sapaan personal tamu (WAJIB digunakan minimal 1×)
- {nama} → nama lengkap tamu (opsional)
- {bride} → nama mempelai wanita: ${bride}
- {groom} → nama mempelai pria: ${groom}
- {date} → tanggal acara: ${date}
- {venue} → lokasi acara: ${venue}
- {link_undangan} → link undangan digital (WAJIB digunakan minimal 1×)

ATURAN KETAT:
1. WAJIB sertakan {panggilan} dan {link_undangan}
2. BOLEH sertakan {nama}, {bride}, {groom}, {date}, {venue}
3. DILARANG membuat variabel baru seperti {nama_acara}, {waktu}, dll
4. DILARANG menulis nama mempelai langsung — HARUS pakai {bride} dan {groom}
5. DILARANG menulis tanggal langsung — HARUS pakai {date}
6. DILARANG menulis lokasi langsung — HARUS pakai {venue}
7. Tulis variabel PERSIS seperti format di atas (dengan kurung kurawal)`;

  const antiPatterns = `HINDARI (anti-pattern yang sering terjadi):
- Jangan mulai dengan "Kepada Yth." — terlalu kaku untuk WhatsApp
- Jangan copy-paste template generik — setiap output harus UNIK
- Jangan gunakan "kami yang berbahagia" — klise
- Jangan tulis "tanpa mengurangi rasa hormat" — filler
- Jangan gunakan bahasa hukum/notaris: "bersama ini kami bermaksud..."
- Jangan campur bahasa daerah jika user tidak memilihnya
- Jangan gunakan "Bismillah" atau salam agama jika budaya = "Umum"
- Jangan tulis seluruh pesan dalam HURUF KAPITAL`;

  const quality = `KRITERIA KUALITAS (self-check sebelum output):
✓ Apakah pesan ini terasa PERSONAL, bukan template?
✓ Apakah {panggilan} dan {link_undangan} sudah ada?
✓ Apakah tone konsisten dari awal sampai akhir?
✓ Apakah budaya tercermin natural, bukan dipaksakan?
✓ Apakah penerima akan merasa DIHARGAI membaca ini?
✓ Apakah ada call-to-action yang jelas (buka link + konfirmasi)?
✓ Apakah panjang sesuai permintaan?`;

  const customNotes = input.customNotes?.trim()
    ? `CATATAN TAMBAHAN DARI USER:\n${input.customNotes.trim().slice(0, 200)}`
    : "";

  const system = [
    identity,
    context,
    languageLine,
    eventTypeLine,
    cultureMap,
    toneRule,
    relationRule,
    lengthRule,
    channelRules,
    variableRules,
    antiPatterns,
    quality,
    customNotes,
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = `Tulis pesan undangan pernikahan sesuai semua instruksi di atas.

OUTPUT: Langsung tulis pesannya saja. TANPA pembuka, TANPA penjelasan, TANPA markdown code block.
Mulai langsung dari salam atau sapaan pertama.`;

  return { system, user };
}

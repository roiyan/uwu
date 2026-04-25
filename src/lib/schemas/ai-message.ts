import { z } from "zod";

export const CULTURE_PRESETS = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu Bali",
  "Buddha",
  "Konghucu",
  "Adat Jawa",
  "Adat Sunda",
  "Adat Batak",
  "Adat Minang",
  "Adat Bugis/Makassar",
  "Adat Bali",
  "Umum",
] as const;

export const LANGUAGE_PRESETS = [
  "Bahasa Indonesia (formal)",
  "Bahasa Indonesia (casual)",
  "Jawa Krama (halus)",
  "Jawa Ngoko (casual)",
  "Sunda halus",
  "Batak",
  "Minang",
  "Bilingual Indonesia-Inggris",
  "English only",
] as const;

export const RECIPIENT_RELATIONS = [
  "umum",
  "keluarga",
  "teman_dekat",
  "rekan_kerja",
  "atasan",
  "kenalan",
] as const;

export const RECIPIENT_RELATION_LABEL: Record<
  (typeof RECIPIENT_RELATIONS)[number],
  string
> = {
  umum: "Umum",
  keluarga: "Keluarga",
  teman_dekat: "Teman dekat",
  rekan_kerja: "Rekan kerja",
  atasan: "Atasan",
  kenalan: "Kenalan",
};

export const aiMessageInputSchema = z.object({
  tone: z.enum(["formal", "santai", "puitis"]),
  cultures: z.array(z.string().min(1)).min(1, "Pilih minimal 1 nuansa budaya"),
  customCulture: z.string().max(80).optional(),
  eventTypes: z
    .array(z.enum(["akad", "resepsi", "keduanya"]))
    .min(1, "Pilih minimal 1 jenis acara"),
  recipientRelation: z.enum(RECIPIENT_RELATIONS),
  language: z.string().min(1),
  customLanguage: z.string().max(80).optional(),
  length: z.enum(["singkat", "sedang", "lengkap"]),
  customNotes: z.string().max(200).optional(),
  channel: z.enum(["whatsapp", "email"]),
  eventContext: z.object({
    coupleName: z.string(),
    eventDate: z.string().optional(),
    venue: z.string().optional(),
    slug: z.string(),
  }),
});

export type AiMessageInput = z.infer<typeof aiMessageInputSchema>;

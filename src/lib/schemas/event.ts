import { z } from "zod";

export const mempelaiSchema = z.object({
  brideName: z.string().min(2, "Nama mempelai wanita minimal 2 karakter").max(80),
  brideNickname: z.string().max(40).optional().or(z.literal("")),
  groomName: z.string().min(2, "Nama mempelai pria minimal 2 karakter").max(80),
  groomNickname: z.string().max(40).optional().or(z.literal("")),
  ownerRole: z.enum(["bride", "groom", "both"]).default("bride"),
  partnerEmail: z
    .string()
    .email("Email pasangan tidak valid")
    .optional()
    .or(z.literal("")),
});

// `<input type="time">` constrains its own value format (HH:MM,
// 24-hour, zero-padded), so we drop the manual shape/range refinement
// that was firing falsely on Safari and just keep the cross-field
// rule that actually matters: end must come after start.
export const scheduleInputSchema = z
  .object({
    label: z.string().min(2, "Label acara wajib diisi").max(60),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    startTime: z.string().optional().or(z.literal("")),
    endTime: z.string().optional().or(z.literal("")),
    timezone: z.string().default("Asia/Jakarta"),
    venueName: z.string().max(120).optional().or(z.literal("")),
    venueAddress: z.string().max(400).optional().or(z.literal("")),
    venueMapUrl: z.string().url("URL peta tidak valid").optional().or(z.literal("")),
  })
  .refine(
    (v) => {
      if (!v.startTime || !v.endTime) return true;
      return v.endTime > v.startTime;
    },
    {
      message: "Jam selesai harus setelah jam mulai",
      path: ["endTime"],
    },
  );

export const schedulesSchema = z
  .array(scheduleInputSchema)
  .min(1, "Minimal satu acara")
  .max(6, "Maksimal 6 acara");

export const coupleDetailSchema = mempelaiSchema.extend({
  brideFatherName: z.string().max(120).optional().or(z.literal("")),
  brideMotherName: z.string().max(120).optional().or(z.literal("")),
  brideInstagram: z.string().max(60).optional().or(z.literal("")),
  bridePhotoUrl: z.string().url("URL foto tidak valid").optional().or(z.literal("")),
  groomFatherName: z.string().max(120).optional().or(z.literal("")),
  groomMotherName: z.string().max(120).optional().or(z.literal("")),
  groomInstagram: z.string().max(60).optional().or(z.literal("")),
  groomPhotoUrl: z.string().url("URL foto tidak valid").optional().or(z.literal("")),
  coverPhotoUrl: z.string().url("URL foto tidak valid").optional().or(z.literal("")),
  story: z.string().max(2000).optional().or(z.literal("")),
  quote: z.string().max(400).optional().or(z.literal("")),
});

export const eventSettingsSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z
    .string()
    .min(4, "Slug minimal 4 karakter")
    .max(60, "Slug maksimal 60 karakter")
    .regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda minus"),
  culturalPreference: z.enum(["islami", "umum", "custom"]),
  musicUrl: z.string().url("URL musik tidak valid").optional().or(z.literal("")),
});

export const profileSettingsSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().max(24).optional().or(z.literal("")),
});

export const themeSelectSchema = z.object({
  themeId: z.string().uuid("Tema tidak valid"),
});

export const themeConfigSchema = z.object({
  themeId: z.string().uuid(),
  palette: z
    .object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    })
    .partial()
    .optional(),
});

export type MempelaiInput = z.infer<typeof mempelaiSchema>;
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;
export type CoupleDetailInput = z.infer<typeof coupleDetailSchema>;
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type ThemeConfigInput = z.infer<typeof themeConfigSchema>;

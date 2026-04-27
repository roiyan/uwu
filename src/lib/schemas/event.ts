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
  timezone: z.string().max(40).optional().or(z.literal("")),
});

export const profileSettingsSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().max(24).optional().or(z.literal("")),
});

export const themeSelectSchema = z.object({
  themeId: z.string().uuid("Tema tidak valid"),
});

// Six-slot palette covering background + heading + body + 3 brand
// accents. Optional throughout so the editor can save partial diffs and
// the action layer falls back to theme defaults for missing slots.
export const palette6Schema = z
  .object({
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    headingText: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    bodyText: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    brandLight: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    brandDark: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  })
  .partial();

export const themeConfigSchema = z.object({
  themeId: z.string().uuid(),
  // Legacy 3-color palette — the public invitation renderer still reads
  // this directly as `{ primary, secondary, accent }`. Kept as the
  // canonical write target so older clients/themes keep rendering. The
  // 6-color palette is derived/stored alongside (see below).
  palette: z
    .object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    })
    .partial()
    .optional(),
  palette6: palette6Schema.optional(),
  // Heading + body font pair persisted in `eventThemeConfigs.config.fonts`.
  // Values are validated against the curated catalog at the action
  // layer (see `isAllowedHeadingFont` / `isAllowedBodyFont` in
  // `@/lib/theme/fonts`) so we keep this Zod schema permissive — the
  // strict allow-list lives next to the catalog itself.
  fonts: z
    .object({
      heading: z.string().min(2).max(60).optional(),
      body: z.string().min(2).max(60).optional(),
    })
    .partial()
    .optional(),
});

export type Palette6Input = z.infer<typeof palette6Schema>;

export type MempelaiInput = z.infer<typeof mempelaiSchema>;
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;
export type CoupleDetailInput = z.infer<typeof coupleDetailSchema>;
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type ThemeConfigInput = z.infer<typeof themeConfigSchema>;

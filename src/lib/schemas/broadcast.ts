import { z } from "zod";

export const audienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({
    type: z.literal("group"),
    groupIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu grup"),
  }),
  z.object({
    type: z.literal("status"),
    statuses: z
      .array(z.enum(["baru", "diundang", "dibuka", "hadir", "tidak_hadir"]))
      .min(1, "Pilih minimal satu status"),
  }),
]);

/**
 * Resend filter.
 * - "new_only"     → only guests with send_count = 0 (default; safest).
 * - "include_sent" → include guests who've been invited before
 *                    (user explicitly opts in via a checkbox).
 */
export const resendModeSchema = z.enum(["new_only", "include_sent"]);
export type ResendMode = z.infer<typeof resendModeSchema>;

export const broadcastInputSchema = z
  .object({
    // Server-side schema — `both` is a UI affordance the client splits
    // into two createBroadcastAction calls; the action itself never
    // sees `both`.
    channel: z.enum(["whatsapp", "email"]),
    templateSlug: z.string().min(1),
    subject: z.string().max(120).optional().or(z.literal("")),
    body: z
      .string()
      .min(20, "Pesan minimal 20 karakter")
      .max(4096, "Pesan terlalu panjang"),
    audience: audienceSchema,
    resendMode: resendModeSchema.default("new_only"),
  })
  .refine(
    (v) => v.channel !== "email" || !!v.subject,
    { message: "Subject email wajib diisi", path: ["subject"] },
  );

export type BroadcastInput = z.infer<typeof broadcastInputSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;

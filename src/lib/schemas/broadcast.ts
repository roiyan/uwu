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

export const broadcastInputSchema = z
  .object({
    channel: z.enum(["whatsapp", "email"]),
    templateSlug: z.string().min(1),
    subject: z.string().max(120).optional().or(z.literal("")),
    body: z
      .string()
      .min(20, "Pesan minimal 20 karakter")
      .max(4096, "Pesan terlalu panjang"),
    audience: audienceSchema,
  })
  .refine(
    (v) => v.channel !== "email" || !!v.subject,
    { message: "Subject email wajib diisi", path: ["subject"] },
  );

export type BroadcastInput = z.infer<typeof broadcastInputSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;

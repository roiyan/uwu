import { z } from "zod";

export const guestStatusEnum = z.enum([
  "baru",
  "diundang",
  "dibuka",
  "hadir",
  "tidak_hadir",
]);

export const guestInputSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  phone: z
    .string()
    .max(24)
    .regex(/^[0-9+\-\s()]*$/u, "Nomor hanya boleh angka dan simbol +-() ")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  groupId: z.string().uuid().optional().or(z.literal("")),
});

export const guestGroupInputSchema = z.object({
  name: z.string().min(2, "Nama grup minimal 2 karakter").max(40),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex")
    .optional()
    .or(z.literal("")),
});

export const rsvpInputSchema = z.object({
  token: z.string().uuid("Token undangan tidak valid"),
  status: z.enum(["hadir", "tidak_hadir"]),
  attendees: z
    .number({ error: "Jumlah hadir harus angka" })
    .int()
    .min(1, "Minimal 1 orang")
    .max(20, "Maksimal 20 orang"),
  message: z.string().max(400).optional().or(z.literal("")),
});

export type GuestInput = z.infer<typeof guestInputSchema>;
export type GuestGroupInput = z.infer<typeof guestGroupInputSchema>;
export type RsvpInput = z.infer<typeof rsvpInputSchema>;

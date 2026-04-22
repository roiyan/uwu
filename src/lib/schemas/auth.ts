import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export const resetRequestSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

export const resetConfirmSchema = z.object({
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;

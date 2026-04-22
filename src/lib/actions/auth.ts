"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resetRequestSchema,
  resetConfirmSchema,
} from "@/lib/schemas/auth";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function loginAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: "Email atau kata sandi salah." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registerAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
    }
    return { ok: false, error: "Pendaftaran gagal. Silakan coba lagi." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password/confirm`,
  });

  if (error) {
    return { ok: false, error: "Tidak dapat mengirim email saat ini. Coba lagi." };
  }
  return { ok: true, data: { sent: true } };
}

export async function confirmPasswordResetAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetConfirmSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: "Gagal mengubah kata sandi. Tautan mungkin sudah kedaluwarsa." };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = (formData.get("next") as string | null) ?? "/dashboard";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("Google sign-in gagal")}`);
  }
  redirect(data.url);
}

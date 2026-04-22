"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, signInWithGoogleAction } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Mulai cerita Anda</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Gratis selamanya untuk paket Starter.
      </p>

      <form action={signInWithGoogleAction} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--border-medium)] bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          <span>Daftar dengan Google</span>
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-hint">
        <span className="h-px flex-1 bg-[color:var(--border-ghost)]" />
        <span>atau dengan email</span>
        <span className="h-px flex-1 bg-[color:var(--border-ghost)]" />
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Nama lengkap</span>
          <input
            name="fullName"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Kata sandi</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
          />
          <span className="mt-1 block text-xs text-ink-hint">
            Minimal 8 karakter.
          </span>
        </label>

        {state && !state.ok && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-coral px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Daftar Gratis"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-navy hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}

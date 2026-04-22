"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signInWithGoogleAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Masuk ke akun Anda</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Kelola undangan pernikahan Anda.
      </p>

      <form action={signInWithGoogleAction} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--border-medium)] bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          <span>Masuk dengan Google</span>
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-hint">
        <span className="h-px flex-1 bg-[color:var(--border-ghost)]" />
        <span>atau dengan email</span>
        <span className="h-px flex-1 bg-[color:var(--border-ghost)]" />
      </div>

      <form action={formAction} className="space-y-4">
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
            autoComplete="current-password"
            minLength={8}
            className="mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-3 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
          />
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
          {pending ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-ink-muted">
        <Link href="/reset-password" className="hover:text-navy">
          Lupa kata sandi?
        </Link>
        <span>
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-navy hover:underline">
            Daftar gratis
          </Link>
        </span>
      </div>
    </div>
  );
}

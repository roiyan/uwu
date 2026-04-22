"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";

export default function ResetRequestPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  if (state?.ok) {
    return (
      <div>
        <h1 className="font-display text-3xl text-ink">Email terkirim</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Kami telah mengirim tautan untuk mengatur ulang kata sandi ke email
          Anda. Periksa inbox (dan folder spam).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-navy hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Lupa kata sandi?</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Masukkan email Anda. Kami akan kirim tautan untuk mengatur ulang.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
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
          {pending ? "Mengirim..." : "Kirim tautan reset"}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-ink-muted hover:text-navy"
      >
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}

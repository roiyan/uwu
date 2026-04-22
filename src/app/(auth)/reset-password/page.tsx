"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface-alt)] px-4 py-3 text-sm text-[color:var(--color-dark-text)] outline-none placeholder:text-[color:var(--color-dark-text-muted)] focus:border-[color:var(--color-brand-blue)] focus:shadow-[var(--focus-ring-gradient)]";

export default function ResetRequestPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  if (state?.ok) {
    return (
      <div>
        <h1 className="font-display text-3xl text-white">Email terkirim</h1>
        <p className="mt-3 text-sm text-[color:var(--color-dark-text-secondary)]">
          Kami telah mengirim tautan untuk mengatur ulang kata sandi ke email
          Anda. Periksa inbox (dan folder spam).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[color:var(--color-brand-blue)] hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Lupa kata sandi?</h1>
      <p className="mt-2 text-sm text-[color:var(--color-dark-text-secondary)]">
        Masukkan email Anda. Kami akan kirim tautan untuk mengatur ulang.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--color-dark-text)]">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>

        {state && !state.ok && (
          <p className="rounded-md bg-rose-dark/20 px-3 py-2 text-sm text-rose-100">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-gradient-brand px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.5)] transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? "Mengirim..." : "Kirim tautan reset"}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-[color:var(--color-dark-text-secondary)] transition-colors hover:text-white"
      >
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}

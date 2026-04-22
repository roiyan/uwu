"use client";

import { useActionState } from "react";
import { confirmPasswordResetAction } from "@/lib/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface-alt)] px-4 py-3 text-sm text-[color:var(--color-dark-text)] outline-none placeholder:text-[color:var(--color-dark-text-muted)] focus:border-[color:var(--color-brand-blue)] focus:shadow-[var(--focus-ring-gradient)]";

export default function ResetConfirmPage() {
  const [state, formAction, pending] = useActionState(
    confirmPasswordResetAction,
    null,
  );

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Atur kata sandi baru</h1>
      <p className="mt-2 text-sm text-[color:var(--color-dark-text-secondary)]">
        Masukkan kata sandi baru Anda.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--color-dark-text)]">
            Kata sandi baru
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[color:var(--color-dark-text-muted)]">
            Minimal 8 karakter.
          </span>
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
          {pending ? "Menyimpan..." : "Simpan kata sandi"}
        </button>
      </form>
    </div>
  );
}

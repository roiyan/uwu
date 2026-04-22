"use client";

import { useActionState } from "react";
import { confirmPasswordResetAction } from "@/lib/actions/auth";

export default function ResetConfirmPage() {
  const [state, formAction, pending] = useActionState(
    confirmPasswordResetAction,
    null,
  );

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Atur kata sandi baru</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Masukkan kata sandi baru Anda.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Kata sandi baru</span>
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
          {pending ? "Menyimpan..." : "Simpan kata sandi"}
        </button>
      </form>
    </div>
  );
}

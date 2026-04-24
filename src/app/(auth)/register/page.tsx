"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerAction, signInWithGoogleAction } from "@/lib/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface-alt)] px-4 py-3 text-sm text-[color:var(--color-dark-text)] outline-none placeholder:text-[color:var(--color-dark-text-muted)] focus:border-[color:var(--color-brand-blue)] focus:shadow-[var(--focus-ring-gradient)]";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Mulai cerita Anda</h1>
      <p className="mt-2 text-sm text-[color:var(--color-dark-text-secondary)]">
        Gratis selamanya untuk paket Starter.
      </p>

      <form action={signInWithGoogleAction} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface-alt)] px-5 py-3 text-sm font-medium text-[color:var(--color-dark-text)] transition-colors hover:border-[color:var(--dark-border-strong)]"
        >
          <span>Daftar dengan Google</span>
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-[color:var(--color-dark-text-muted)]">
        <span className="h-px flex-1 bg-[color:var(--dark-border)]" />
        <span>atau dengan email</span>
        <span className="h-px flex-1 bg-[color:var(--dark-border)]" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--color-dark-text)]">
            Nama lengkap
          </span>
          <input
            name="fullName"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            className={inputClass}
          />
        </label>
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
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--color-dark-text)]">
            Kata sandi
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
          {pending ? "Memproses..." : "Daftar Gratis"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[color:var(--color-dark-text-secondary)]">
        Sudah punya akun?{" "}
        <Link
          href={loginHref}
          className="font-medium text-[color:var(--color-brand-blue)] hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}

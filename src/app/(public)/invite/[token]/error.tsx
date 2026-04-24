"use client";

import Link from "next/link";
import { useEffect } from "react";

// Error boundary for /invite/[token]. Any unhandled exception from the
// server component (including the client-side Suspense bubble-up) renders
// this card instead of the default Next.js blank error screen.
export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invite] boundary caught", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--color-dark-surface)] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl">
          ⚠️
        </div>
        <h1 className="mt-5 font-display text-2xl text-white md:text-3xl">
          Terjadi kendala
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-white/60">
          Kami tidak bisa memproses undangan ini saat ini. Silakan coba lagi
          sebentar lagi.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-white/30">
            Kode: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(232,160,160,0.55)] transition-transform hover:scale-[1.02]"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

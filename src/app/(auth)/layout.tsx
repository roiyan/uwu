import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="theme-dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="hero-mesh" aria-hidden />

      <Link href="/" className="relative mb-8 font-logo text-4xl text-gradient">
        uwu
      </Link>

      <div
        className="relative w-full max-w-md rounded-2xl p-[1px]"
        style={{ background: "var(--brand-gradient-dim)" }}
      >
        <div className="rounded-2xl border border-[color:var(--dark-border)] bg-[color:var(--color-dark-surface)] p-8 shadow-2xl">
          {children}
        </div>
      </div>

      <p className="relative mt-6 text-xs text-[color:var(--color-dark-text-muted)]">
        © 2026 uwu Wedding Platform
      </p>
    </main>
  );
}

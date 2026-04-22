import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 font-logo text-4xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
      >
        uwu
      </Link>
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-8 shadow-ghost-md">
        {children}
      </div>
    </main>
  );
}

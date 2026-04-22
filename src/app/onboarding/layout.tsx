import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[color:var(--border-ghost)] bg-surface-card px-6 py-4 lg:px-10">
        <Link
          href="/dashboard"
          className="font-logo text-2xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
        >
          uwu
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-ink-muted transition-colors hover:text-navy"
          >
            Keluar
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 lg:py-14">
        {children}
      </main>
    </div>
  );
}

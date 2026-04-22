import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

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
    <div className="flex min-h-screen flex-col bg-surface-base">
      <header className="flex items-center justify-between border-b border-[color:var(--border-ghost)] bg-surface-card px-6 py-4 lg:px-10">
        <BrandLogo href="/dashboard" size="md" />
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

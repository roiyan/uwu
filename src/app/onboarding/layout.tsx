import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFast } from "@/lib/auth-guard";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

// Synchronous shell — children paint immediately. Auth check moved into a
// Suspense child so we don't pay the getUser round-trip on every step
// transition.
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="theme-dark relative flex min-h-screen flex-col overflow-hidden">
      <div className="hero-mesh" aria-hidden />
      <header className="relative flex items-center justify-between border-b border-[color:var(--dark-border)] bg-[#0A0A0F]/70 px-6 py-4 backdrop-blur lg:px-10">
        <BrandLogo href="/dashboard" size="md" />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-[color:var(--color-dark-text-secondary)] transition-colors hover:text-white"
          >
            Keluar
          </button>
        </form>
      </header>
      <main className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-10 lg:py-14">
        <Suspense fallback={null}>
          <AuthGate />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function AuthGate() {
  const user = await getSessionUserFast();
  if (!user) redirect("/login?next=/onboarding");
  return null;
}

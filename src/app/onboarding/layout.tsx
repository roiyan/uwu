import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserFast } from "@/lib/auth-guard";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { OnboardingProgress } from "./components/onboarding-progress";
import { OnboardingSidebar } from "./components/onboarding-sidebar";

// Synchronous shell — children paint immediately. Auth check moved into a
// Suspense child so we don't pay the getUser round-trip on every step
// transition. The dark cinematic palette is scoped to .theme-onboarding
// so it can't bleed into the rest of the app.
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="theme-onboarding relative min-h-screen overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(380px,38%)_1fr]">
        <OnboardingSidebar />
        <div className="relative flex min-h-screen flex-col">
          <header className="relative flex items-center justify-between border-b border-[var(--ob-line)] bg-[var(--ob-bg-1)]/70 px-6 py-4 backdrop-blur lg:px-12">
            <BrandLogo href="/dashboard" size="md" />
            <form action={signOutAction}>
              <button
                type="submit"
                className="ob-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)] transition-colors hover:text-[var(--ob-ink)]"
              >
                Keluar
              </button>
            </form>
          </header>
          {/* Soft glows behind the main content for the cinematic feel. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-[var(--ob-lilac)] opacity-[0.06] blur-[140px]" />
            <div className="absolute -bottom-24 left-1/4 h-[400px] w-[400px] rounded-full bg-[var(--ob-peach)] opacity-[0.06] blur-[140px]" />
          </div>
          <main className="relative z-[1] mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 py-10 lg:px-16 lg:py-14">
            <Suspense fallback={null}>
              <AuthGate />
            </Suspense>
            <OnboardingProgress />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

async function AuthGate() {
  const user = await getSessionUserFast();
  if (!user) redirect("/login?next=/onboarding");
  return null;
}

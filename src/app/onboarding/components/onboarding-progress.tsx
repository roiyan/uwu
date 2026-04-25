"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { slug: "mempelai", label: "Mempelai" },
  { slug: "jadwal", label: "Jadwal" },
  { slug: "tema", label: "Tema" },
  { slug: "selesai", label: "Selesai" },
] as const;

export function OnboardingProgress() {
  const pathname = usePathname();
  // Matches /onboarding/<slug>; falls back to mempelai at /onboarding.
  const currentSlug =
    STEPS.map((s) => s.slug).find((s) => pathname?.includes(`/${s}`)) ??
    "mempelai";
  const currentIdx = STEPS.findIndex((s) => s.slug === currentSlug);

  return (
    <ol
      aria-label="Progress onboarding"
      className="relative mx-auto mb-10 flex w-full max-w-[640px] items-start justify-between gap-2"
    >
      {STEPS.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <li
            key={step.slug}
            className="relative flex flex-1 flex-col items-center gap-2"
            aria-current={isActive ? "step" : undefined}
          >
            <div
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-[12px] transition-colors ${
                isActive
                  ? "border-[var(--ob-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--ob-coral)] shadow-[0_0_0_4px_rgba(240,160,156,0.08),0_0_24px_rgba(240,160,156,0.18)]"
                  : isDone
                    ? "border-[var(--ob-line-strong)] bg-transparent text-[var(--ob-ink-dim)]"
                    : "border-[var(--ob-line)] bg-transparent text-[var(--ob-ink-faint)]"
              }`}
            >
              {isDone ? "✓" : idx + 1}
            </div>
            <span
              className={`ob-mono text-[10px] uppercase tracking-[0.22em] ${
                isActive
                  ? "text-[var(--ob-ink)]"
                  : "text-[var(--ob-ink-faint)]"
              } hidden md:block`}
            >
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-1/2 top-[18px] z-0 h-px w-full origin-left bg-[var(--ob-line)]"
              >
                <span
                  className={`block h-px origin-left bg-[var(--ob-coral)] transition-transform duration-500 ease-out ${
                    idx < currentIdx ? "scale-x-100" : "scale-x-0"
                  }`}
                  style={{ width: "100%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

import Link from "next/link";

export type StepId = "mempelai" | "jadwal" | "tema" | "selesai";

const STEPS: { id: StepId; label: string; href: string }[] = [
  { id: "mempelai", label: "Mempelai", href: "/onboarding/mempelai" },
  { id: "jadwal", label: "Jadwal", href: "/onboarding/jadwal" },
  { id: "tema", label: "Tema", href: "/onboarding/tema" },
  { id: "selesai", label: "Selesai", href: "/onboarding/selesai" },
];

export function Stepper({ current, reached }: { current: StepId; reached: StepId[] }) {
  const reachedSet = new Set<StepId>(reached);
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <ol
      className="flex items-center justify-between gap-2"
      aria-label="Progres pembuatan undangan"
    >
      {STEPS.map((step, idx) => {
        const isActive = step.id === current;
        const isReached = reachedSet.has(step.id);
        const isPast = idx < currentIdx;
        const canNav = isReached || isPast || isActive;

        const dotBase =
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors";
        const activeStyle: React.CSSProperties | undefined = isActive
          ? {
              background: "var(--brand-gradient)",
              color: "#fff",
              boxShadow:
                "0 0 0 4px rgba(184,160,208,0.18), 0 8px 20px -6px rgba(184,160,208,0.45)",
            }
          : undefined;
        const dotClass = isActive
          ? ""
          : canNav
            ? "bg-navy text-ink-inverse"
            : "bg-surface-muted text-ink-hint";

        const labelClass = isActive
          ? "font-medium text-navy"
          : canNav
            ? "text-ink"
            : "text-ink-hint";

        const content = (
          <div className="flex items-center gap-3">
            <span className={`${dotBase} ${dotClass}`} style={activeStyle}>
              {idx + 1}
            </span>
            <span className={`text-sm ${labelClass}`}>{step.label}</span>
          </div>
        );

        const connectorClass = canNav
          ? "bg-navy/40"
          : "bg-[color:var(--border-ghost)]";

        return (
          <li key={step.id} className="flex flex-1 items-center gap-3">
            {canNav && !isActive ? (
              <Link href={step.href}>{content}</Link>
            ) : (
              content
            )}
            {idx < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${connectorClass}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

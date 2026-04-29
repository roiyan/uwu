"use client";

import { Sparkline } from "@/components/dashboard/Sparkline";

export type KpiCardData = {
  dot: string;
  color: string;
  label: string;
  value: number;
  suffix?: string;
  delta: number;
  deltaUnit?: string;
  compare: string;
  spark: number[];
};

export function KpiCards({ cards }: { cards: KpiCardData[] }) {
  return (
    <section
      className="relative grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--d-line)] sm:grid-cols-2 lg:grid-cols-4"
      style={{
        background:
          "linear-gradient(135deg, #0F1020 0%, var(--d-bg-card) 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-50 blur-[60px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,160,156,0.14), transparent 70%)",
        }}
      />
      {cards.map((c) => (
        <KpiCell key={c.label} {...c} />
      ))}
    </section>
  );
}

function KpiCell({
  dot,
  color,
  label,
  value,
  suffix,
  delta,
  deltaUnit,
  compare,
  spark,
}: KpiCardData) {
  const positive = delta > 0;
  const neutral = delta === 0;
  return (
    <div className="relative border-r border-b border-[var(--d-line)] p-6 last:border-r-0 lg:border-b-0 lg:p-7">
      <div className="d-mono flex items-center gap-2 text-[12px] uppercase tracking-[0.20em] text-[var(--d-ink-dim)]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
        />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="d-serif text-[40px] font-extralight leading-none tracking-[-0.025em] text-[var(--d-ink)] lg:text-[44px]">
          {value}
        </span>
        {suffix && (
          <span className="text-[14px] text-[var(--d-ink-dim)]">{suffix}</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--d-ink-dim)]">
        <span
          className={`d-mono inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10.5px] font-medium tracking-[0.04em] ${
            positive
              ? "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]"
              : neutral
                ? "bg-[rgba(255,255,255,0.04)] text-[var(--d-ink-dim)]"
                : "bg-[rgba(224,138,138,0.12)] text-[#E08A8A]"
          }`}
        >
          {positive ? "↑" : neutral ? "·" : "↓"} {Math.abs(delta)}
          {deltaUnit ? ` ${deltaUnit}` : ""}
        </span>
        <span className="d-mono text-[10.5px] tracking-[0.04em]">
          {compare}
        </span>
      </div>
      <div className="mt-4">
        <Sparkline values={spark} color={color} height={28} className="-mx-1" />
      </div>
    </div>
  );
}

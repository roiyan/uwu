"use client";

export type StatusSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const R = 50;
const C = 2 * Math.PI * R;

export function StatusDonut({
  slices,
  total,
}: {
  slices: StatusSlice[];
  total: number;
}) {
  const denom = Math.max(1, total);
  let cum = 0;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Distribusi Status
      </p>
      <h2 className="d-serif mt-2 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
        Komposisi tamu
      </h2>

      <div className="mt-6 grid items-center gap-7 sm:grid-cols-[180px_1fr]">
        {/* Donut */}
        <div className="relative mx-auto h-[180px] w-[180px] sm:mx-0">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="var(--d-line)"
              strokeWidth="20"
            />
            {slices.map((s) => {
              const len = (s.value / denom) * C;
              const offset = -cum;
              cum += len;
              if (s.value === 0) return null;
              return (
                <circle
                  key={s.key}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="20"
                  strokeDasharray={`${len} ${C}`}
                  strokeDashoffset={offset}
                  style={{
                    transition: "stroke-dasharray 1.2s ease, stroke-dashoffset 1.2s ease",
                  }}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="d-serif text-[42px] font-extralight leading-none tracking-[-0.02em] text-[var(--d-ink)]">
              {total}
            </span>
            <span className="d-mono mt-1 text-[9px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Total
            </span>
          </div>
        </div>

        {/* Legend */}
        <ul className="flex flex-col gap-2.5">
          {slices.map((s) => {
            const pct =
              total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li
                key={s.key}
                className="grid grid-cols-[1fr_auto_56px] items-center gap-3 text-[12.5px]"
              >
                <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <span className="d-serif text-[15px] text-[var(--d-ink)]">
                  {s.value}
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-1 w-10 overflow-hidden rounded-full bg-[var(--d-line)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="d-mono text-[9.5px] tracking-[0.06em] text-[var(--d-ink-faint)]">
                    {pct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

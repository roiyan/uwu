"use client";

export type FunnelData = {
  total: number;
  invited: number;
  opened: number;
  responded: number;
  attending: number;
  /** Optional — only included when at least one guest has checked in.
   *  Renders as an extra stage below "Hadir" so couples can see the
   *  actual show-up gap on the same chart. */
  checkedIn?: number;
};

type Stage = {
  key: keyof FunnelData;
  label: string;
  color: string;
  pctOf?: keyof FunnelData;
  hint: (data: FunnelData) => string;
};

const BASE_STAGES: Stage[] = [
  {
    key: "total",
    label: "Total",
    color: "#F0A09C",
    hint: () => "baseline",
  },
  {
    key: "invited",
    label: "Diundang",
    color: "#F4B8A3",
    pctOf: "total",
    hint: (d) => `${Math.max(0, d.total - d.invited)} belum diundang`,
  },
  {
    key: "opened",
    label: "Dibuka",
    color: "#D4B896",
    pctOf: "invited",
    hint: () => "dari diundang",
  },
  {
    key: "responded",
    label: "RSVP",
    color: "#B89DD4",
    pctOf: "opened",
    hint: () => "dari dibuka",
  },
  {
    key: "attending",
    label: "Hadir (RSVP)",
    color: "#7ED3A4",
    pctOf: "responded",
    hint: () => "dari RSVP",
  },
];

const CHECKIN_STAGE: Stage = {
  key: "checkedIn",
  label: "Tiba di Lokasi",
  color: "#8FA3D9",
  pctOf: "attending",
  hint: () => "dari yang RSVP hadir",
};

const STAGE_LABEL: Record<keyof FunnelData, string> = {
  total: "total",
  invited: "diundang",
  opened: "dibuka",
  responded: "RSVP",
  attending: "RSVP hadir",
  checkedIn: "tiba di lokasi",
};

function resolveStages(d: FunnelData): Stage[] {
  return d.checkedIn != null && d.checkedIn >= 0 && d.attending > 0
    ? [...BASE_STAGES, CHECKIN_STAGE]
    : BASE_STAGES;
}

function generateInsight(d: FunnelData): { from: string; to: string; count: number } | null {
  const stages = resolveStages(d);
  let biggest: { from: string; to: string; count: number } | null = null;
  for (let i = 0; i < stages.length - 1; i++) {
    const a = stages[i].key;
    const b = stages[i + 1].key;
    const av = d[a] ?? 0;
    const bv = d[b] ?? 0;
    const drop = av - bv;
    if (drop > 0 && (!biggest || drop > biggest.count)) {
      biggest = { from: STAGE_LABEL[a], to: STAGE_LABEL[b], count: drop };
    }
  }
  return biggest;
}

export function FunnelChart({
  data,
  groups,
  groupFilter,
  onGroupChange,
}: {
  data: FunnelData;
  groups: { id: string; name: string }[];
  groupFilter: string;
  onGroupChange: (id: string) => void;
}) {
  const max = Math.max(1, data.total);
  const conversionPct =
    data.total > 0 ? Math.round((data.attending / data.total) * 100) : 0;
  const insight = generateInsight(data);
  const stages = resolveStages(data);
  const stageGridClass =
    stages.length === 6
      ? "grid-cols-3 sm:grid-cols-6"
      : "grid-cols-5";

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Perjalanan Respons · {todayLabel()}
          </p>
          <h2 className="d-serif mt-2 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
            Perjalanan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">tamu</em>.
          </h2>
        </div>
        <div className="relative">
          <select
            value={groupFilter}
            onChange={(e) => onGroupChange(e.target.value)}
            className="d-mono cursor-pointer appearance-none rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] py-2 pl-4 pr-9 text-[10.5px] uppercase tracking-[0.18em] text-[var(--d-ink)] outline-none transition-colors hover:border-[var(--d-line-strong)] focus:border-[var(--d-coral)]"
          >
            <option value="">Semua Grup</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-[70%] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[var(--d-ink-dim)]"
          />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_200px] lg:gap-10">
        {/* Visualization */}
        <div>
          <div className="flex h-[220px] items-end gap-3.5">
            {stages.map((s) => {
              const v = data[s.key] ?? 0;
              const heightPct = (v / max) * 100;
              return (
                <div
                  key={s.key}
                  className="group/bar relative flex flex-1 flex-col justify-end transition-transform hover:-translate-y-1"
                >
                  <span
                    className="d-serif absolute left-1/2 -translate-x-1/2 text-[22px] font-extralight leading-none text-[var(--d-ink)]"
                    style={{
                      bottom: `calc(${Math.max(heightPct, 4)}% + 6px)`,
                    }}
                  >
                    {v}
                  </span>
                  <div
                    className="relative w-full overflow-hidden rounded-t-[8px]"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      minHeight: "8px",
                      background: `linear-gradient(180deg, ${s.color} 0%, ${s.color}77 100%)`,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1/2"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.14), transparent 70%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Axis legend */}
          <div className={`mt-5 grid ${stageGridClass} gap-3.5 border-t border-[var(--d-line)] pt-4`}>
            {stages.map((s) => {
              const v = data[s.key] ?? 0;
              const denomRaw = s.pctOf ? data[s.pctOf] : data.total;
              const denom = denomRaw ?? 0;
              const pct =
                denom > 0 ? Math.round((v / Math.max(1, denom)) * 100) : 0;
              return (
                <div key={s.key} className="flex flex-col items-start gap-1">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--d-ink-dim)]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="d-mono text-[10.5px] tracking-[0.04em] text-[var(--d-ink)]">
                    {pct}%
                  </span>
                  <span className="d-mono text-[9.5px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                    {s.hint(data)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="border-t border-dashed border-[var(--d-line-strong)] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-ink-faint)]">
            Respons keseluruhan
          </p>
          <p className="d-serif mt-2 text-[52px] font-extralight leading-none tracking-[-0.028em] text-[var(--d-ink)] lg:text-[56px]">
            {conversionPct}
            <span className="text-[24px] text-[var(--d-ink-dim)]">%</span>
          </p>
          <p className="d-serif mt-2 text-[13px] italic leading-relaxed text-[var(--d-ink-dim)]">
            dari total tamu akhirnya{" "}
            <em className="d-serif italic text-[var(--d-coral)]">hadir</em>.
          </p>

          {insight && (
            <div
              className="mt-7 rounded-[12px] border border-[rgba(240,160,156,0.2)] p-4"
              style={{
                background:
                  "linear-gradient(115deg, rgba(240,160,156,0.08), rgba(184,157,212,0.06))",
              }}
            >
              <p className="d-mono text-[9.5px] uppercase tracking-[0.24em] text-[var(--d-coral)]">
                Temuan
              </p>
              <p className="d-serif mt-2 text-[13px] leading-[1.5] text-[var(--d-ink)]">
                Penurunan terbesar di langkah{" "}
                <em className="d-serif italic text-[var(--d-coral)]">
                  {insight.to}
                </em>{" "}
                — {insight.count} tamu {insight.from} tapi belum lanjut.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
  /** Stage whose value is the percentage denominator. `undefined` =
   *  use the per-stage `denomOverride` (currently only Terdaftar uses
   *  it to show "X% dari kuota"). */
  pctOf?: keyof FunnelData;
  hint: (data: FunnelData, ctx: StageCtx) => string;
};

// Per-render context for things stages need but FunnelData doesn't
// carry — quota, etc. Kept narrow so adding a new field stays cheap.
type StageCtx = {
  guestQuota: number;
};

const BASE_STAGES: Stage[] = [
  {
    key: "total",
    label: "Terdaftar",
    color: "#F0A09C",
    // No pctOf — Terdaftar is denominated by the package quota, not
    // by another funnel stage. Resolved in the legend with a custom
    // branch below.
    hint: (_d, ctx) => `dari ${ctx.guestQuota} kuota`,
  },
  {
    key: "invited",
    label: "Dikirimi",
    color: "#F4B8A3",
    pctOf: "total",
    hint: (d) => `${Math.max(0, d.total - d.invited)} belum dikirimi`,
  },
  {
    key: "opened",
    label: "Membuka",
    color: "#D4B896",
    pctOf: "invited",
    hint: () => "dari yang dikirimi",
  },
  {
    key: "responded",
    label: "Konfirmasi",
    color: "#B89DD4",
    pctOf: "opened",
    hint: () => "dari yang membuka",
  },
  {
    key: "attending",
    label: "Hadir",
    color: "#7ED3A4",
    pctOf: "responded",
    hint: () => "dari yang konfirmasi hadir",
  },
];

const CHECKIN_STAGE: Stage = {
  key: "checkedIn",
  label: "Tiba di Lokasi",
  color: "#8FA3D9",
  pctOf: "attending",
  hint: () => "dari yang konfirmasi hadir",
};

const STAGE_LABEL: Record<keyof FunnelData, string> = {
  total: "terdaftar",
  invited: "dikirimi",
  opened: "membuka",
  responded: "konfirmasi",
  attending: "konfirmasi hadir",
  checkedIn: "tiba di lokasi",
};

/**
 * "Tiba di Lokasi" only adds signal once the event has started or
 * someone has actually been checked in. Pre-event with zero check-ins
 * the row would always read "0% dari yang konfirmasi hadir" — pure
 * noise that crowds the more useful stages — so we hide it.
 */
function shouldShowArrival(
  d: FunnelData,
  daysRemaining: number | null,
): boolean {
  if (d.checkedIn == null) return false;
  if (d.checkedIn > 0) return true;
  return daysRemaining !== null && daysRemaining <= 0;
}

function resolveStages(
  d: FunnelData,
  daysRemaining: number | null,
): Stage[] {
  return shouldShowArrival(d, daysRemaining)
    ? [...BASE_STAGES, CHECKIN_STAGE]
    : BASE_STAGES;
}

function generateInsight(
  d: FunnelData,
  daysRemaining: number | null,
): { from: string; to: string; count: number } | null {
  const stages = resolveStages(d, daysRemaining);
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
  guestQuota,
  daysRemaining = null,
}: {
  data: FunnelData;
  groups: { id: string; name: string }[];
  groupFilter: string;
  onGroupChange: (id: string) => void;
  /** Package's guest cap (Starter=25, Lite=100, etc.) — drives the
   *  Terdaftar stage's "X% dari kuota" hint. Defaults to 25 if the
   *  caller can't resolve it; the rendered ratio degrades gracefully. */
  guestQuota?: number;
  /** Days until the wedding (negative = post-event). When null, the
   *  arrival stage is gated only by checkedIn > 0. */
  daysRemaining?: number | null;
}) {
  const quota = guestQuota && guestQuota > 0 ? guestQuota : 25;
  const ctx: StageCtx = { guestQuota: quota };
  const conversionPct =
    data.total > 0 ? Math.round((data.attending / data.total) * 100) : 0;
  const insight = generateInsight(data, daysRemaining);
  const stages = resolveStages(data, daysRemaining);
  // Bar-magnitude denominator. Each row's bar is sized as `v / max`
  // so the longest bar always fills its track — gives the legend a
  // proper horizontal-bar feel even when totals are small.
  const max = Math.max(1, ...stages.map((s) => data[s.key] ?? 0));

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
            Perjalanan Konfirmasi · {todayLabel()}
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
        {/* Stage rows. The previous version stacked a vertical bar
            chart on top of this grid — those bars looked empty when
            totals were small (220px container, 8px min-height bars =
            wasted space) so we collapsed everything into a single
            horizontal-bar legend. Each row carries label + count +
            percentage + a magnitude bar. */}
        <div className="flex flex-col gap-4">
          {stages.map((s) => {
            const v = data[s.key] ?? 0;
            // Terdaftar uses the package quota as denominator;
            // every other stage compares against its `pctOf`.
            const denomRaw = s.key === "total" ? quota : s.pctOf ? data[s.pctOf] : data.total;
            const denom = denomRaw ?? 0;
            const pct =
              denom > 0 ? Math.round((v / Math.max(1, denom)) * 100) : 0;
            const widthPct = (v / max) * 100;
            const isOverflow = pct > 100;
            return (
              <div key={s.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-[12px] text-[var(--d-ink)]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="d-serif text-[18px] font-extralight leading-none text-[var(--d-ink)]">
                    {v}
                  </span>
                </div>
                {/* Magnitude bar — width relative to the largest stage
                    in this funnel, so the funnel narrowing reads at a
                    glance. Min 4px so 0/near-0 stages still show a tick. */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(widthPct, v > 0 ? 4 : 0)}%`,
                      background: `linear-gradient(90deg, ${s.color} 0%, ${s.color}99 100%)`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="d-mono text-[10px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                    {s.hint(data, ctx)}
                  </span>
                  <span className="d-mono text-[10.5px] tracking-[0.04em] text-[var(--d-ink-dim)]">
                    {pct}%
                  </span>
                </div>
                {isOverflow && (
                  <span className="d-mono text-[9px] tracking-[0.02em] text-[var(--d-ink-faint)] opacity-70">
                    Bisa &gt; 100% — undangan kalian menyebar organik di luar
                    daftar kirim.
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <aside className="border-t border-dashed border-[var(--d-line-strong)] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-ink-faint)]">
            Konfirmasi keseluruhan
          </p>
          <p className="d-serif mt-2 text-[52px] font-extralight leading-none tracking-[-0.028em] text-[var(--d-ink)] lg:text-[56px]">
            {conversionPct}
            <span className="text-[24px] text-[var(--d-ink-dim)]">%</span>
          </p>
          <p className="d-serif mt-2 text-[13px] italic leading-relaxed text-[var(--d-ink-dim)]">
            dari total tamu yang akhirnya{" "}
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

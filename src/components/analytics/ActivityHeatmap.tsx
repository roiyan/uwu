"use client";

export type HeatmapBucket = {
  day: number; // 0=Sunday … 6=Saturday
  hour: number; // 0..23
  count: number;
};

const DAY_LABELS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
// Indonesian week order in the design starts on Sunday.
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

export function ActivityHeatmap({ buckets }: { buckets: HeatmapBucket[] }) {
  // Build dense 7×24 matrix
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const b of buckets) {
    if (b.day >= 0 && b.day < 7 && b.hour >= 0 && b.hour < 24) {
      matrix[b.day][b.hour] = b.count;
    }
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));

  // Find peak
  let peak: { day: number; hour: number; count: number } | null = null;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d][h] > 0 && (!peak || matrix[d][h] > peak.count)) {
        peak = { day: d, hour: h, count: matrix[d][h] };
      }
    }
  }

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Pola Aktivitas · Jam &amp; Hari
      </p>
      <h2 className="d-serif mt-2 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
        Kapan mereka membuka?
      </h2>
      <p className="d-serif mt-1.5 text-[13px] italic text-[var(--d-ink-dim)]">
        Intensitas bukaan undangan per jam dalam sepekan terakhir.
      </p>

      {/* Grid */}
      <div className="mt-6 overflow-x-auto scrollbar-hide">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[36px_repeat(24,1fr)] gap-[3px]">
            {matrix.map((row, dIdx) => (
              <div key={`day-${dIdx}`} className="contents">
                <div className="d-mono flex items-center text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                  {DAY_LABELS[dIdx]}
                </div>
                {row.map((c, hIdx) => {
                  const intensity = max === 0 ? 0 : c / max;
                  // Map intensity 0..1 → opacity 0.06..0.85 like design ref
                  const op =
                    c === 0 ? 0.06 : 0.06 + intensity * 0.79;
                  const isPeak =
                    peak && peak.day === dIdx && peak.hour === hIdx;
                  return (
                    <div
                      key={`cell-${dIdx}-${hIdx}`}
                      title={`${DAY_LABELS[dIdx]} · ${String(hIdx).padStart(2, "0")}:00 — ${c} bukaan`}
                      className={`aspect-square rounded-[3px] border border-[rgba(255,255,255,0.02)] transition-transform hover:scale-[1.3] hover:border-[var(--d-coral)] hover:shadow-[0_4px_12px_rgba(240,160,156,0.3)] ${
                        isPeak ? "ring-1 ring-[var(--d-coral)]" : ""
                      }`}
                      style={{
                        background:
                          c === 0
                            ? "rgba(240,160,156,0.04)"
                            : `rgba(240,160,156,${op})`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hour labels (every 3 hours) */}
          <div className="mt-2 grid grid-cols-[36px_repeat(24,1fr)] gap-[3px]">
            <div />
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={`hour-${i}`}
                className="d-mono text-center text-[8.5px] tracking-[0.06em] text-[var(--d-ink-faint)]"
              >
                {HOUR_LABELS.includes(i) ? String(i).padStart(2, "0") : ""}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + peak */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="d-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            Rendah
          </span>
          <div className="flex gap-[3px]">
            {[0.08, 0.2, 0.4, 0.6, 0.85].map((op, i) => (
              <span
                key={i}
                className="block h-3 w-5 rounded-[2px]"
                style={{ background: `rgba(240,160,156,${op})` }}
              />
            ))}
          </div>
          <span className="d-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            Tinggi
          </span>
        </div>
        {peak ? (
          <p className="d-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--d-coral)]">
            Peak: {DAY_LABELS[peak.day]} · {String(peak.hour).padStart(2, "0")}
            :00 WIB · {peak.count} bukaan
          </p>
        ) : (
          <p className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
            Belum ada bukaan tercatat.
          </p>
        )}
      </div>
    </section>
  );
}

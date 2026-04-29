"use client";

export type ShowUpStats = {
  rsvpHadir: number;
  rsvpHadirPax: number;
  actualCheckin: number;
  actualPax: number;
  walkIn: number;
  rsvpHadirCheckedIn: number;
  noShow: number;
  showUpRate: number;
};

/**
 * Show-up rate card — RSVP-vs-actual comparison shown on the analytics
 * page once at least one guest has checked in. Hidden entirely when no
 * check-in data exists; the parent decides whether to mount it.
 */
export function ShowUpRateCard({ stats }: { stats: ShowUpStats }) {
  if (stats.actualCheckin === 0) return null;

  const categories = [
    {
      key: "hadir",
      label: "Datang sesuai janji",
      desc: "Konfirmasi hadir, lalu betul-betul tiba",
      count: stats.rsvpHadirCheckedIn,
      color: "var(--d-green)",
    },
    {
      key: "walkin",
      label: "Hadiah kejutan",
      desc: "Datang tanpa sempat konfirmasi",
      count: stats.walkIn,
      color: "var(--d-peach)",
    },
    {
      key: "noshow",
      label: "Berhalangan hadir",
      desc: "Konfirmasi hadir tapi tak sempat datang",
      count: stats.noShow,
      color: "var(--d-coral)",
    },
  ].filter((c) => c.count > 0 || c.key === "noshow");

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Kehadiran Aktual
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-x-7 gap-y-3">
        <div>
          <div className="d-serif font-extralight leading-none text-[var(--d-ink)]">
            <span className="text-[56px]">{stats.showUpRate}</span>
            <span className="text-[24px] text-[var(--d-ink-dim)]">%</span>
          </div>
          <p className="d-serif mt-1.5 text-[12.5px] italic text-[var(--d-ink-dim)]">
            {stats.rsvpHadirCheckedIn} dari {stats.rsvpHadir} yang
            berencana hadir sudah tiba
          </p>
        </div>
        <div className="d-mono flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--d-ink-faint)]">
          <div>
            <div className="d-serif text-[22px] font-light text-[var(--d-ink)]">
              {stats.actualPax}
            </div>
            <div>orang di lokasi</div>
          </div>
          <span className="text-[var(--d-line-strong)]">vs</span>
          <div>
            <div className="d-serif text-[22px] font-light text-[var(--d-ink-dim)]">
              {stats.rsvpHadirPax}
            </div>
            <div>direncanakan hadir</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {categories.map((cat, i) => (
          <div
            key={cat.key}
            className={`flex items-center justify-between py-2.5 ${
              i < categories.length - 1
                ? "border-b border-[var(--d-line)]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <div>
                <p className="text-[13px] text-[var(--d-ink)]">{cat.label}</p>
                <p className="d-serif text-[11px] italic text-[var(--d-ink-faint)]">
                  {cat.desc}
                </p>
              </div>
            </div>
            <span className="d-serif text-[18px] font-light text-[var(--d-ink)]">
              {cat.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

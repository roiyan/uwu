type FunnelData = {
  total: number;
  invited: number;
  opened: number;
  responded: number;
  attending: number;
};

const ROWS: {
  key: keyof FunnelData;
  label: string;
  color: string;
}[] = [
  { key: "total", label: "Total Tamu", color: "var(--d-coral)" },
  { key: "invited", label: "Diundang", color: "var(--d-peach)" },
  { key: "opened", label: "Dibuka", color: "var(--d-gold)" },
  { key: "responded", label: "Merespons", color: "var(--d-lilac)" },
  { key: "attending", label: "Hadir", color: "var(--d-green)" },
];

export function ResponseFunnel({ data }: { data: FunnelData }) {
  // Percentages all relative to `total`. When total is zero we render
  // empty bars but still keep the row labels so the user sees what's
  // tracked.
  const pct = (n: number) =>
    data.total > 0 ? Math.round((n / data.total) * 100) : 0;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header>
        <p className="d-eyebrow">Respons</p>
        <h2 className="d-serif mt-2 text-[26px] font-extralight leading-tight text-[var(--d-ink)]">
          Funnel{" "}
          <em className="d-serif italic text-[var(--d-coral)]">respons</em>
        </h2>
        <p className="mt-1 text-[12.5px] text-[var(--d-ink-dim)]">
          Perjalanan tamu — dari undangan ke kehadiran.
        </p>
      </header>

      <ul className="mt-6 space-y-4">
        {ROWS.map((row) => {
          const value = data[row.key];
          const percent = pct(value);
          return (
            <li key={row.key}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[var(--d-ink-dim)]">
                  <span
                    aria-hidden
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="d-serif text-[18px] font-light text-[var(--d-ink)]">
                    {value}
                  </span>
                  <span className="d-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                    {percent}%
                  </span>
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
                <div
                  className="d-bar-fill h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: row.color,
                    boxShadow: `0 0 12px ${row.color}`,
                    transformOrigin: "left center",
                    transform: `scaleX(${percent / 100})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

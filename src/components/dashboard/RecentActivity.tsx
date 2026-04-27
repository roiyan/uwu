type ActivityRow = {
  id: string;
  summary: string;
  userName: string | null;
  userEmail: string;
  createdAt: Date;
};

function relativeStamp(d: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "Baru";
  if (sec < 3600) return `${Math.floor(sec / 60)}M`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}J`;
  if (sec < 7 * 86_400) return `${Math.floor(sec / 86_400)}H`;
  return `${Math.floor(sec / (30 * 86_400))}B`;
}

export function RecentActivity({ items }: { items: ActivityRow[] }) {
  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-[22px]">
      <header className="mb-4">
        <h3 className="d-serif text-[18px] font-light text-[var(--d-ink)]">
          Jejak{" "}
          <em className="d-serif italic text-[var(--d-coral)]">terbaru</em>
        </h3>
      </header>

      {items.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-[var(--d-ink-dim)]">
          Belum ada jejak baru. Setiap langkah kalian akan muncul di sini.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--d-line)]">
          {items.map((row) => {
            const stamp = relativeStamp(row.createdAt);
            const actor = row.userName?.trim() || row.userEmail.split("@")[0];
            return (
              <li
                key={row.id}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="d-mono w-[42px] shrink-0 pt-0.5 text-[9.5px] uppercase tracking-[0.16em] text-[var(--d-ink-faint)]">
                  {stamp}
                </span>
                <p className="text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
                  <strong className="font-medium text-[var(--d-ink)]">
                    {actor}
                  </strong>{" "}
                  {row.summary}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

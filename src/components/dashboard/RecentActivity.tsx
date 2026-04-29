import {
  formatTimeAgo,
  groupActivities,
  type GroupableActivity,
} from "@/lib/utils/format-time";

type ActivityRow = {
  id: string;
  summary: string;
  userName: string | null;
  userEmail: string;
  createdAt: Date;
};

export function RecentActivity({ items }: { items: ActivityRow[] }) {
  // Dedup consecutive same-actor + same-summary rows within an hour
  // and roll the remainder into a `× N perubahan` suffix. Without
  // this, editing the cover photo six times floods the panel with
  // six identical rows. After grouping we cap the dashboard preview
  // at 5 entries; the full timeline lives elsewhere.
  const groupedAll = groupActivities(items as GroupableActivity[]);
  const grouped = groupedAll.slice(0, 5);
  const hasMore = groupedAll.length > 5;

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-[22px]">
      <header className="mb-4">
        <h3 className="d-serif text-[18px] font-light text-[var(--d-ink)]">
          Jejak{" "}
          <em className="d-serif italic text-[var(--d-coral)]">terbaru</em>
        </h3>
      </header>

      {grouped.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-[var(--d-ink-dim)]">
          Belum ada jejak baru. Setiap langkah kalian akan muncul di sini.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--d-line)]">
          {grouped.map((row) => {
            const stamp = formatTimeAgo(row.createdAt);
            const actor = row.userName?.trim() || row.userEmail.split("@")[0];
            return (
              <li
                key={row.id}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="d-mono w-[88px] shrink-0 pt-0.5 text-[10px] text-[var(--d-ink-faint)]">
                  {stamp}
                </span>
                <p className="text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
                  <strong className="font-medium text-[var(--d-ink)]">
                    {actor}
                  </strong>{" "}
                  {row.summary}
                  {row.count > 1 && (
                    <span className="text-[var(--d-ink-faint)]">
                      {" "}
                      · {row.count} perubahan
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <p className="d-mono mt-4 border-t border-[var(--d-line)] pt-3 text-right text-[10px] uppercase tracking-[0.16em] text-[var(--d-ink-faint)]">
          {groupedAll.length - 5} jejak lainnya tersimpan
        </p>
      )}
    </section>
  );
}

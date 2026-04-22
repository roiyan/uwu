import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, orders, profiles } from "@/lib/db/schema";

export default async function AdminHome() {
  const [
    userCount,
    eventCount,
    publishedEventCount,
    orderSummary,
    recentEvents,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(profiles),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(events)
      .where(isNull(events.deletedAt)),
    db
      .select({ c: sql<number>`count(*) filter (where is_published = true)::int` })
      .from(events)
      .where(isNull(events.deletedAt)),
    db
      .select({
        paid: sql<number>`coalesce(sum(amount_idr) filter (where status = 'paid'), 0)::int`,
        paidCount: sql<number>`count(*) filter (where status = 'paid')::int`,
        pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
      })
      .from(orders),
    db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        isPublished: events.isPublished,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(isNull(events.deletedAt))
      .orderBy(desc(events.createdAt))
      .limit(10),
  ]);

  const formatIdr = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Admin Ringkasan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Data aktivitas platform untuk monitoring internal.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Total User" value={userCount[0]?.c ?? 0} />
        <Kpi label="Event Aktif" value={eventCount[0]?.c ?? 0} />
        <Kpi
          label="Event Dipublikasikan"
          value={publishedEventCount[0]?.c ?? 0}
        />
        <Kpi
          label="Pendapatan"
          value={formatIdr(orderSummary[0]?.paid ?? 0)}
          hint={`${orderSummary[0]?.paidCount ?? 0} paid • ${orderSummary[0]?.pendingCount ?? 0} pending`}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Event Terbaru</h2>
        <div className="mt-4 overflow-hidden rounded-2xl bg-surface-card shadow-ghost-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-hint">
              <tr className="border-b border-[color:var(--border-ghost)]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-[color:var(--border-ghost)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-ink">{e.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {e.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        e.isPublished
                          ? "bg-[#E8F3EE] text-[#3B7A57]"
                          : "bg-surface-muted text-ink-muted"
                      }`}
                    >
                      {e.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {new Date(e.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-ink-hint">
        Untuk pengelolaan data detail, gunakan{" "}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Supabase Dashboard
        </a>
        .
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-ink-hint">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

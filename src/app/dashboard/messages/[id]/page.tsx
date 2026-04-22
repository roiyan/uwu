import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { requireAuthedUser } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import { listDeliveriesForMessage } from "@/lib/actions/broadcast";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-surface-muted text-ink-muted",
  sent: "bg-[#E8F3EE] text-[#3B7A57]",
  delivered: "bg-[#E8F3EE] text-[#3B7A57]",
  read: "bg-navy-50 text-navy",
  failed: "bg-rose-50 text-rose-dark",
};

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuthedUser();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const [msg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.eventId, current.event.id)))
    .limit(1);
  if (!msg) notFound();

  const deliveries = await listDeliveriesForMessage(id);

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <Link
        href="/dashboard/messages"
        className="text-sm text-ink-muted hover:text-navy"
      >
        ← Kembali ke Kirim Undangan
      </Link>
      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-hint">
            {msg.channel === "whatsapp" ? "WhatsApp" : "Email"} •{" "}
            {new Date(msg.createdAt).toLocaleString("id-ID")}
          </p>
          <h1 className="mt-1 font-display text-3xl text-navy">
            Detail Broadcast
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Template: {msg.templateSlug}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
            <h2 className="font-display text-lg text-ink">Ringkasan</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Stat label="Total" value={msg.totalRecipients} />
              <Stat label="Terkirim" value={msg.sentCount} accent="#3B7A57" />
              <Stat label="Gagal" value={msg.failedCount} accent="#C0392B" />
              <Stat
                label="Status"
                value={msg.status}
                accent="#1E3A5F"
                isString
              />
            </dl>
          </div>

          {msg.subject && (
            <div className="mt-4 rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
              <h3 className="text-sm font-medium text-ink">Subject</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">
                {msg.subject}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
            <h3 className="text-sm font-medium text-ink">Template Pesan</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-muted/60 p-3 text-[12px] text-ink-muted">
              {msg.body}
            </pre>
          </div>
        </section>

        <section className="lg:col-span-3">
          <div className="rounded-2xl bg-surface-card shadow-ghost-sm">
            <div className="border-b border-[color:var(--border-ghost)] p-4">
              <h2 className="font-display text-lg text-ink">
                Daftar Penerima ({deliveries.length})
              </h2>
            </div>
            <ul className="divide-y divide-[color:var(--border-ghost)]">
              {deliveries.map((d) => (
                <li key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {d.recipientName}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {msg.channel === "whatsapp"
                          ? d.recipientPhone
                          : d.recipientEmail}
                      </p>
                      {d.errorMessage && (
                        <p className="mt-1 text-xs text-rose-dark">{d.errorMessage}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_STYLE[d.status] ?? STATUS_STYLE.pending
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  isString,
}: {
  label: string;
  value: string | number;
  accent?: string;
  isString?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd
        className="font-display"
        style={{ color: accent, fontSize: isString ? "1rem" : "1.5rem" }}
      >
        {value}
      </dd>
    </div>
  );
}

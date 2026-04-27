import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireSessionUserFast } from "@/lib/auth-guard";
import { getCurrentEventForUser } from "@/lib/db/queries/events";
import { getBroadcastDetail } from "@/lib/actions/broadcast";
import { DeliveryListClient } from "./delivery-list-client";

const HISTORY_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  queued: "Antri",
  sending: "Mengirim",
  completed: "Selesai",
  failed: "Belum terkirim",
  scheduled: "Terjadwal",
  cancelled: "Dibatalkan",
};

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUserFast();
  const current = await getCurrentEventForUser(user.id);
  if (!current) redirect("/onboarding");

  const detail = await getBroadcastDetail(current.event.id, id);
  if (!detail) notFound();

  const { message: msg, deliveries, groupNames, counts } = detail;

  const audienceLabel =
    msg.audience.type === "all"
      ? "Semua tamu"
      : msg.audience.type === "group"
        ? `Grup: ${groupNames.length > 0 ? groupNames.join(", ") : "-"}`
        : `Status: ${msg.audience.statuses.join(", ")}`;

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <Link
        href="/dashboard/messages"
        className="text-sm text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
      >
        ← Kembali ke Kirim Undangan
      </Link>
      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--d-ink-faint)]">
            <span aria-hidden>{msg.channel === "whatsapp" ? "📱" : "✉️"}</span>{" "}
            {msg.channel === "whatsapp" ? "WhatsApp" : "Email"} •{" "}
            {new Date(msg.createdAt).toLocaleString("id-ID")}
          </p>
          <h1 className="mt-1 font-display text-3xl text-[var(--d-ink)]">
            {msg.subject ?? "Detail Broadcast"}
          </h1>
          <p className="mt-1 text-sm text-[var(--d-ink-dim)]">
            Template: {msg.templateSlug} • {audienceLabel}
          </p>
          {msg.scheduledAt && (
            <p className="mt-1 text-sm text-[#3949AB]">
              📅 Terjadwal:{" "}
              {new Date(msg.scheduledAt).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <span className="rounded-full bg-[rgba(143,163,217,0.08)] px-3 py-1 text-xs font-medium text-[var(--d-ink)]">
          {HISTORY_STATUS_LABEL[msg.status] ?? msg.status}
        </span>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Tamu"
          value={counts.total}
          accent="#1E3A5F"
        />
        <StatCard
          label="Terkirim"
          value={counts.sent}
          accent="#3B7A57"
        />
        <StatCard
          label="Belum terkirim"
          value={counts.failed}
          accent="#C0392B"
        />
        <StatCard
          label="Undangan Dibuka"
          value={counts.opened}
          accent="#3949AB"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          {msg.subject && (
            <div className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
              <h3 className="text-sm font-medium text-[var(--d-ink)]">Subjek</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--d-ink-dim)]">
                {msg.subject}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
            <h3 className="text-sm font-medium text-[var(--d-ink)]">Template Pesan</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--d-bg-2)] p-3 text-[12px] text-[var(--d-ink-dim)]">
              {msg.body}
            </pre>
          </div>
        </section>

        <section className="lg:col-span-3">
          <DeliveryListClient
            channel={msg.channel}
            counts={counts}
            deliveries={deliveries.map((d) => ({
              id: d.id,
              recipientName: d.recipientName,
              recipientPhone: d.recipientPhone,
              recipientEmail: d.recipientEmail,
              status: d.status,
              errorMessage: d.errorMessage,
              sentAt: d.sentAt ? d.sentAt.toISOString() : null,
              guestOpenedAt: d.guestOpenedAt
                ? d.guestOpenedAt.toISOString()
                : null,
              guestRsvpStatus: d.guestRsvpStatus,
            }))}
          />
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--d-bg-card)] p-4 shadow-ghost-sm">
      <p className="text-xs uppercase tracking-wide text-[var(--d-ink-faint)]">{label}</p>
      <p
        className="mt-1 font-display text-2xl"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}

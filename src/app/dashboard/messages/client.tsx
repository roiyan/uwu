"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  createBroadcastAction,
  retryFailedDeliveriesAction,
  runBroadcastAction,
} from "@/lib/actions/broadcast";
import type { MessageTemplate } from "@/lib/templates/messages";

type Channel = "whatsapp" | "email";
type GuestStatus = "baru" | "diundang" | "dibuka" | "hadir" | "tidak_hadir";
type Audience =
  | { type: "all" }
  | { type: "group"; groupIds: string[] }
  | { type: "status"; statuses: GuestStatus[] };

type GroupRow = { id: string; name: string; color: string | null };

type HistoryRow = {
  id: string;
  channel: Channel;
  templateSlug: string;
  status: "draft" | "queued" | "sending" | "completed" | "failed";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  subject: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2.5 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]";

const STATUS_LABEL: Record<GuestStatus, string> = {
  baru: "Baru",
  diundang: "Diundang",
  dibuka: "Dibuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
};

const HISTORY_STATUS_STYLE: Record<HistoryRow["status"], string> = {
  draft: "bg-surface-muted text-ink-muted",
  queued: "bg-navy-50 text-navy",
  sending: "bg-gold-50 text-gold-dark",
  completed: "bg-[#E8F3EE] text-[#3B7A57]",
  failed: "bg-rose-50 text-rose-dark",
};

export function MessagesClient({
  eventId,
  culturalPreference,
  templates,
  groups,
  history,
  providers,
}: {
  eventId: string;
  culturalPreference: "islami" | "umum" | "custom";
  templates: MessageTemplate[];
  groups: GroupRow[];
  history: HistoryRow[];
  providers: { whatsappConfigured: boolean; emailConfigured: boolean };
}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  );

  const defaultTemplate =
    channelTemplates.find((t) => t.culturalPreference === culturalPreference) ??
    channelTemplates.find((t) => t.culturalPreference === "umum") ??
    channelTemplates[0];

  const [templateSlug, setTemplateSlug] = useState(defaultTemplate.slug);
  const currentTemplate =
    channelTemplates.find((t) => t.slug === templateSlug) ?? defaultTemplate;

  const [body, setBody] = useState(currentTemplate.body);
  const [subject, setSubject] = useState(currentTemplate.subject ?? "");

  const [audience, setAudience] = useState<Audience>({ type: "all" });

  const create = createBroadcastAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(create, null);
  const [runPending, startRun] = useTransition();
  const [runError, setRunError] = useState<string | null>(null);

  function selectChannel(c: Channel) {
    setChannel(c);
    const t =
      templates.find(
        (x) => x.channel === c && x.culturalPreference === culturalPreference,
      ) ??
      templates.find((x) => x.channel === c && x.culturalPreference === "umum") ??
      templates.find((x) => x.channel === c)!;
    setTemplateSlug(t.slug);
    setBody(t.body);
    setSubject(t.subject ?? "");
  }

  function selectTemplate(slug: string) {
    const t = channelTemplates.find((x) => x.slug === slug);
    if (!t) return;
    setTemplateSlug(slug);
    setBody(t.body);
    setSubject(t.subject ?? "");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <h2 className="font-display text-xl text-ink">Buat Broadcast</h2>

          <div className="mt-4">
            <span className="text-sm font-medium text-ink">Kanal</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ChannelButton
                active={channel === "whatsapp"}
                onClick={() => selectChannel("whatsapp")}
                label="📱 WhatsApp"
                hint={providers.whatsappConfigured ? "Aktif" : "Mode simulasi"}
              />
              <ChannelButton
                active={channel === "email"}
                onClick={() => selectChannel("email")}
                label="✉️ Email"
                hint={providers.emailConfigured ? "Aktif" : "Mode simulasi"}
              />
            </div>
          </div>

          <input type="hidden" name="channel" value={channel} />

          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink">Template</span>
            <select
              value={templateSlug}
              onChange={(e) => selectTemplate(e.target.value)}
              className={inputClass}
            >
              {channelTemplates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-hint">
              {currentTemplate.description}
            </span>
          </label>
          <input type="hidden" name="templateSlug" value={templateSlug} />

          {channel === "email" && (
            <label className="mt-4 block">
              <span className="text-sm font-medium text-ink">Subject</span>
              <input
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
                placeholder="Undangan Pernikahan — {bride} & {groom}"
              />
            </label>
          )}

          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink">Isi Pesan</span>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
              required
            />
            <span className="mt-1 block text-xs text-ink-hint">
              Placeholder tersedia: <code className="rounded bg-surface-muted px-1">{"{name}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{bride}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{groom}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{date}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{venue}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{link}"}</code>
            </span>
          </label>

          <div className="mt-5">
            <span className="text-sm font-medium text-ink">Audiens</span>
            <div className="mt-2 space-y-2">
              <AudienceRadio
                active={audience.type === "all"}
                onClick={() => setAudience({ type: "all" })}
                label="Semua tamu"
                hint="Kirim ke seluruh daftar tamu yang memiliki kontak."
              />
              <AudienceRadio
                active={audience.type === "group"}
                onClick={() =>
                  setAudience(
                    audience.type === "group"
                      ? audience
                      : { type: "group", groupIds: [] },
                  )
                }
                label="Berdasarkan grup"
                hint="Pilih grup tamu tertentu."
              >
                {audience.type === "group" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groups.length === 0 && (
                      <span className="text-xs text-ink-hint">
                        Belum ada grup — buat di halaman Tamu.
                      </span>
                    )}
                    {groups.map((g) => {
                      const checked = audience.groupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            checked
                              ? "border-navy bg-navy-50 text-navy"
                              : "border-[color:var(--border-ghost)] text-ink-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              setAudience({
                                type: "group",
                                groupIds: checked
                                  ? audience.groupIds.filter((id) => id !== g.id)
                                  : [...audience.groupIds, g.id],
                              })
                            }
                          />
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: g.color ?? "var(--color-gold-50)" }}
                          />
                          {g.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </AudienceRadio>
              <AudienceRadio
                active={audience.type === "status"}
                onClick={() =>
                  setAudience(
                    audience.type === "status"
                      ? audience
                      : { type: "status", statuses: [] },
                  )
                }
                label="Berdasarkan status RSVP"
                hint="Misalnya: kirim ulang ke tamu yang belum buka."
              >
                {audience.type === "status" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(STATUS_LABEL) as GuestStatus[]).map((s) => {
                      const checked = audience.statuses.includes(s);
                      return (
                        <label
                          key={s}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            checked
                              ? "border-navy bg-navy-50 text-navy"
                              : "border-[color:var(--border-ghost)] text-ink-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              setAudience({
                                type: "status",
                                statuses: checked
                                  ? audience.statuses.filter((x) => x !== s)
                                  : [...audience.statuses, s],
                              })
                            }
                          />
                          {STATUS_LABEL[s]}
                        </label>
                      );
                    })}
                  </div>
                )}
              </AudienceRadio>
            </div>
          </div>

          <input type="hidden" name="audience" value={JSON.stringify(audience)} />

          {state && !state.ok && (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
              {state.error}
            </p>
          )}
          {state?.ok && state.data?.messageId && (
            <div className="mt-4 rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
              Broadcast dibuat. Tekan &quot;Kirim Sekarang&quot; di bawah untuk memulai.
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border border-[color:var(--border-medium)] px-6 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {pending ? "Menyimpan..." : "Simpan Broadcast"}
            </button>
            {state?.ok && state.data?.messageId && (
              <button
                type="button"
                disabled={runPending}
                onClick={() => {
                  const id = state.data!.messageId;
                  setRunError(null);
                  startRun(async () => {
                    const r = await runBroadcastAction(eventId, id);
                    if (!r.ok) setRunError(r.error);
                  });
                }}
                className="rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
              >
                {runPending ? "Mengirim..." : "Kirim Sekarang"}
              </button>
            )}
          </div>
          {runError && (
            <p className="mt-3 text-sm text-rose-dark">{runError}</p>
          )}
        </form>
      </section>

      <section className="lg:col-span-2">
        <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <h2 className="font-display text-xl text-ink">Riwayat</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              Belum ada broadcast. Buat broadcast pertama di panel kiri.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map((h) => (
                <HistoryCard key={h.id} row={h} eventId={eventId} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function HistoryCard({ row, eventId }: { row: HistoryRow; eventId: string }) {
  const [pending, startTransition] = useTransition();

  const pct =
    row.totalRecipients > 0
      ? Math.round((row.sentCount / row.totalRecipients) * 100)
      : 0;

  return (
    <li className="rounded-xl bg-surface-muted/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-hint">
            {row.channel === "whatsapp" ? "WhatsApp" : "Email"} •{" "}
            {new Date(row.createdAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-sm font-medium text-ink">{row.templateSlug}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${HISTORY_STATUS_STYLE[row.status]}`}
        >
          {row.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          {row.sentCount}/{row.totalRecipients} terkirim
          {row.failedCount > 0 && ` • ${row.failedCount} gagal`}
        </span>
        <span className="text-ink-muted">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#3B7A57]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-3 text-xs">
        {row.status === "queued" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await runBroadcastAction(eventId, row.id);
              })
            }
            className="font-medium text-navy hover:underline disabled:opacity-60"
          >
            {pending ? "Mengirim..." : "Kirim Sekarang"}
          </button>
        )}
        {row.status === "completed" && row.failedCount > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await retryFailedDeliveriesAction(eventId, row.id);
              })
            }
            className="font-medium text-navy hover:underline disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Kirim ulang gagal"}
          </button>
        )}
        <Link
          href={`/dashboard/messages/${row.id}`}
          className="font-medium text-ink-muted hover:text-navy"
        >
          Detail →
        </Link>
      </div>
    </li>
  );
}

function ChannelButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-left transition-colors ${
        active
          ? "bg-navy text-ink-inverse"
          : "border border-[color:var(--border-ghost)] bg-white text-ink hover:bg-surface-muted"
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className={`text-[11px] ${active ? "text-white/80" : "text-ink-muted"}`}>
        {hint}
      </p>
    </button>
  );
}

function AudienceRadio({
  active,
  onClick,
  label,
  hint,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        active ? "border-navy bg-navy-50" : "border-[color:var(--border-ghost)] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            active ? "border-navy" : "border-ink-hint"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-navy" />}
        </span>
        <span>
          <span className="block text-sm font-medium text-ink">{label}</span>
          <span className="block text-xs text-ink-muted">{hint}</span>
        </span>
      </button>
      {children}
    </div>
  );
}

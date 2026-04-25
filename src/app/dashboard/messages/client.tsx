"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  cancelScheduledBroadcast,
  createBroadcastAction,
  retryFailedDeliveriesAction,
  runBroadcastAction,
} from "@/lib/actions/broadcast";
import dynamic from "next/dynamic";
import { renderTemplate, type MessageTemplate } from "@/lib/templates/messages";
import { WaFallbackSender } from "./wa-fallback-sender";

// AI assistant modal lives behind a click and brings ~25 kB of
// preset arrays + form chrome with it. Lazy-load so the messages
// page first-load only pays for it when the user opens it.
const AiMessageModal = dynamic(
  () => import("./ai-message-modal").then((m) => m.AiMessageModal),
  { ssr: false, loading: () => null },
);

type RecipientSample = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  token: string;
  groupId: string | null;
  rsvpStatus: GuestStatus;
  sendCount: number;
};

type EventContext = {
  slug: string;
  bride: string;
  groom: string;
  date: string;
  venue: string;
};

// "both" is a UI affordance that creates two broadcasts (one per
// channel) on submit. The schema/server action only ever sees
// "whatsapp" or "email".
type Channel = "whatsapp" | "email" | "both";
type GuestStatus = "baru" | "diundang" | "dibuka" | "hadir" | "tidak_hadir";
type Audience =
  | { type: "all" }
  | { type: "group"; groupIds: string[] }
  | { type: "status"; statuses: GuestStatus[] };

type GroupRow = {
  id: string;
  name: string;
  color: string | null;
  liveCount: number;
};

type HistoryStatus =
  | "draft"
  | "queued"
  | "sending"
  | "completed"
  | "failed"
  | "scheduled"
  | "cancelled";

type HistoryRow = {
  id: string;
  channel: Channel;
  templateSlug: string;
  status: HistoryStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  scheduledAt: string | null;
  subject: string | null;
  audienceLabel: string;
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

const HISTORY_STATUS_STYLE: Record<HistoryStatus, string> = {
  draft: "bg-surface-muted text-ink-muted",
  queued: "bg-navy-50 text-navy",
  sending: "bg-gold-50 text-gold-dark",
  completed: "bg-[#E8F3EE] text-[#3B7A57]",
  failed: "bg-rose-50 text-rose-dark",
  scheduled: "bg-[#EEF2FF] text-[#3949AB]",
  cancelled: "bg-surface-muted text-ink-hint line-through",
};

const HISTORY_STATUS_LABEL: Record<HistoryStatus, string> = {
  draft: "Draft",
  queued: "Antri",
  sending: "Mengirim",
  completed: "Selesai",
  failed: "Gagal",
  scheduled: "Terjadwal",
  cancelled: "Dibatalkan",
};

/**
 * Default value for the schedule picker. Returns ISO-like local time
 * truncated to minutes — what `<input type="datetime-local" />` wants.
 * Empty string means "send immediately".
 */
function nowPlusMinutes(mins: number): string {
  const d = new Date(Date.now() + mins * 60_000);
  // YYYY-MM-DDTHH:mm in local time (datetime-local has no timezone).
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MessagesClient({
  eventId,
  culturalPreference,
  templates,
  groups,
  history,
  providers,
  alreadySentCount,
  recipientSample,
  eventContext,
}: {
  eventId: string;
  culturalPreference: "islami" | "umum" | "custom";
  templates: MessageTemplate[];
  groups: GroupRow[];
  history: HistoryRow[];
  providers: {
    whatsappConfigured: boolean;
    emailConfigured: boolean;
    aiAvailable: boolean;
  };
  alreadySentCount: number;
  recipientSample: RecipientSample[];
  eventContext: EventContext;
}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  // For "both", the editable body uses WA templates; the email half
  // uses its matching template body unmodified at submit time.
  const channelTemplates = useMemo(() => {
    const lookup = channel === "both" ? "whatsapp" : channel;
    return templates.filter((t) => t.channel === lookup);
  }, [templates, channel]);

  const defaultTemplate =
    channelTemplates.find((t) => t.culturalPreference === culturalPreference) ??
    channelTemplates.find((t) => t.culturalPreference === "umum") ??
    channelTemplates[0];

  const [templateSlug, setTemplateSlug] = useState(defaultTemplate.slug);
  const currentTemplate =
    channelTemplates.find((t) => t.slug === templateSlug) ?? defaultTemplate;

  const [body, setBody] = useState(currentTemplate.body);
  const [subject, setSubject] = useState(currentTemplate.subject ?? "");
  // Independent email body when channel === "both" — lets user
  // customize the email half separately from the WA body.
  const initialEmailTpl = useMemo(() => {
    return (
      templates.find(
        (x) =>
          x.channel === "email" &&
          x.culturalPreference === culturalPreference,
      ) ??
      templates.find((x) => x.channel === "email" && x.culturalPreference === "umum") ??
      templates.find((x) => x.channel === "email")!
    );
  }, [templates, culturalPreference]);
  const [emailBody, setEmailBody] = useState(initialEmailTpl.body);

  // Which editor the AI modal is targeting — null = closed.
  // "primary" = the WA-or-Email body in the main textarea.
  // "email"   = the secondary email body shown only when "both".
  const [aiTarget, setAiTarget] = useState<null | "primary" | "email">(null);

  const [audience, setAudience] = useState<Audience>({ type: "all" });
  // "new_only" = skip guests already invited at least once (default,
  // safer). User opts in to resend via the checkbox.
  const [includeSent, setIncludeSent] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Schedule controls — only used when channel is email or both. WA
  // broadcasts are user-paced (manual fallback or live API), so the
  // picker is hidden then. Empty string = send immediately.
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    nowPlusMinutes(60),
  );
  // Convert the local datetime-local string to an ISO string with
  // offset, which is what the Zod schema expects. Empty when disabled.
  const scheduledAtIso =
    scheduleEnabled && scheduledLocal && (channel === "email" || channel === "both")
      ? new Date(scheduledLocal).toISOString()
      : "";

  const [cancelPending, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(() => new Set());

  // Filter the recipient sample client-side the same way the server
  // will filter at send time — channel availability, audience, resend
  // mode. The preview navigator iterates this list.
  const filteredRecipients = useMemo(() => {
    return recipientSample.filter((g) => {
      if (channel === "whatsapp" && !(g.phone && g.phone.trim().length > 0))
        return false;
      if (channel === "email" && !(g.email && g.email.trim().length > 0))
        return false;
      if (audience.type === "group" && !audience.groupIds.includes(g.groupId ?? ""))
        return false;
      if (audience.type === "status" && !audience.statuses.includes(g.rsvpStatus))
        return false;
      if (!includeSent && g.sendCount > 0) return false;
      return true;
    });
  }, [recipientSample, channel, audience, includeSent]);

  // Clamp previewIndex whenever the filtered list shrinks (e.g. user
  // narrows the audience). Functional setState avoids the dep.
  useEffect(() => {
    setPreviewIndex((idx) =>
      filteredRecipients.length === 0
        ? 0
        : Math.min(idx, filteredRecipients.length - 1),
    );
  }, [filteredRecipients.length]);

  const previewGuest = filteredRecipients[previewIndex] ?? null;

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://uwu-beta.vercel.app";

  const previewBody = previewGuest
    ? renderTemplate(body, {
        name: previewGuest.name,
        nickname: previewGuest.nickname,
        bride: eventContext.bride,
        groom: eventContext.groom,
        date: eventContext.date,
        venue: eventContext.venue,
        link: `${appBase}/${eventContext.slug}?to=${previewGuest.token}`,
      })
    : "";

  const create = createBroadcastAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(create, null);
  const [runPending, startRun] = useTransition();
  const [runError, setRunError] = useState<string | null>(null);
  // For "both" channel: paired email broadcast created in the
  // background after the primary WA broadcast lands.
  const [pairedEmailId, setPairedEmailId] = useState<string | null>(null);
  const [pairedError, setPairedError] = useState<string | null>(null);
  const [pairedPending, startPaired] = useTransition();
  // Toggle to render the client-side WA fallback sender after a WA
  // broadcast is created when WA Cloud API isn't configured.
  const [waFallbackOpen, setWaFallbackOpen] = useState(false);

  // When channel === "both" and the WA broadcast was just created,
  // fire a second createBroadcastAction with the matching cultural-
  // preference email template (un-edited body + subject). Same
  // audience and resendMode as the WA half.
  useEffect(() => {
    if (channel !== "both") return;
    if (!state?.ok || !state.data?.messageId) return;
    if (pairedEmailId || pairedPending) return;

    // Email half — uses the user-edited emailBody + subject from the
    // dual-editor. Template slug stays at the matching cultural-pref
    // email template so history rendering stays consistent.
    const emailTpl =
      templates.find(
        (x) => x.channel === "email" && x.culturalPreference === culturalPreference,
      ) ??
      templates.find(
        (x) => x.channel === "email" && x.culturalPreference === "umum",
      ) ??
      templates.find((x) => x.channel === "email")!;

    startPaired(async () => {
      const fd = new FormData();
      fd.append("channel", "email");
      fd.append("templateSlug", emailTpl.slug);
      fd.append("subject", subject || emailTpl.subject || "Undangan Pernikahan");
      fd.append("body", emailBody);
      fd.append("audience", JSON.stringify(audience));
      fd.append("resendMode", includeSent ? "include_sent" : "new_only");
      fd.append("scheduledAt", scheduledAtIso);
      const res = await create(null, fd);
      if (res.ok && res.data?.messageId) {
        setPairedEmailId(res.data.messageId);
      } else if (!res.ok) {
        setPairedError(res.error);
      }
    });
  }, [
    channel,
    state,
    pairedEmailId,
    pairedPending,
    templates,
    culturalPreference,
    subject,
    emailBody,
    audience,
    includeSent,
    scheduledAtIso,
    create,
  ]);

  function selectChannel(c: Channel) {
    setChannel(c);
    // For "both", we use a WA template as the editable body (WA is the
    // more constrained channel). The matching email template runs
    // unmodified at submit time.
    const lookupChannel = c === "both" ? "whatsapp" : c;
    const t =
      templates.find(
        (x) =>
          x.channel === lookupChannel &&
          x.culturalPreference === culturalPreference,
      ) ??
      templates.find(
        (x) => x.channel === lookupChannel && x.culturalPreference === "umum",
      ) ??
      templates.find((x) => x.channel === lookupChannel)!;
    setTemplateSlug(t.slug);
    setBody(t.body);
    // Email subject is auto-derived from the matching email template
    // when sending both; user can still override via the input.
    if (c === "both") {
      const emailTpl =
        templates.find(
          (x) =>
            x.channel === "email" &&
            x.culturalPreference === culturalPreference,
        ) ??
        templates.find(
          (x) => x.channel === "email" && x.culturalPreference === "umum",
        ) ??
        templates.find((x) => x.channel === "email")!;
      setSubject(emailTpl.subject ?? "");
    } else {
      setSubject(t.subject ?? "");
    }
  }

  function selectTemplate(slug: string) {
    const t = channelTemplates.find((x) => x.slug === slug);
    if (!t) return;
    setTemplateSlug(slug);
    setBody(t.body);
    setSubject(t.subject ?? "");
  }

  // Tab toggle between the compose form and the full history list. The
  // side panel on the compose tab still shows recent broadcasts, so
  // Riwayat is the "see everything in detail" view.
  const [activeTab, setActiveTab] = useState<"compose" | "history">(
    "compose",
  );

  return (
    <>
      <div className="mb-6 inline-flex rounded-full border border-[color:var(--border-ghost)] bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "compose"
              ? "bg-navy text-white"
              : "text-ink-muted hover:text-navy"
          }`}
        >
          Kirim Baru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-navy text-white"
              : "text-ink-muted hover:text-navy"
          }`}
        >
          Riwayat ({history.length})
        </button>
      </div>

      {activeTab === "history" ? (
        <HistoryListPanel history={history} eventId={eventId} />
      ) : (
        <ComposeView />
      )}
    </>
  );

  // Compose view kept as an inner function so the existing JSX stays
  // intact and we don't have to thread every state value through props.
  function ComposeView() {
    return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <form action={formAction} className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <h2 className="font-display text-xl text-ink">Buat Broadcast</h2>

          <div className="mt-4">
            <span className="text-sm font-medium text-ink">Kanal</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ChannelButton
                active={channel === "whatsapp"}
                onClick={() => selectChannel("whatsapp")}
                label="📱 WhatsApp"
                hint={
                  providers.whatsappConfigured
                    ? "Server aktif"
                    : "Mode manual"
                }
              />
              <ChannelButton
                active={channel === "email"}
                onClick={() => selectChannel("email")}
                label="✉️ Email"
                hint={providers.emailConfigured ? "Aktif" : "Mode simulasi"}
              />
              <ChannelButton
                active={channel === "both"}
                onClick={() => selectChannel("both")}
                label="📨 Keduanya"
                hint="Email + WA"
              />
            </div>
          </div>

          {/* Upgrade CTA — visible only when the user has chosen a WA
              channel but the Cloud API isn't configured. UI-only; the
              Lite/PRO upgrade itself happens on the /harga page. */}
          {(channel === "whatsapp" || channel === "both") &&
            !providers.whatsappConfigured && (
              <UpgradeWhatsAppCard />
            )}

          {/* The form sends the WA half when channel is "both"; the
              email half is fired separately by the submit handler. */}
          <input
            type="hidden"
            name="channel"
            value={channel === "both" ? "whatsapp" : channel}
          />

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

          {(channel === "email" || channel === "both") && (
            <label className="mt-4 block">
              <span className="text-sm font-medium text-ink">
                {channel === "both" ? "Subject Email" : "Subject"}
              </span>
              <input
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
                placeholder="Undangan Pernikahan — {bride} & {groom}"
              />
            </label>
          )}

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                {channel === "both"
                  ? "📱 Isi Pesan WhatsApp"
                  : channel === "email"
                    ? "✉️ Isi Pesan Email"
                    : "Isi Pesan"}
              </span>
              {providers.aiAvailable && (
                <button
                  type="button"
                  onClick={() => setAiTarget("primary")}
                  className="rounded-full border border-[color:var(--border-medium)] px-3 py-1 text-xs text-navy hover:bg-surface-muted"
                >
                  ✨ Bantu Tulis
                </button>
              )}
            </div>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
              required
            />
            <span className="mt-1 block text-xs text-ink-hint">
              Placeholder: <code className="rounded bg-surface-muted px-1">{"{nama}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{panggilan}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{bride}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{groom}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{date}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{venue}"}</code>,{" "}
              <code className="rounded bg-surface-muted px-1">{"{link_undangan}"}</code>
            </span>
          </div>

          {channel === "both" && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  ✉️ Isi Pesan Email
                </span>
                {providers.aiAvailable && (
                  <button
                    type="button"
                    onClick={() => setAiTarget("email")}
                    className="rounded-full border border-[color:var(--border-medium)] px-3 py-1 text-xs text-navy hover:bg-surface-muted"
                  >
                    ✨ Bantu Tulis
                  </button>
                )}
              </div>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
              />
              <span className="mt-1 block text-xs text-ink-hint">
                Email pakai gaya lebih formal. Placeholder yang sama
                berlaku.
              </span>
            </div>
          )}

          {(channel === "email" || channel === "both") && (
            <div className="mt-5 rounded-xl border border-[color:var(--border-ghost)] bg-white p-4">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    📅 Jadwalkan pengiriman email
                  </span>
                  <span className="block text-xs text-ink-muted">
                    Email akan otomatis terkirim pada waktu yang Anda pilih.
                    Jika tidak dicentang, email dikirim segera setelah Anda
                    tekan tombol kirim.
                  </span>
                </span>
              </label>
              {scheduleEnabled && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-ink-muted">
                    Waktu kirim
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledLocal}
                    onChange={(e) => setScheduledLocal(e.target.value)}
                    min={nowPlusMinutes(5)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-ink-hint">
                    Cron menjalankan pengiriman setiap hari pukul 09:00 UTC
                    (16:00 WIB). Email akan terkirim pada cron berikutnya
                    setelah waktu yang Anda pilih lewat.
                  </p>
                </div>
              )}
            </div>
          )}
          <input type="hidden" name="scheduledAt" value={scheduledAtIso} />

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
                          <span className="text-[10px] text-ink-hint">
                            ({g.liveCount})
                          </span>
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
          <input
            type="hidden"
            name="resendMode"
            value={includeSent ? "include_sent" : "new_only"}
          />

          {/* Per-guest preview — shows what the first/current
              filtered recipient will actually receive. Renders client-
              side using the same renderTemplate as the server. */}
          <div className="mt-5 rounded-xl border border-[color:var(--border-ghost)] bg-surface-muted p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">
                Preview Pesan
              </span>
              <span className="text-xs text-ink-hint">
                {filteredRecipients.length === 0
                  ? "Tidak ada tamu terpilih"
                  : `${previewIndex + 1} dari ${filteredRecipients.length}`}
              </span>
            </div>
            {previewGuest ? (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>
                    Untuk:{" "}
                    <strong className="text-ink">{previewGuest.name}</strong>
                    {previewGuest.nickname && (
                      <span className="ml-1 text-ink-hint">
                        ({previewGuest.nickname})
                      </span>
                    )}
                  </span>
                  {channel === "whatsapp" && previewGuest.phone && (
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                      {previewGuest.phone}
                    </span>
                  )}
                  {channel === "email" && previewGuest.email && (
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                      {previewGuest.email}
                    </span>
                  )}
                  {previewGuest.sendCount > 0 && (
                    <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[10px] text-coral-dark">
                      Kirim ulang · {previewGuest.sendCount}×
                    </span>
                  )}
                </div>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[12px] leading-relaxed text-ink">
                  {previewBody}
                </pre>
              </>
            ) : (
              <p className="text-xs text-ink-hint">
                Pilih audiens dan kanal untuk melihat preview pesan.
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setPreviewIndex((i) => Math.max(0, i - 1))
                }
                disabled={!previewGuest || previewIndex === 0}
                className="rounded-full border border-[color:var(--border-medium)] px-3 py-1 text-xs text-navy transition-colors hover:bg-white disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                onClick={() =>
                  setPreviewIndex((i) =>
                    Math.min(filteredRecipients.length - 1, i + 1),
                  )
                }
                disabled={
                  !previewGuest ||
                  previewIndex >= filteredRecipients.length - 1
                }
                className="rounded-full border border-[color:var(--border-medium)] px-3 py-1 text-xs text-navy transition-colors hover:bg-white disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </div>

          {alreadySentCount > 0 && (
            <div className="mt-5 rounded-xl border border-[color:var(--border-ghost)] bg-surface-muted px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-ink">
                <span>⚠️</span>
                <span>
                  <strong>{alreadySentCount}</strong> tamu sudah pernah
                  diundang.
                </span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={includeSent}
                  onChange={(e) => setIncludeSent(e.target.checked)}
                />
                <span>
                  Sertakan yang sudah diundang ({alreadySentCount} tamu)
                </span>
              </label>
              <p className="mt-1 text-xs text-ink-hint">
                Secara default, broadcast hanya dikirim ke tamu yang
                belum pernah diundang.
              </p>
            </div>
          )}

          {state && !state.ok && (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-dark">
              {state.error}
            </p>
          )}
          {state?.ok && state.data?.messageId && (
            <div className="mt-4 rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-dark">
              {scheduledAtIso && channel === "email"
                ? `Broadcast email terjadwal untuk ${new Date(scheduledAtIso).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}.`
                : channel === "both"
                  ? pairedEmailId
                    ? scheduledAtIso
                      ? `WA: kirim manual di bawah. Email terjadwal untuk ${new Date(scheduledAtIso).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}.`
                      : "Dua broadcast dibuat (Email + WA). Kirim masing-masing di bawah."
                    : pairedPending
                      ? "Broadcast WA dibuat. Membuat broadcast Email…"
                      : "Broadcast dibuat. Tekan tombol kirim di bawah."
                  : "Broadcast dibuat. Tekan \"Kirim Sekarang\" di bawah."}
            </div>
          )}
          {cancelError && (
            <p className="mt-2 text-sm text-rose-dark">{cancelError}</p>
          )}
          {pairedError && (
            <p className="mt-2 text-sm text-rose-dark">
              Broadcast email gagal dibuat: {pairedError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border border-[color:var(--border-medium)] px-6 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {pending ? "Menyimpan..." : "Simpan Broadcast"}
            </button>

            {/* Cancel button for the scheduled email half. The cron
                handler skips broadcasts in 'cancelled' status. */}
            {scheduledAtIso &&
              (channel === "email" || channel === "both") &&
              ((channel === "email" && state?.ok && state.data?.messageId) ||
                (channel === "both" && pairedEmailId)) && (
                <button
                  type="button"
                  disabled={cancelPending}
                  onClick={() => {
                    const id =
                      channel === "both"
                        ? pairedEmailId
                        : state?.ok
                          ? state.data?.messageId
                          : null;
                    if (!id) return;
                    setCancelError(null);
                    startCancel(async () => {
                      const r = await cancelScheduledBroadcast(eventId, id);
                      if (!r.ok) {
                        setCancelError(r.error);
                      } else {
                        setCancelledIds((prev) => new Set(prev).add(id));
                      }
                    });
                  }}
                  className="rounded-full border border-[color:var(--border-medium)] px-6 py-2 text-sm font-medium text-rose-dark transition-colors hover:bg-rose-50 disabled:opacity-60"
                >
                  {cancelPending ? "Membatalkan..." : "Batalkan Jadwal"}
                </button>
              )}

            {/* Paired Email broadcast (only shown when channel ===
                "both", and never for scheduled — those fire via cron).
                Kept first so the user sends email before opening WA
                tabs. */}
            {pairedEmailId && !scheduledAtIso && !cancelledIds.has(pairedEmailId) && (
              <button
                type="button"
                disabled={runPending}
                onClick={() => {
                  setRunError(null);
                  startRun(async () => {
                    const r = await runBroadcastAction(eventId, pairedEmailId);
                    if (!r.ok) setRunError(r.error);
                  });
                }}
                className="rounded-full bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
              >
                ✉️ Kirim Email
              </button>
            )}

            {state?.ok && state.data?.messageId && (
              <>
                {/* For scheduled email broadcasts, no immediate-send
                    button — cron picks it up. */}
                {channel === "email" && scheduledAtIso ? null : channel === "email" ? (
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
                    className="rounded-full bg-navy px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                  >
                    {runPending ? "Mengirim..." : "✉️ Kirim Email Sekarang"}
                  </button>
                ) : null}
                {/* The active WA broadcast — server-side run when the
                    Cloud API is configured, client-side fallback
                    otherwise. Only shown when the WA half exists. */}
                {channel !== "email" &&
                  (providers.whatsappConfigured ? (
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
                      {runPending ? "Mengirim..." : "📱 Kirim WhatsApp"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWaFallbackOpen(true)}
                      className="rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
                    >
                      📱 Kirim WhatsApp (manual)
                    </button>
                  ))}
              </>
            )}
          </div>
          {runError && (
            <p className="mt-3 text-sm text-rose-dark">{runError}</p>
          )}
        </form>

        {/* Client-side WhatsApp fallback — only renders when the user
            opted in via the "Kirim WhatsApp (manual)" button above. */}
        {waFallbackOpen && state?.ok && state.data?.messageId && (
          <div className="mt-4">
            <WaFallbackSender
              eventId={eventId}
              messageId={state.data.messageId}
              onClose={() => setWaFallbackOpen(false)}
            />
          </div>
        )}

        {/* AI assistant modal. The target tells us which textarea to
            populate when the user clicks "Pakai Pesan Ini". The
            channel passed to the modal is mapped from aiTarget so the
            email assistant always renders email-style copy even when
            the active form channel is "both". */}
        {aiTarget && providers.aiAvailable && (
          <AiMessageModal
            open
            onClose={() => setAiTarget(null)}
            channel={
              aiTarget === "email"
                ? "email"
                : channel === "email"
                  ? "email"
                  : "whatsapp"
            }
            eventContext={{
              coupleName: eventContext.bride + " & " + eventContext.groom,
              eventDate: eventContext.date,
              venue: eventContext.venue,
              slug: eventContext.slug,
            }}
            onUseMessage={(text) => {
              if (aiTarget === "email") {
                setEmailBody(text);
              } else {
                setBody(text);
              }
              setAiTarget(null);
            }}
          />
        )}
      </section>

      <section className="lg:col-span-2">
        <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Terbaru</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="text-xs font-medium text-navy hover:underline"
              >
                Lihat semua →
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              Belum ada broadcast. Buat broadcast pertama di panel kiri.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.slice(0, 5).map((h) => (
                <HistoryCard key={h.id} row={h} eventId={eventId} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
    );
  }
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
          {HISTORY_STATUS_LABEL[row.status]}
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

function HistoryListPanel({
  history,
  eventId,
}: {
  history: HistoryRow[];
  eventId: string;
}) {
  const [filter, setFilter] = useState<"all" | HistoryStatus>("all");

  const counts = useMemo(() => {
    const c: Record<HistoryStatus, number> = {
      draft: 0,
      queued: 0,
      sending: 0,
      completed: 0,
      failed: 0,
      scheduled: 0,
      cancelled: 0,
    };
    for (const h of history) c[h.status] += 1;
    return c;
  }, [history]);

  const visible = useMemo(() => {
    if (filter === "all") return history;
    return history.filter((h) => h.status === filter);
  }, [history, filter]);

  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
      <h2 className="font-display text-xl text-ink">Riwayat Broadcast</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Semua broadcast yang pernah dibuat di acara ini, terbaru di atas.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Semua (${history.length})`}
        />
        {(
          [
            "scheduled",
            "queued",
            "sending",
            "completed",
            "failed",
            "cancelled",
          ] as const
        ).map((s) =>
          counts[s] > 0 ? (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={`${HISTORY_STATUS_LABEL[s]} (${counts[s]})`}
            />
          ) : null,
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {filter === "all"
            ? "Belum ada broadcast."
            : "Tidak ada broadcast pada filter ini."}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((h) => (
            <HistoryListCard key={h.id} row={h} eventId={eventId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-navy text-white"
          : "border border-[color:var(--border-ghost)] bg-white text-ink-muted hover:text-navy"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Wider variant of HistoryCard for the dedicated Riwayat tab — includes
 * the audience label, channel icon, scheduled-at hint, and the same
 * inline actions (kirim sekarang / detail).
 */
function HistoryListCard({
  row,
  eventId,
}: {
  row: HistoryRow;
  eventId: string;
}) {
  const [pending, startTransition] = useTransition();
  const pct =
    row.totalRecipients > 0
      ? Math.round((row.sentCount / row.totalRecipients) * 100)
      : 0;

  return (
    <li className="rounded-xl border border-[color:var(--border-ghost)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-ink-hint">
            <span aria-hidden>
              {row.channel === "whatsapp" ? "📱" : "✉️"}
            </span>{" "}
            {row.channel === "whatsapp" ? "WhatsApp" : "Email"} •{" "}
            {new Date(row.createdAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-ink">
            {row.subject ?? row.templateSlug}
          </p>
          <p className="text-xs text-ink-muted">{row.audienceLabel}</p>
          {row.scheduledAt && (
            <p className="mt-1 text-xs text-[#3949AB]">
              📅 Terjadwal:{" "}
              {new Date(row.scheduledAt).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${HISTORY_STATUS_STYLE[row.status]}`}
        >
          {HISTORY_STATUS_LABEL[row.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          {row.sentCount}/{row.totalRecipients} terkirim
          {row.failedCount > 0 && ` • ${row.failedCount} gagal`}
        </span>
        <span className="text-ink-muted">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
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
        {row.status === "scheduled" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await cancelScheduledBroadcast(eventId, row.id);
              })
            }
            className="font-medium text-rose-dark hover:underline disabled:opacity-60"
          >
            {pending ? "Membatalkan..." : "Batalkan"}
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

function UpgradeWhatsAppCard() {
  return (
    <div className="mt-4 rounded-xl border border-coral/30 bg-gradient-to-br from-coral/5 to-coral/10 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          ✨
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">
            Upgrade ke WhatsApp Business API
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Saat ini Anda mengirim WhatsApp secara manual (buka tab per
            tamu). Dengan paket Lite ke atas, undangan WA terkirim
            otomatis dari server.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
            <li className="flex items-start gap-2">
              <span className="text-coral" aria-hidden>
                ✓
              </span>
              <span>Kirim ratusan WA otomatis tanpa buka tab satu-satu</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral" aria-hidden>
                ✓
              </span>
              <span>Jadwalkan pengiriman WhatsApp sesuai waktu Anda</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-coral" aria-hidden>
                ✓
              </span>
              <span>Status delivery & read receipt per tamu</span>
            </li>
          </ul>
          <Link
            href="/harga"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-coral px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Lihat Paket →
          </Link>
        </div>
      </div>
    </div>
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

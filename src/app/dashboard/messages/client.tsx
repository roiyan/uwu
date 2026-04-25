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
import { TemplateChipEditor } from "./template-chip-editor";
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

const STATUS_LABEL: Record<GuestStatus, string> = {
  baru: "Baru",
  diundang: "Diundang",
  dibuka: "Dibuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
};

const HISTORY_STATUS_STYLE: Record<HistoryStatus, string> = {
  draft: "bg-[var(--d-bg-2)] text-[var(--d-ink-dim)]",
  queued: "bg-[rgba(143,163,217,0.08)] text-[var(--d-ink)]",
  sending: "bg-[rgba(212,184,150,0.10)] text-[var(--d-gold)]",
  completed: "bg-[#E8F3EE] text-[#3B7A57]",
  failed: "border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]",
  scheduled: "bg-[#EEF2FF] text-[#3949AB]",
  cancelled: "bg-[var(--d-bg-2)] text-[var(--d-ink-faint)] line-through",
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
  isPublished,
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
  isPublished: boolean;
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
      {!isPublished && <UnpublishedBanner />}
      <div className="mb-7 inline-flex rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`d-mono rounded-full px-5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === "compose"
              ? "bg-[var(--d-coral)] text-[#0B0B15]"
              : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
          }`}
        >
          Kirim Baru
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`d-mono rounded-full px-5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            activeTab === "history"
              ? "bg-[var(--d-coral)] text-[#0B0B15]"
              : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
          }`}
        >
          Riwayat <span className="ml-1 opacity-60">({history.length})</span>
        </button>
      </div>

      {/* Render both panels and toggle visibility instead of swapping
          via a ternary. The previous version defined ComposeView as a
          function declaration NESTED inside MessagesClient — that
          gave it a fresh function identity on every parent re-render,
          so React unmounted and remounted the entire compose subtree
          (including the contentEditable div in TemplateChipEditor) on
          every keystroke, wiping the caret. Keeping both subtrees
          mounted preserves the editor's DOM across edits and across
          tab switches. */}
      {/* Use style.display rather than the HTML `hidden` attribute.
          `hidden` on a form's ancestor has been known to interfere
          with React Server Action submissions; `display:none` is
          layout-only and lets the form's submit click propagate. */}
      <div style={{ display: activeTab === "history" ? undefined : "none" }}>
        <HistoryListPanel history={history} eventId={eventId} />
      </div>
      <div style={{ display: activeTab === "compose" ? undefined : "none" }}>
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <form
          action={formAction}
          className="relative overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-7 bg-[var(--d-coral)]"
            />
            <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
              N° 01 — Buat Broadcast
            </p>
          </div>
          <h2 className="d-serif text-[24px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
            Susun pesan, pilih audiens, lalu{" "}
            <em className="d-serif italic text-[var(--d-coral)]">kirim</em>.
          </h2>

          <div className="mt-6">
            <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Kanal
            </span>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
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

          <label className="mt-5 block">
            <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Template
            </span>
            <div className="relative mt-2.5">
              <select
                value={templateSlug}
                onChange={(e) => selectTemplate(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] py-3 pl-4 pr-10 text-[13px] text-[var(--d-ink)] outline-none transition-colors hover:border-[var(--d-line-strong)] focus:border-[var(--d-coral)]"
              >
                {channelTemplates.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-[70%] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[var(--d-ink-dim)]"
              />
            </div>
            <span className="d-serif mt-2 block text-[12.5px] italic text-[var(--d-ink-faint)]">
              {currentTemplate.description}
            </span>
          </label>
          <input type="hidden" name="templateSlug" value={templateSlug} />

          {(channel === "email" || channel === "both") && (
            <label className="mt-5 block">
              <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                {channel === "both" ? "Subject Email" : "Subject"}
              </span>
              <input
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2.5 w-full rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] px-4 py-3 text-[13px] text-[var(--d-ink)] outline-none transition-colors focus:border-[var(--d-coral)]"
                placeholder="Undangan Pernikahan — {bride} & {groom}"
              />
            </label>
          )}

          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                {channel === "both"
                  ? "Isi Pesan WhatsApp"
                  : channel === "email"
                    ? "Isi Pesan Email"
                    : "Isi Pesan"}
              </span>
              {providers.aiAvailable && (
                <button
                  type="button"
                  onClick={() => setAiTarget("primary")}
                  className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[rgba(184,157,212,0.3)] bg-[rgba(184,157,212,0.06)] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-[var(--d-lilac)] transition-colors hover:border-[var(--d-lilac)] hover:bg-[rgba(184,157,212,0.12)]"
                >
                  <span aria-hidden>✦</span> Bantu Tulis
                </button>
              )}
            </div>
            <TemplateChipEditor
              name="body"
              value={body}
              onChange={setBody}
              minHeight={260}
              ariaLabel="Isi pesan broadcast"
            />
            <span className="mt-1 block text-xs text-[var(--d-ink-faint)]">
              Tap variabel di toolbar untuk menyisipkan. Setiap variabel
              jadi blok atomik — Backspace satu kali menghapus seluruh
              variabel, tidak bisa dipotong sebagian.
            </span>
          </div>

          {channel === "both" && (
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                  Isi Pesan Email
                </span>
                {providers.aiAvailable && (
                  <button
                    type="button"
                    onClick={() => setAiTarget("email")}
                    className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[rgba(184,157,212,0.3)] bg-[rgba(184,157,212,0.06)] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-[var(--d-lilac)] transition-colors hover:border-[var(--d-lilac)] hover:bg-[rgba(184,157,212,0.12)]"
                  >
                    <span aria-hidden>✦</span> Bantu Tulis
                  </button>
                )}
              </div>
              <TemplateChipEditor
                value={emailBody}
                onChange={setEmailBody}
                minHeight={220}
                ariaLabel="Isi pesan email broadcast"
              />
              <span className="mt-1 block text-xs text-[var(--d-ink-faint)]">
                Email pakai gaya lebih formal. Variabel yang sama
                berlaku — tap chip di toolbar untuk menyisipkan.
              </span>
            </div>
          )}

          {(channel === "email" || channel === "both") && (
            <div className="mt-5 rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.02)] p-4">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
                />
                <span>
                  <span className="d-serif block text-[14px] text-[var(--d-ink)]">
                    Jadwalkan pengiriman email
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[var(--d-ink-dim)]">
                    Email akan otomatis terkirim pada waktu yang Anda pilih.
                    Jika tidak dicentang, email dikirim segera setelah Anda
                    tekan tombol kirim.
                  </span>
                </span>
              </label>
              {scheduleEnabled && (
                <div className="mt-3 pl-7">
                  <label className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                    Waktu kirim
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledLocal}
                    onChange={(e) => setScheduledLocal(e.target.value)}
                    min={nowPlusMinutes(5)}
                    className="mt-2 w-full rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5 text-[13px] text-[var(--d-ink)] outline-none transition-colors focus:border-[var(--d-coral)]"
                  />
                  <p className="mt-2 text-[11px] text-[var(--d-ink-faint)]">
                    Cron menjalankan pengiriman setiap hari pukul 09:00 UTC
                    (16:00 WIB). Email akan terkirim pada cron berikutnya
                    setelah waktu yang Anda pilih lewat.
                  </p>
                </div>
              )}
            </div>
          )}
          <input type="hidden" name="scheduledAt" value={scheduledAtIso} />

          <div className="mt-6">
            <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              Audiens
            </span>
            <div className="mt-2.5 space-y-2">
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
                  <div className="mt-3 flex flex-wrap gap-2 pl-7">
                    {groups.length === 0 && (
                      <span className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
                        Belum ada grup — buat di halaman Tamu.
                      </span>
                    )}
                    {groups.map((g) => {
                      const checked = audience.groupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                            checked
                              ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-ink)]"
                              : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink-dim)] hover:border-[var(--d-line-strong)] hover:text-[var(--d-ink)]"
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
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: g.color ?? "var(--d-gold)" }}
                          />
                          {g.name}
                          <span
                            className={`d-mono rounded-[3px] px-1.5 py-px text-[10px] tracking-[0.06em] ${
                              checked
                                ? "bg-[rgba(240,160,156,0.18)] text-[var(--d-coral)]"
                                : "bg-[rgba(255,255,255,0.05)] text-[var(--d-ink-faint)]"
                            }`}
                          >
                            {String(g.liveCount).padStart(2, "0")}
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
                  <div className="mt-3 flex flex-wrap gap-2 pl-7">
                    {(Object.keys(STATUS_LABEL) as GuestStatus[]).map((s) => {
                      const checked = audience.statuses.includes(s);
                      return (
                        <label
                          key={s}
                          className={`d-mono flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                            checked
                              ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-coral)]"
                              : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink-dim)] hover:border-[var(--d-line-strong)] hover:text-[var(--d-ink)]"
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
          <div className="mt-6 rounded-2xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.015)] p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
                Pratinjau Pesan
              </p>
              <p className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                {filteredRecipients.length === 0
                  ? "Tidak ada tamu terpilih"
                  : `${String(previewIndex + 1).padStart(2, "0")} / ${String(filteredRecipients.length).padStart(2, "0")}`}
              </p>
            </div>
            {previewGuest ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--d-ink-dim)]">
                  <span className="d-serif italic">
                    Untuk{" "}
                    <strong className="not-italic text-[var(--d-ink)]">
                      {previewGuest.name}
                    </strong>
                    {previewGuest.nickname && (
                      <span className="ml-1 text-[var(--d-ink-faint)]">
                        ({previewGuest.nickname})
                      </span>
                    )}
                  </span>
                  {channel === "whatsapp" && previewGuest.phone && (
                    <span className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[rgba(126,211,164,0.25)] bg-[rgba(126,211,164,0.06)] px-2.5 py-0.5 text-[10.5px] tracking-[0.04em] text-[var(--d-green)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--d-green)]" />
                      {previewGuest.phone}
                    </span>
                  )}
                  {channel === "email" && previewGuest.email && (
                    <span className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[rgba(143,163,217,0.25)] bg-[rgba(143,163,217,0.06)] px-2.5 py-0.5 text-[10.5px] tracking-[0.04em] text-[var(--d-blue)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--d-blue)]" />
                      {previewGuest.email}
                    </span>
                  )}
                  {previewGuest.sendCount > 0 && (
                    <span className="d-mono rounded-full bg-[rgba(240,160,156,0.12)] px-2.5 py-0.5 text-[10.5px] tracking-[0.04em] text-[var(--d-coral)]">
                      Kirim ulang · {previewGuest.sendCount}×
                    </span>
                  )}
                </div>
                <pre className="d-mono max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--d-line)] bg-[var(--d-bg-2)] p-4 text-[12px] leading-[1.7] text-[var(--d-ink)]">
                  {previewBody}
                </pre>
              </>
            ) : (
              <p className="d-serif text-[13px] italic text-[var(--d-ink-faint)]">
                Pilih audiens dan kanal untuk melihat pratinjau pesan.
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setPreviewIndex((i) => Math.max(0, i - 1))
                }
                disabled={!previewGuest || previewIndex === 0}
                className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-transparent px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span aria-hidden>←</span> Sebelumnya
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
                className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-transparent px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Berikutnya <span aria-hidden>→</span>
              </button>
            </div>
          </div>

          {alreadySentCount > 0 && (
            <div className="mt-5 rounded-xl border border-[rgba(212,184,150,0.22)] bg-[rgba(212,184,150,0.06)] px-4 py-3.5">
              <div className="d-serif flex items-center gap-2 text-[13.5px] text-[var(--d-ink)]">
                <span aria-hidden className="text-[var(--d-gold)]">
                  ⓘ
                </span>
                <span>
                  <em className="d-serif italic text-[var(--d-gold)]">
                    {alreadySentCount}
                  </em>{" "}
                  tamu sudah pernah diundang.
                </span>
              </div>
              <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--d-ink-dim)]">
                <input
                  type="checkbox"
                  checked={includeSent}
                  onChange={(e) => setIncludeSent(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
                />
                <span>
                  Sertakan yang sudah diundang ({alreadySentCount} tamu)
                </span>
              </label>
              <p className="mt-1.5 text-[11.5px] text-[var(--d-ink-faint)]">
                Secara default, broadcast hanya dikirim ke tamu yang belum
                pernah diundang.
              </p>
            </div>
          )}

          {state && !state.ok && (
            <p className="mt-4 rounded-md border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] px-3 py-2 text-sm text-[var(--d-coral)]">
              {state.error}
            </p>
          )}
          {state?.ok && state.data?.messageId && (
            <div className="mt-4 rounded-md bg-[rgba(212,184,150,0.10)] px-3 py-2 text-sm text-[var(--d-gold)]">
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
            <p className="mt-2 text-sm text-[var(--d-coral)]">{cancelError}</p>
          )}
          {pairedError && (
            <p className="mt-2 text-sm text-[var(--d-coral)]">
              Broadcast email gagal dibuat: {pairedError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={pending || !isPublished}
              title={
                !isPublished
                  ? "Publikasikan undangan dulu di Pengaturan."
                  : undefined
              }
              className="rounded-full border border-[var(--d-line-strong)] px-6 py-2 text-sm font-medium text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] disabled:opacity-60"
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
                  className="rounded-full border border-[var(--d-line-strong)] px-6 py-2 text-sm font-medium text-[var(--d-coral)] transition-colors hover:border border-[rgba(240,160,156,0.3)] bg-[rgba(240,160,156,0.08)] disabled:opacity-60"
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
                className="rounded-full bg-[var(--d-bg-2)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--d-bg-1)] disabled:opacity-60"
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
                    className="rounded-full bg-[var(--d-bg-2)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--d-bg-1)] disabled:opacity-60"
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
                      className="rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
                    >
                      {runPending ? "Mengirim..." : "📱 Kirim WhatsApp"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWaFallbackOpen(true)}
                      className="rounded-full bg-coral px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                    >
                      📱 Kirim WhatsApp (manual)
                    </button>
                  ))}
              </>
            )}
          </div>
          {runError && (
            <p className="mt-3 text-sm text-[var(--d-coral)]">{runError}</p>
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
        <div className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-[var(--d-ink)]">Terbaru</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="text-xs font-medium text-[var(--d-ink)] hover:underline"
              >
                Lihat semua →
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--d-ink-dim)]">
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
      </div>
    </>
  );
}

function HistoryCard({ row, eventId }: { row: HistoryRow; eventId: string }) {
  const [pending, startTransition] = useTransition();

  const pct =
    row.totalRecipients > 0
      ? Math.round((row.sentCount / row.totalRecipients) * 100)
      : 0;

  return (
    <li className="rounded-xl bg-[var(--d-bg-2)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--d-ink-faint)]">
            {row.channel === "whatsapp" ? "WhatsApp" : "Email"} •{" "}
            {new Date(row.createdAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-sm font-medium text-[var(--d-ink)]">{row.templateSlug}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${HISTORY_STATUS_STYLE[row.status]}`}
        >
          {HISTORY_STATUS_LABEL[row.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-[var(--d-ink-dim)]">
          {row.sentCount}/{row.totalRecipients} terkirim
          {row.failedCount > 0 && ` • ${row.failedCount} gagal`}
        </span>
        <span className="text-[var(--d-ink-dim)]">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--d-bg-card)]">
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
            className="font-medium text-[var(--d-ink)] hover:underline disabled:opacity-60"
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
            className="font-medium text-[var(--d-ink)] hover:underline disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Kirim ulang gagal"}
          </button>
        )}
        <Link
          href={`/dashboard/messages/${row.id}`}
          className="font-medium text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
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
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-7 bg-[var(--d-coral)]" />
        <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
          Riwayat Broadcast
        </p>
      </div>
      <h2 className="d-serif mt-3 text-[24px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
        Setiap kabar yang pernah{" "}
        <em className="d-serif italic text-[var(--d-coral)]">terkirim</em>.
      </h2>
      <p className="d-serif mt-2 text-[13px] italic text-[var(--d-ink-dim)]">
        Semua broadcast yang pernah dibuat di acara ini, terbaru di atas.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Semua"
          count={history.length}
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
              label={HISTORY_STATUS_LABEL[s]}
              count={counts[s]}
            />
          ) : null,
        )}
      </div>

      {visible.length === 0 ? (
        <p className="d-serif mt-7 text-[13.5px] italic text-[var(--d-ink-dim)]">
          {filter === "all"
            ? "Belum ada broadcast."
            : "Tidak ada broadcast pada filter ini."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
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
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`d-mono inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-ink)]"
          : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink-dim)] hover:border-[var(--d-line-strong)] hover:text-[var(--d-ink)]"
      }`}
    >
      {label}
      <span
        className={`rounded-[3px] px-1.5 py-px text-[9.5px] tracking-[0.06em] ${
          active
            ? "bg-[rgba(240,160,156,0.18)] text-[var(--d-coral)]"
            : "bg-[rgba(255,255,255,0.05)] text-[var(--d-ink-faint)]"
        }`}
      >
        {String(count).padStart(2, "0")}
      </span>
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

  const isWa = row.channel === "whatsapp";
  return (
    <li className="rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-4 transition-colors hover:border-[var(--d-line-strong)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
            style={{
              borderColor: isWa
                ? "rgba(126,211,164,0.25)"
                : "rgba(143,163,217,0.25)",
              background: isWa
                ? "rgba(126,211,164,0.06)"
                : "rgba(143,163,217,0.06)",
              color: isWa ? "var(--d-green)" : "var(--d-blue)",
            }}
          >
            {isWa ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                <path d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7a2 2 0 012-2h14a2 2 0 012 2" />
              </svg>
            )}
          </span>
          <div className="min-w-0">
            <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
              {isWa ? "WhatsApp" : "Email"} ·{" "}
              {new Date(row.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="d-serif mt-1 truncate text-[14.5px] text-[var(--d-ink)]">
              {row.subject ?? row.templateSlug}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--d-ink-dim)]">
              {row.audienceLabel}
            </p>
            {row.scheduledAt && (
              <p className="d-mono mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(143,163,217,0.25)] bg-[rgba(143,163,217,0.06)] px-2.5 py-0.5 text-[10.5px] tracking-[0.04em] text-[var(--d-blue)]">
                <span className="h-1 w-1 rounded-full bg-[var(--d-blue)]" />
                Terjadwal{" "}
                {new Date(row.scheduledAt).toLocaleString("id-ID", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>
        <span
          className={`d-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${HISTORY_STATUS_STYLE[row.status]}`}
        >
          {HISTORY_STATUS_LABEL[row.status]}
        </span>
      </div>
      <div className="mt-3.5 flex items-center justify-between text-[11.5px]">
        <span className="d-mono tracking-[0.04em] text-[var(--d-ink-dim)]">
          {row.sentCount}/{row.totalRecipients} terkirim
          {row.failedCount > 0 && ` · ${row.failedCount} gagal`}
        </span>
        <span className="d-mono tracking-[0.04em] text-[var(--d-ink-dim)]">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, var(--d-blue), var(--d-lilac) 50%, var(--d-coral))",
          }}
        />
      </div>
      <div className="mt-3.5 flex items-center justify-end gap-4 text-[11.5px]">
        {row.status === "queued" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await runBroadcastAction(eventId, row.id);
              })
            }
            className="font-medium text-[var(--d-ink)] hover:underline disabled:opacity-60"
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
            className="font-medium text-[var(--d-ink)] hover:underline disabled:opacity-60"
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
            className="font-medium text-[var(--d-coral)] hover:underline disabled:opacity-60"
          >
            {pending ? "Membatalkan..." : "Batalkan"}
          </button>
        )}
        <Link
          href={`/dashboard/messages/${row.id}`}
          className="font-medium text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
        >
          Detail →
        </Link>
      </div>
    </li>
  );
}

function UnpublishedBanner() {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl border border-[rgba(240,160,156,0.3)] p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(240,160,156,0.08), rgba(240,160,156,0.04))",
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="d-serif flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] italic text-[#0B0B15]"
          style={{
            background:
              "linear-gradient(135deg, var(--d-coral), var(--d-peach))",
          }}
        >
          !
        </span>
        <div className="flex-1">
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
            Belum dipublikasikan
          </p>
          <p className="d-serif mt-1.5 text-[16px] font-light leading-tight text-[var(--d-ink)]">
            Undangan masih tersembunyi.
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
            Tamu yang menerima link undangan saat ini akan melihat halaman
            404. Publikasikan dulu di Pengaturan agar undangan bisa dibuka.
          </p>
          <Link
            href="/dashboard/settings?tab=acara"
            className="d-mono mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--d-coral)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(240,160,156,0.32)]"
          >
            Buka Pengaturan <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function UpgradeWhatsAppCard() {
  return (
    <div
      className="relative mt-4 overflow-hidden rounded-xl border border-[rgba(212,184,150,0.22)] p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(212,184,150,0.08), rgba(244,184,163,0.05) 50%, rgba(212,184,150,0.08))",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-[40px]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,184,150,0.18), transparent 70%)",
        }}
      />
      <div className="relative flex items-start gap-3.5">
        <span
          aria-hidden
          className="d-serif flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] italic text-[#0B0B15]"
          style={{
            background:
              "linear-gradient(135deg, var(--d-gold), var(--d-peach))",
          }}
        >
          ✦
        </span>
        <div className="flex-1">
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-gold)]">
            Upgrade · WhatsApp Business
          </p>
          <p className="d-serif mt-1.5 text-[16px] font-light leading-tight text-[var(--d-ink)]">
            Otomatiskan pengiriman WhatsApp.
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
            Saat ini Anda mengirim secara manual (buka tab per tamu). Dengan
            paket Lite ke atas, undangan WA terkirim otomatis dari server.
          </p>
          <ul className="mt-3.5 space-y-2 text-[12px] text-[var(--d-ink-dim)]">
            <li className="flex items-start gap-2.5">
              <span className="d-mono mt-0.5 text-[var(--d-gold)]" aria-hidden>
                ✓
              </span>
              <span>Kirim ratusan WA otomatis tanpa buka tab satu-satu</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="d-mono mt-0.5 text-[var(--d-gold)]" aria-hidden>
                ✓
              </span>
              <span>Jadwalkan pengiriman WhatsApp sesuai waktu Anda</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="d-mono mt-0.5 text-[var(--d-gold)]" aria-hidden>
                ✓
              </span>
              <span>Status delivery &amp; read receipt per tamu</span>
            </li>
          </ul>
          <Link
            href="/harga"
            className="d-mono mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(212,184,150,0.32)]"
            style={{
              background:
                "linear-gradient(115deg, var(--d-gold), var(--d-peach))",
            }}
          >
            Lihat Paket <span aria-hidden>→</span>
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
      aria-pressed={active}
      className={`relative overflow-hidden rounded-xl border px-4 py-4 text-left transition-all ${
        active
          ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.06)] text-[var(--d-ink)]"
          : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink)] hover:border-[var(--d-line-strong)] hover:bg-[rgba(255,255,255,0.04)]"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--d-coral)] shadow-[0_0_8px_var(--d-coral)]"
        />
      )}
      <p className="d-serif text-[14px]">{label}</p>
      <p
        className={`d-mono mt-1 text-[10.5px] uppercase tracking-[0.18em] ${
          active ? "text-[var(--d-coral)]" : "text-[var(--d-ink-faint)]"
        }`}
      >
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
      className={`rounded-xl border p-4 transition-colors ${
        active
          ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.04)]"
          : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] hover:border-[var(--d-line-strong)]"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
            active
              ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)]"
              : "border-[var(--d-line-strong)]"
          }`}
        >
          {active && (
            <span className="h-2 w-2 rounded-full bg-[var(--d-coral)]" />
          )}
        </span>
        <span>
          <span className="d-serif block text-[14px] text-[var(--d-ink)]">
            {label}
          </span>
          <span className="mt-0.5 block text-[12px] text-[var(--d-ink-dim)]">
            {hint}
          </span>
        </span>
      </button>
      {children}
    </div>
  );
}

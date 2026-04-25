"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveWebsiteDraftAction } from "@/lib/actions/event";
import { useToast } from "@/components/shared/Toast";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { Preview } from "@/components/invitation/Preview";
import { PhoneFrame, type Viewport } from "@/components/invitation/PhoneFrame";
import type {
  CoupleData,
  InvitationEvent,
  Palette,
  ScheduleData,
  SectionFlags,
} from "@/components/invitation/types";
import { ALL_SECTIONS_ON } from "@/components/invitation/types";

// Underline-only inputs to match the design ref. Same look as the
// onboarding form fields + broadcast composer.
const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[16px] text-[var(--d-ink)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

const labelClass =
  "d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]";

export type EditorDefaults = {
  event: InvitationEvent;
  palette: Palette;
  couple: CoupleData;
  schedules: ScheduleData[];
};

type ScheduleDraft = {
  label: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string;
};

function fromSchedule(s: ScheduleData): ScheduleDraft {
  return {
    label: s.label,
    eventDate: s.eventDate,
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    timezone: s.timezone,
    venueName: s.venueName ?? "",
    venueAddress: s.venueAddress ?? "",
    venueMapUrl: s.venueMapUrl ?? "",
  };
}

function toSchedule(d: ScheduleDraft): ScheduleData {
  return {
    label: d.label,
    eventDate: d.eventDate,
    startTime: d.startTime || null,
    endTime: d.endTime || null,
    timezone: d.timezone,
    venueName: d.venueName || null,
    venueAddress: d.venueAddress || null,
    venueMapUrl: d.venueMapUrl || null,
  };
}

function blankSchedule(): ScheduleDraft {
  return {
    label: "Acara",
    eventDate: "",
    startTime: "",
    endTime: "",
    timezone: "Asia/Jakarta",
    venueName: "",
    venueAddress: "",
    venueMapUrl: "",
  };
}

// Section list driven by the design ref. Sections beyond what
// SectionFlags supports (galeri, amplop) are marked `comingSoon` so
// the row renders disabled with a "Segera" pill, matching the
// pattern used by the dashboard sidebar.
type SectionDef = {
  id: SectionId;
  number: string;
  title: string;
  description: string;
  // Maps to a SectionFlags key, or undefined for sections that are
  // always-on (foto-sampul) / not yet wired (galeri, amplop).
  flag?: keyof SectionFlags;
  comingSoon?: boolean;
  /** Override the section heading on the right pane when active. */
  heroAccent?: string;
};

type SectionId =
  | "mempelai"
  | "foto-sampul"
  | "kutipan"
  | "cerita"
  | "acara"
  | "galeri"
  | "rsvp"
  | "amplop";

const SECTIONS: SectionDef[] = [
  {
    id: "mempelai",
    number: "01",
    title: "Mempelai",
    description: "Nama, orang tua, foto",
    flag: "couple",
    heroAccent: "berdua",
  },
  {
    id: "foto-sampul",
    number: "02",
    title: "Foto Sampul",
    description: "Hero image",
  },
  {
    id: "kutipan",
    number: "03",
    title: "Kutipan",
    description: "Ayat / quote favorit",
    flag: "quote",
  },
  {
    id: "cerita",
    number: "04",
    title: "Cerita Kami",
    description: "Timeline kisah cinta",
    flag: "story",
    heroAccent: "kalian",
  },
  {
    id: "acara",
    number: "05",
    title: "Acara",
    description: "Akad, resepsi, after-party",
    flag: "schedules",
  },
  {
    id: "galeri",
    number: "06",
    title: "Galeri",
    description: "Foto pre-wedding",
    comingSoon: true,
  },
  {
    id: "rsvp",
    number: "07",
    title: "RSVP & Wishes",
    description: "Form konfirmasi tamu",
    flag: "rsvp",
  },
  {
    id: "amplop",
    number: "08",
    title: "Amplop Digital",
    description: "Gift / transfer",
    comingSoon: true,
  },
];

export function EditorSplit({ defaults }: { defaults: EditorDefaults }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // Local draft — mutated on every keystroke, flushes to DB only on
  // Simpan. Same data shape and submit pipeline as before.
  const [couple, setCouple] = useState<CoupleData>(defaults.couple);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(
    defaults.schedules.map(fromSchedule),
  );
  const [sections, setSections] = useState<SectionFlags>(ALL_SECTIONS_ON);
  const [viewport, setViewport] = useState<Viewport>("mobile");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeSection, setActiveSectionState] =
    useState<SectionId>("mempelai");

  // Wrap setActiveSection so the URL hash mirrors the active section
  // — keeps deep-linking stable across refreshes and lets the user
  // copy the URL to share a specific bagian.
  function setActiveSection(id: SectionId) {
    setActiveSectionState(id);
    if (typeof window !== "undefined") {
      const next = `#${id}`;
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", next);
      }
    }
  }

  // On mount, sniff the URL hash for a deep-link target. Dashboard
  // task checklist sends users here with hashes like `#kutipan` /
  // `#foto-sampul` / `#acara`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const match = SECTIONS.find((s) => s.id === raw);
    if (match) setActiveSectionState(match.id);
  }, []);

  const eventForPreview: InvitationEvent = useMemo(
    () => ({
      ...defaults.event,
      title:
        `${couple.brideName.split(" ")[0] || defaults.event.title}`.trim() +
        " & " +
        `${couple.groomName.split(" ")[0] || ""}`.trim(),
    }),
    [couple.brideName, couple.groomName, defaults.event],
  );

  const schedulesForPreview: ScheduleData[] = useMemo(
    () => schedules.map(toSchedule),
    [schedules],
  );

  function updateCouple<K extends keyof CoupleData>(
    key: K,
    value: CoupleData[K],
  ) {
    setCouple((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }
  function updateSchedule(idx: number, patch: Partial<ScheduleDraft>) {
    setSchedules((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  }
  function addSchedule() {
    setSchedules((r) => [...r, blankSchedule()]);
    setDirty(true);
  }
  function removeSchedule(idx: number) {
    setSchedules((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
    setDirty(true);
  }
  function toggleSection(key: keyof SectionFlags) {
    setSections((s) => ({ ...s, [key]: !s[key] }));
    setDirty(true);
  }

  function handleSave() {
    const form = new FormData();
    form.set("brideName", couple.brideName);
    form.set("brideNickname", couple.brideNickname ?? "");
    form.set("brideFatherName", couple.brideFatherName ?? "");
    form.set("brideMotherName", couple.brideMotherName ?? "");
    form.set("bridePhotoUrl", couple.bridePhotoUrl ?? "");
    form.set("groomName", couple.groomName);
    form.set("groomNickname", couple.groomNickname ?? "");
    form.set("groomFatherName", couple.groomFatherName ?? "");
    form.set("groomMotherName", couple.groomMotherName ?? "");
    form.set("groomPhotoUrl", couple.groomPhotoUrl ?? "");
    form.set("coverPhotoUrl", couple.coverPhotoUrl ?? "");
    form.set("story", couple.story ?? "");
    form.set("quote", couple.quote ?? "");
    form.set("schedules", JSON.stringify(schedules));

    toast.success("Tersimpan");
    startTransition(async () => {
      const res = await saveWebsiteDraftAction(defaults.event.id!, null, form);
      if (!res.ok) toast.error(res.error);
      else {
        setDirty(false);
        setSavedAt(new Date());
      }
    });
  }

  // Warn the user if they try to close the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const previewNode = (
    <Preview
      event={eventForPreview}
      palette={defaults.palette}
      couple={couple}
      schedules={schedulesForPreview}
      sections={sections}
      staticMode
    />
  );

  const activeDef = SECTIONS.find((s) => s.id === activeSection)!;
  const activeFlagOn = activeDef.flag ? sections[activeDef.flag] : true;
  const activeIdx = SECTIONS.findIndex((s) => s.id === activeSection);

  const enabledCount = SECTIONS.reduce((acc, s) => {
    if (s.comingSoon) return acc;
    if (!s.flag) return acc + 1; // always-on sections
    return acc + (sections[s.flag] ? 1 : 0);
  }, 0);

  return (
    <div className="flex-1">
      {/* Sticky top action bar */}
      <TopBar
        dirty={dirty}
        pending={pending}
        savedAt={savedAt}
        onSave={handleSave}
        onMobilePreview={() => setMobilePreviewOpen(true)}
      />

      {/* 3-panel grid: section list | form editor | phone preview.
          Below 1080px the section list collapses into a horizontal
          strip; below 768px the preview moves to a modal. */}
      <div className="mx-auto grid max-w-[1480px] gap-6 px-5 py-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
        {/* Left panel — section list (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-[110px] rounded-[16px] border border-[var(--d-line)] bg-[var(--d-bg-card)]">
            <header className="flex items-center justify-between border-b border-[var(--d-line)] px-5 py-4">
              <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-ink-dim)]">
                Bagian
              </p>
              <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
                {enabledCount} aktif
              </p>
            </header>
            <ul>
              {SECTIONS.map((s) => (
                <SectionListItem
                  key={s.id}
                  def={s}
                  active={activeSection === s.id}
                  enabled={s.flag ? sections[s.flag] : true}
                  onSelect={() => setActiveSection(s.id)}
                  onToggle={
                    s.flag ? () => toggleSection(s.flag!) : undefined
                  }
                />
              ))}
            </ul>
          </div>
        </aside>

        {/* Mobile section pills (lg-) */}
        <nav className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:hidden">
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`d-mono inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                  isActive
                    ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
                    : "border-[var(--d-line)] text-[var(--d-ink-dim)]"
                }`}
              >
                <span>{s.number}</span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Center panel — form editor */}
        <section className="min-w-0">
          <SectionHero
            number={activeDef.number}
            title={activeDef.title}
            accent={activeDef.heroAccent}
            description={sectionLead(activeDef.id)}
            flag={activeDef.flag}
            enabled={activeFlagOn}
            onToggle={
              activeDef.flag
                ? () => toggleSection(activeDef.flag!)
                : undefined
            }
          />

          <div className="mt-7 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 md:p-9">
            {/* Render the active section's form. Forms wrapped in a
                fade if the section is toggled off so it's clear the
                content won't appear in the live preview. */}
            <div
              className={
                activeFlagOn
                  ? ""
                  : "pointer-events-none select-none opacity-50"
              }
            >
              {activeSection === "mempelai" && (
                <MempelaiForm
                  eventId={defaults.event.id!}
                  couple={couple}
                  onChange={updateCouple}
                />
              )}
              {activeSection === "foto-sampul" && (
                <FotoSampulForm
                  eventId={defaults.event.id!}
                  url={couple.coverPhotoUrl ?? ""}
                  onChange={(v) => updateCouple("coverPhotoUrl", v || null)}
                />
              )}
              {activeSection === "kutipan" && (
                <KutipanForm
                  value={couple.quote ?? ""}
                  onChange={(v) => updateCouple("quote", v)}
                />
              )}
              {activeSection === "cerita" && (
                <CeritaForm
                  value={couple.story ?? ""}
                  onChange={(v) => updateCouple("story", v)}
                />
              )}
              {activeSection === "acara" && (
                <AcaraForm
                  rows={schedules}
                  update={updateSchedule}
                  add={addSchedule}
                  remove={removeSchedule}
                />
              )}
              {activeSection === "rsvp" && <RsvpForm />}
              {activeSection === "galeri" && <GaleriForm />}
              {activeSection === "amplop" && <AmplopForm />}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const prev = SECTIONS[Math.max(0, activeIdx - 1)];
                setActiveSection(prev.id);
              }}
              disabled={activeIdx === 0}
              className="d-mono uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)] disabled:opacity-40"
            >
              ← Bagian sebelumnya
            </button>
            <button
              type="button"
              onClick={() => {
                const next =
                  SECTIONS[Math.min(SECTIONS.length - 1, activeIdx + 1)];
                setActiveSection(next.id);
              }}
              disabled={activeIdx >= SECTIONS.length - 1}
              className="d-mono uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)] disabled:opacity-40"
            >
              Bagian selanjutnya →
            </button>
          </div>
        </section>

        {/* Right panel — phone preview (xl+) */}
        <aside className="hidden xl:block">
          <div className="sticky top-[110px] rounded-[16px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-5">
            <PreviewHeader
              slug={defaults.event.slug}
              viewport={viewport}
              onChange={setViewport}
            />
            <div className="mt-4 flex justify-center">
              <PhoneFrame viewport={viewport} containerWidth={340}>
                {previewNode}
              </PhoneFrame>
            </div>
            <PreviewFooter savedAt={savedAt} dirty={dirty} />
          </div>
        </aside>
      </div>

      {/* Mobile preview modal */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--d-bg-0)] xl:hidden">
          <div className="flex items-center justify-between border-b border-[var(--d-line)] px-5 py-4">
            <PreviewHeader
              slug={defaults.event.slug}
              viewport={viewport}
              onChange={setViewport}
              compact
            />
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="d-mono ml-3 rounded-full border border-[var(--d-line-strong)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
            >
              ✕ Tutup
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[var(--d-bg-1)] p-4">
            <div className="mx-auto" style={{ maxWidth: 420 }}>
              <PhoneFrame viewport={viewport} containerWidth={400}>
                {previewNode}
              </PhoneFrame>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sectionLead(id: SectionId): string {
  switch (id) {
    case "mempelai":
      return "Cerita dimulai dari kalian. Detail di sini muncul di hero undangan.";
    case "foto-sampul":
      return "Foto utama yang muncul di bagian paling atas undangan.";
    case "kutipan":
      return "Ayat, sajak, atau quote singkat untuk membuka cerita.";
    case "cerita":
      return "Bagikan kisah perjalanan kalian — singkat saja, biarkan tamu penasaran.";
    case "acara":
      return "Akad, resepsi, intimate dinner — tambahkan setiap momen.";
    case "rsvp":
      return "Form konfirmasi kehadiran tamu otomatis aktif. Toggle di sini mengatur tampilannya.";
    case "galeri":
      return "Album foto pre-wedding. Fitur ini akan tersedia segera.";
    case "amplop":
      return "Hadiah digital via transfer atau e-wallet. Fitur ini akan tersedia segera.";
  }
}

function TopBar({
  dirty,
  pending,
  savedAt,
  onSave,
  onMobilePreview,
}: {
  dirty: boolean;
  pending: boolean;
  savedAt: Date | null;
  onSave: () => void;
  onMobilePreview: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--d-line)] bg-[var(--d-bg-0)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-5 py-5 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
              }}
            />
            <p className="d-eyebrow">Website Editor</p>
          </div>
          <h1 className="d-serif mt-2 text-[28px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[36px]">
            Susun{" "}
            <em className="d-serif italic text-[var(--d-coral)]">cerita</em>{" "}
            kalian
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator dirty={dirty} savedAt={savedAt} />
          <Link
            href="/dashboard/website/theme"
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(212,184,150,0.35)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-gold)] transition-colors hover:bg-[rgba(212,184,150,0.08)]"
          >
            ✨ Tema
          </Link>
          <button
            type="button"
            onClick={onMobilePreview}
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] xl:hidden"
          >
            👁 Pratinjau
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[12px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && (
              <span
                aria-hidden
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            <span>{pending ? "Menyimpan…" : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({
  dirty,
  savedAt,
}: {
  dirty: boolean;
  savedAt: Date | null;
}) {
  return (
    <div className="d-mono flex items-center gap-2 rounded-full border border-[var(--d-line)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em]">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          dirty
            ? "animate-pulse bg-[var(--d-coral)]"
            : "bg-[var(--d-green)]"
        }`}
      />
      <span className="text-[var(--d-ink-dim)]">
        {dirty
          ? "Belum disimpan"
          : savedAt
            ? `Tersimpan · ${relativeTime(savedAt)}`
            : "Tersimpan otomatis"}
      </span>
    </div>
  );
}

function relativeTime(d: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 5) return "barusan";
  if (sec < 60) return `${sec} detik lalu`;
  if (sec < 3600) return `${Math.floor(sec / 60)} menit lalu`;
  return `${Math.floor(sec / 3600)} jam lalu`;
}

// ============================================================================
// Section list (left panel)
// ============================================================================

function SectionListItem({
  def,
  active,
  enabled,
  onSelect,
  onToggle,
}: {
  def: SectionDef;
  active: boolean;
  enabled: boolean;
  onSelect: () => void;
  onToggle?: () => void;
}) {
  const baseStyle: React.CSSProperties = active
    ? {
        borderLeft: "2px solid var(--d-coral)",
        background:
          "linear-gradient(90deg, rgba(240,160,156,0.10) 0%, transparent 100%)",
      }
    : {};

  return (
    <li
      className={`relative flex items-start gap-3 px-5 py-3 transition-colors ${
        active
          ? "cursor-pointer"
          : "cursor-pointer hover:bg-[var(--d-bg-2)]/40"
      }`}
      style={baseStyle}
      onClick={onSelect}
    >
      <span className="d-mono shrink-0 pt-0.5 text-[12px] text-[var(--d-coral)]">
        {def.number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="d-serif text-[15px] leading-tight text-[var(--d-ink)]">
          {def.title}
        </p>
        <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
          {def.description}
        </p>
      </div>
      {def.comingSoon ? (
        // Section is unlocked but not yet wired to a save action —
        // the BETA pill signals that to the user; clicking the row
        // still opens the placeholder UI.
        <span className="d-mono shrink-0 self-start rounded bg-[rgba(184,157,212,0.12)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] text-[var(--d-lilac)]">
          Beta
        </span>
      ) : onToggle ? (
        <Toggle
          enabled={enabled}
          onToggle={onToggle}
          ariaLabel={`Tampilkan bagian ${def.title} di undangan`}
        />
      ) : (
        <span className="d-mono shrink-0 self-start rounded bg-[rgba(126,211,164,0.10)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] text-[var(--d-green)]">
          Selalu
        </span>
      )}
    </li>
  );
}

// ============================================================================
// Section hero (centre panel header)
// ============================================================================

function SectionHero({
  number,
  title,
  accent,
  description,
  flag,
  enabled,
  onToggle,
}: {
  number: string;
  title: string;
  accent?: string;
  description: string;
  flag?: keyof SectionFlags;
  enabled: boolean;
  onToggle?: () => void;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="d-serif italic text-[var(--d-coral)] text-[20px] leading-none">
          {number}{" "}
          <span className="d-serif not-italic text-[var(--d-ink)]">
            {title}
          </span>
        </p>
        {accent && (
          <p className="d-serif mt-1 text-[36px] font-extralight italic leading-tight text-[var(--d-coral)] md:text-[40px]">
            {accent}
          </p>
        )}
        <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
          {description}
        </p>
      </div>
      {onToggle && flag && (
        <div className="flex items-center gap-3">
          <span className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            Tampilkan
          </span>
          <Toggle
            enabled={enabled}
            onToggle={onToggle}
            ariaLabel={`Tampilkan bagian ${title}`}
          />
        </div>
      )}
    </header>
  );
}

// ============================================================================
// Custom toggle — coral track when ON, dark when OFF
// ============================================================================

function Toggle({
  enabled,
  onToggle,
  ariaLabel,
}: {
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors"
      style={{
        background: enabled
          ? "linear-gradient(90deg, var(--d-coral) 0%, var(--d-peach) 100%)"
          : "rgba(255,255,255,0.06)",
        border: enabled ? "1px solid transparent" : "1px solid var(--d-line-strong)",
        boxShadow: enabled
          ? "0 0 14px rgba(240,160,156,0.35)"
          : undefined,
      }}
    >
      <span
        aria-hidden
        className="block h-4 w-4 rounded-full bg-white shadow"
        style={{
          transform: enabled ? "translateX(21px)" : "translateX(3px)",
          transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </button>
  );
}

// ============================================================================
// Preview header (right panel)
// ============================================================================

function PreviewHeader({
  slug,
  viewport,
  onChange,
  compact,
}: {
  slug: string;
  viewport: Viewport;
  onChange: (v: Viewport) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && (
        <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-ink-faint)]">
          Pratinjau Langsung
        </p>
      )}
      <p className="d-mono mt-1 text-[11px] text-[var(--d-coral)]">
        {slug}.uwu.id
      </p>
      <ViewportPills value={viewport} onChange={onChange} />
    </div>
  );
}

function ViewportPills({
  value,
  onChange,
}: {
  value: Viewport;
  onChange: (v: Viewport) => void;
}) {
  const items: { id: Viewport; label: string }[] = [
    { id: "mobile", label: "Mobile" },
    { id: "tablet", label: "Tablet" },
    { id: "desktop", label: "Desktop" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Ukuran preview"
      className="mt-3 inline-flex gap-1 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-1"
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`d-mono rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
              active
                ? "bg-[var(--d-bg-1)] text-[var(--d-ink)]"
                : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewFooter({
  savedAt,
  dirty,
}: {
  savedAt: Date | null;
  dirty: boolean;
}) {
  return (
    <div className="d-mono mt-4 flex items-center justify-center gap-2 border-t border-[var(--d-line)] pt-3 text-[9.5px] uppercase tracking-[0.28em] text-[var(--d-ink-faint)]">
      <span
        aria-hidden
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--d-coral)]"
      />
      <span>
        {dirty
          ? "Live · Update otomatis"
          : savedAt
            ? `Live · ${relativeTime(savedAt)}`
            : "Live · Update otomatis"}
      </span>
    </div>
  );
}

// ============================================================================
// Per-section forms — kept small, share the dark inputClass
// ============================================================================

function MempelaiForm({
  eventId,
  couple,
  onChange,
}: {
  eventId: string;
  couple: CoupleData;
  onChange: <K extends keyof CoupleData>(key: K, value: CoupleData[K]) => void;
}) {
  return (
    <div className="space-y-9">
      <CoupleBlock
        eventId={eventId}
        side="bride"
        couple={couple}
        onChange={onChange}
      />
      <hr className="border-[var(--d-line)]" />
      <CoupleBlock
        eventId={eventId}
        side="groom"
        couple={couple}
        onChange={onChange}
      />
    </div>
  );
}

function CoupleBlock({
  eventId,
  side,
  couple,
  onChange,
}: {
  eventId: string;
  side: "bride" | "groom";
  couple: CoupleData;
  onChange: <K extends keyof CoupleData>(key: K, value: CoupleData[K]) => void;
}) {
  const isBride = side === "bride";
  const title = isBride ? "Mempelai Wanita" : "Mempelai Pria";
  const tag = isBride ? "PUTRI" : "PUTRA";

  const nameKey = isBride ? "brideName" : "groomName";
  const nicknameKey = isBride ? "brideNickname" : "groomNickname";
  const fatherKey = isBride ? "brideFatherName" : "groomFatherName";
  const motherKey = isBride ? "brideMotherName" : "groomMotherName";
  const photoKey = isBride ? "bridePhotoUrl" : "groomPhotoUrl";

  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="d-serif text-[20px] font-light text-[var(--d-ink)]">
          {title}
        </h3>
        <span className="d-mono rounded-full border border-[var(--d-line-strong)] px-2 py-0.5 text-[9px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          {tag}
        </span>
      </div>
      <div className="mt-5 grid gap-7 md:grid-cols-2">
        <Field
          label="Nama lengkap"
          required
          value={couple[nameKey] as string}
          onChange={(v) => onChange(nameKey as keyof CoupleData, v)}
        />
        <Field
          label="Panggilan"
          value={(couple[nicknameKey] as string | null) ?? ""}
          onChange={(v) => onChange(nicknameKey as keyof CoupleData, v)}
        />
        <Field
          label="Nama ayah"
          value={(couple[fatherKey] as string | null) ?? ""}
          onChange={(v) => onChange(fatherKey as keyof CoupleData, v)}
        />
        <Field
          label="Nama ibu"
          value={(couple[motherKey] as string | null) ?? ""}
          onChange={(v) => onChange(motherKey as keyof CoupleData, v)}
        />
        <div className="md:col-span-2">
          <PhotoUpload
            eventId={eventId}
            slot={isBride ? "bride-photo" : "groom-photo"}
            label={`Foto ${title.toLowerCase()}`}
            value={(couple[photoKey] as string | null) ?? ""}
            onChange={(v) =>
              onChange(photoKey as keyof CoupleData, (v || null) as never)
            }
          />
        </div>
      </div>
    </div>
  );
}

function FotoSampulForm({
  eventId,
  url,
  onChange,
}: {
  eventId: string;
  url: string;
  onChange: (v: string) => void;
}) {
  return (
    <PhotoUpload
      eventId={eventId}
      slot="cover-photo"
      label="Foto sampul"
      aspect="wide"
      value={url}
      onChange={onChange}
    />
  );
}

function KutipanForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>Kutipan / ayat</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="“Dan di antara tanda-tanda kekuasaan-Nya…”"
        className={`${inputClass} resize-none`}
      />
    </label>
  );
}

function CeritaForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>Cerita singkat</span>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tuliskan cerita perjalanan cinta Anda…"
        className={`${inputClass} resize-none`}
      />
    </label>
  );
}

// `<input type="time">` is already format-constrained by the
// browser, so we don't validate the shape — just the cross-field
// rule. String comparison works because the input always returns
// HH:MM 24-hour, zero-padded.
function validateTimes(start: string, end: string): {
  startError?: string;
  endError?: string;
} {
  if (start && end && end <= start) {
    return { endError: "Jam selesai harus setelah jam mulai" };
  }
  return {};
}

function AcaraForm({
  rows,
  update,
  add,
  remove,
}: {
  rows: ScheduleDraft[];
  update: (idx: number, patch: Partial<ScheduleDraft>) => void;
  add: () => void;
  remove: (idx: number) => void;
}) {
  return (
    <div className="space-y-5">
      {rows.map((row, idx) => {
        const { startError, endError } = validateTimes(
          row.startTime,
          row.endTime,
        );
        return (
        <div
          key={idx}
          className="rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-2)]/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="d-serif text-[18px] font-light text-[var(--d-ink)]">
              Acara {idx + 1}
            </h4>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <Field
              label="Label"
              required
              value={row.label}
              onChange={(v) => update(idx, { label: v })}
            />
            <Field
              label="Tanggal"
              type="date"
              value={row.eventDate}
              onChange={(v) => update(idx, { eventDate: v })}
              required
            />
            <Field
              label="Mulai"
              type="time"
              value={row.startTime}
              onChange={(v) => update(idx, { startTime: v })}
              error={startError}
            />
            <Field
              label="Selesai"
              type="time"
              value={row.endTime}
              onChange={(v) => update(idx, { endTime: v })}
              error={endError}
            />
            <div className="md:col-span-2">
              <Field
                label="Nama tempat"
                value={row.venueName}
                onChange={(v) => update(idx, { venueName: v })}
              />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Alamat"
                value={row.venueAddress}
                onChange={(v) => update(idx, { venueAddress: v })}
              />
            </div>
            <VenueMapField
              tone="dark"
              value={row.venueMapUrl}
              onChange={(v) => update(idx, { venueMapUrl: v })}
              venueName={row.venueName}
              venueAddress={row.venueAddress}
            />
          </div>
        </div>
        );
      })}
      {rows.length < 6 && (
        <button
          type="button"
          onClick={add}
          className="d-mono w-full rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-transparent px-4 py-4 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-ink)]"
        >
          + Tambah Acara
        </button>
      )}
    </div>
  );
}

function RsvpForm() {
  return (
    <p className="text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
      Form RSVP otomatis aktif untuk seluruh tamu. Toggle di sini mengatur
      apakah seksi <em className="not-italic text-[var(--d-ink)]">
        “Konfirmasi Kehadiran”
      </em>{" "}
      tampil di halaman undangan. Kelola pesan dan konfirmasi tamu di{" "}
      <Link
        href="/dashboard/guests"
        className="text-[var(--d-coral)] hover:text-[var(--d-peach)]"
      >
        Tamu →
      </Link>
    </p>
  );
}

// ============================================================================
// Galeri (placeholder UI — visual only, no save wired yet)
// ============================================================================

function GaleriForm() {
  // Six fixed slots that mirror the planned final layout. Buttons are
  // disabled because the gallery_images column doesn't exist yet; the
  // notice at the top makes the state clear without locking the row
  // out of the section list.
  const slots = Array.from({ length: 6 });
  return (
    <div className="space-y-6">
      <BetaNotice
        message="Upload galeri masih dalam pengembangan. Tampilan di bawah adalah pratinjau struktur yang akan segera tersedia — Anda tidak perlu upgrade paket."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {slots.map((_, i) => (
          <button
            key={i}
            type="button"
            disabled
            className="group relative flex aspect-square cursor-not-allowed items-center justify-center rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[var(--d-bg-2)] text-[var(--d-ink-faint)] transition-colors"
            aria-label={`Slot foto ${i + 1}`}
          >
            <span className="d-mono flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.18em]">
              <span aria-hidden className="text-[20px]">
                📷
              </span>
              Foto {i + 1}
            </span>
          </button>
        ))}
      </div>

      <p className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
        Maksimal 6 foto · JPG / PNG / WebP · 5 MB per foto
      </p>
    </div>
  );
}

// ============================================================================
// Amplop Digital (placeholder UI)
// ============================================================================

const BANK_OPTIONS = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "BSI",
  "CIMB Niaga",
  "Permata",
  "Bank Jago",
  "Jenius / BTPN",
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
];

function AmplopForm() {
  return (
    <div className="space-y-6">
      <BetaNotice
        message="Form rekening masih dalam pengembangan. Tampilan di bawah adalah pratinjau struktur final — Anda akan dapat menambah rekening begitu fitur tersedia."
      />

      <div className="rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-2)]/40 p-5">
        <div className="flex items-center justify-between">
          <h4 className="d-serif text-[18px] font-light text-[var(--d-ink)]">
            Rekening 1
          </h4>
          <span className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            Pratinjau
          </span>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              Bank / E-Wallet
            </span>
            <select
              disabled
              defaultValue="BCA"
              className="mt-2 w-full cursor-not-allowed rounded-md border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-3 py-2.5 text-[14px] text-[var(--d-ink-dim)] opacity-70 outline-none"
            >
              {BANK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              Nomor rekening
            </span>
            <input
              type="text"
              disabled
              placeholder="1234567890"
              className="mt-2 w-full cursor-not-allowed bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink-dim)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)]"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="d-mono block text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              Atas nama
            </span>
            <input
              type="text"
              disabled
              placeholder="Vivi Anggraini"
              className="mt-2 w-full cursor-not-allowed bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink-dim)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)]"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="d-mono w-full cursor-not-allowed rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-transparent px-4 py-4 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]"
      >
        + Tambah Rekening
      </button>
    </div>
  );
}

function BetaNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(184,157,212,0.30)] bg-[rgba(184,157,212,0.06)] p-4">
      <span aria-hidden className="text-[14px]">
        ✨
      </span>
      <div>
        <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-lilac)]">
          Beta · Segera Hadir
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          {message}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-[var(--d-coral)]">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`${inputClass} ${
          type === "date" || type === "time" ? "[color-scheme:dark]" : ""
        } ${error ? "border-[var(--d-coral)]" : ""}`}
      />
      {error && (
        <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-coral)]">
          {error}
        </p>
      )}
    </label>
  );
}

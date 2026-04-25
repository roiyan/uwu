"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveWebsiteDraftAction } from "@/lib/actions/event";
import { useToast } from "@/components/shared/Toast";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { Preview } from "@/components/invitation/Preview";
import { PhoneFrame, ViewportToggle, type Viewport } from "@/components/invitation/PhoneFrame";
import type {
  CoupleData,
  InvitationEvent,
  Palette,
  ScheduleData,
  SectionFlags,
} from "@/components/invitation/types";
import { ALL_SECTIONS_ON } from "@/components/invitation/types";

// Underline-only inputs to match the dashboard dark idiom. Same look
// as the broadcast composer + onboarding form fields.
const inputClass =
  "mt-2 w-full bg-transparent border-0 border-b border-[var(--d-line-strong)] px-0 py-2.5 text-[14px] text-[var(--d-ink)] outline-none placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)] transition-colors";

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

export function EditorSplit({ defaults }: { defaults: EditorDefaults }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // Local draft — mutated on every keystroke, flushes to DB only on Simpan.
  const [couple, setCouple] = useState<CoupleData>(defaults.couple);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(
    defaults.schedules.map(fromSchedule),
  );
  const [sections, setSections] = useState<SectionFlags>(ALL_SECTIONS_ON);
  const [viewport, setViewport] = useState<Viewport>("mobile");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  function updateCouple<K extends keyof CoupleData>(key: K, value: CoupleData[K]) {
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
      else setDirty(false);
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

  return (
    <div className="flex-1">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--d-line)] bg-[var(--d-bg-0)]/90 px-5 py-4 backdrop-blur lg:px-12">
        <div className="min-w-0">
          <p className="d-eyebrow">Website Editor</p>
          <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            <span
              aria-hidden
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                dirty
                  ? "animate-pulse bg-[var(--d-coral)]"
                  : "bg-[var(--d-green)]"
              }`}
            />
            {dirty
              ? "Ada perubahan yang belum disimpan"
              : "Tersimpan otomatis"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/website/theme"
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(212,184,150,0.35)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-gold)] transition-colors hover:bg-[rgba(212,184,150,0.08)]"
          >
            <span aria-hidden>✨</span> Tema
          </Link>
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(true)}
            className="d-mono rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] lg:hidden"
          >
            👁 Pratinjau
          </button>
          <button
            type="button"
            onClick={handleSave}
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

      <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:px-10">
        {/* Left panel — controls */}
        <div className="min-w-0 space-y-4">
          <SectionCard
            id="mempelai"
            title="Mempelai"
            description="Nama, orang tua, foto."
            enabled={sections.couple}
            onToggle={() => toggleSection("couple")}
            defaultOpen
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nama mempelai wanita"
                value={couple.brideName}
                onChange={(v) => updateCouple("brideName", v)}
                required
              />
              <Field
                label="Panggilan"
                value={couple.brideNickname ?? ""}
                onChange={(v) => updateCouple("brideNickname", v)}
              />
              <Field
                label="Nama ayah"
                value={couple.brideFatherName ?? ""}
                onChange={(v) => updateCouple("brideFatherName", v)}
              />
              <Field
                label="Nama ibu"
                value={couple.brideMotherName ?? ""}
                onChange={(v) => updateCouple("brideMotherName", v)}
              />
              <div className="md:col-span-2">
                <PhotoUpload
                  eventId={defaults.event.id!}
                  slot="bride-photo"
                  label="Foto mempelai wanita"
                  value={couple.bridePhotoUrl ?? ""}
                  onChange={(v) => updateCouple("bridePhotoUrl", v || null)}
                />
              </div>
              <Field
                label="Nama mempelai pria"
                value={couple.groomName}
                onChange={(v) => updateCouple("groomName", v)}
                required
              />
              <Field
                label="Panggilan"
                value={couple.groomNickname ?? ""}
                onChange={(v) => updateCouple("groomNickname", v)}
              />
              <Field
                label="Nama ayah"
                value={couple.groomFatherName ?? ""}
                onChange={(v) => updateCouple("groomFatherName", v)}
              />
              <Field
                label="Nama ibu"
                value={couple.groomMotherName ?? ""}
                onChange={(v) => updateCouple("groomMotherName", v)}
              />
              <div className="md:col-span-2">
                <PhotoUpload
                  eventId={defaults.event.id!}
                  slot="groom-photo"
                  label="Foto mempelai pria"
                  value={couple.groomPhotoUrl ?? ""}
                  onChange={(v) => updateCouple("groomPhotoUrl", v || null)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="cover"
            title="Foto Sampul"
            description="Tampil di hero undangan."
            enabled
          >
            <PhotoUpload
              eventId={defaults.event.id!}
              slot="cover-photo"
              label="Foto sampul"
              aspect="wide"
              value={couple.coverPhotoUrl ?? ""}
              onChange={(v) => updateCouple("coverPhotoUrl", v || null)}
            />
          </SectionCard>

          <SectionCard
            id="kutipan"
            title="Kutipan"
            description="Ayat atau quote favorit Anda."
            enabled={sections.quote}
            onToggle={() => toggleSection("quote")}
          >
            <label className="block">
              <span className="text-sm font-medium text-[var(--d-ink)]">Kutipan / ayat</span>
              <textarea
                rows={2}
                value={couple.quote ?? ""}
                onChange={(e) => updateCouple("quote", e.target.value)}
                placeholder="“Dan di antara tanda-tanda kekuasaan-Nya…”"
                className={`${inputClass} resize-none`}
              />
            </label>
          </SectionCard>

          <SectionCard
            id="cerita"
            title="Cerita Kami"
            description="Kisah perjalanan cinta Anda."
            enabled={sections.story}
            onToggle={() => toggleSection("story")}
          >
            <label className="block">
              <span className="text-sm font-medium text-[var(--d-ink)]">Cerita singkat</span>
              <textarea
                rows={5}
                value={couple.story ?? ""}
                onChange={(e) => updateCouple("story", e.target.value)}
                placeholder="Tuliskan cerita perjalanan cinta Anda..."
                className={`${inputClass} resize-none`}
              />
            </label>
          </SectionCard>

          <SectionCard
            id="jadwal"
            title="Jadwal & Lokasi"
            description="Rangkaian acara Anda."
            enabled={sections.schedules}
            onToggle={() => toggleSection("schedules")}
            defaultOpen
          >
            <div className="space-y-4">
              {schedules.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--d-line)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-base text-[var(--d-ink)]">
                      Acara {idx + 1}
                    </h4>
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSchedule(idx)}
                        className="text-xs text-[var(--d-ink-faint)] hover:text-[var(--d-coral)]"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field
                      label="Label"
                      value={row.label}
                      onChange={(v) => updateSchedule(idx, { label: v })}
                      required
                    />
                    <Field
                      label="Tanggal"
                      type="date"
                      value={row.eventDate}
                      onChange={(v) => updateSchedule(idx, { eventDate: v })}
                      required
                    />
                    <Field
                      label="Mulai"
                      type="time"
                      value={row.startTime}
                      onChange={(v) => updateSchedule(idx, { startTime: v })}
                    />
                    <Field
                      label="Selesai"
                      type="time"
                      value={row.endTime}
                      onChange={(v) => updateSchedule(idx, { endTime: v })}
                    />
                    <div className="md:col-span-2">
                      <Field
                        label="Nama tempat"
                        value={row.venueName}
                        onChange={(v) => updateSchedule(idx, { venueName: v })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Field
                        label="Alamat"
                        value={row.venueAddress}
                        onChange={(v) => updateSchedule(idx, { venueAddress: v })}
                      />
                    </div>
                    <VenueMapField
                      value={row.venueMapUrl}
                      onChange={(v) => updateSchedule(idx, { venueMapUrl: v })}
                      venueName={row.venueName}
                      venueAddress={row.venueAddress}
                    />
                  </div>
                </div>
              ))}
              {schedules.length < 6 && (
                <button
                  type="button"
                  onClick={addSchedule}
                  className="w-full rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[var(--d-bg-card)]/40 px-4 py-3 text-sm text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
                >
                  + Tambah Acara
                </button>
              )}
            </div>
          </SectionCard>

          <SectionCard
            id="rsvp"
            title="RSVP"
            description="Form konfirmasi kehadiran tamu."
            enabled={sections.rsvp}
            onToggle={() => toggleSection("rsvp")}
          >
            <p className="text-sm text-[var(--d-ink-dim)]">
              Form RSVP otomatis aktif. Toggle di sini mengatur apakah section
              &ldquo;Konfirmasi Kehadiran&rdquo; tampil di undangan.
            </p>
          </SectionCard>
        </div>

        {/* Right panel — live preview (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="mb-3 flex items-center justify-center">
              <ViewportToggle value={viewport} onChange={setViewport} />
            </div>
            <PhoneFrame viewport={viewport} containerWidth={640}>
              {previewNode}
            </PhoneFrame>
          </div>
        </aside>
      </div>

      {/* Mobile preview modal */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--d-bg-0)] lg:hidden">
          <div className="flex items-center justify-between border-b border-[var(--d-line)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--d-ink)]">Pratinjau</p>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="rounded-full px-3 py-1 text-sm font-medium text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
            >
              ✕ Tutup
            </button>
          </div>
          <div className="flex-1 overflow-auto">{previewNode}</div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  defaultOpen = false,
  enabled,
  onToggle,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  enabled: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl bg-[var(--d-bg-card)] ring-1 ring-black/5 shadow-ghost-sm">
      <header className="flex items-center gap-2 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span
            className="inline-block h-5 w-5 text-[var(--d-ink-dim)] transition-transform duration-200"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ›
          </span>
          <span>
            <span className="block font-display text-lg text-[var(--d-ink)]">{title}</span>
            <span className="block text-xs text-[var(--d-ink-dim)]">{description}</span>
          </span>
        </button>
        {onToggle && <SectionToggle enabled={enabled} onToggle={onToggle} />}
      </header>
      {open && (
        <div className="border-t border-black/5 px-5 py-5">{children}</div>
      )}
    </section>
  );
}

function SectionToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label="Tampilkan bagian ini di undangan"
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? "bg-[var(--d-bg-2)]" : "bg-[var(--d-bg-2)]"
      }`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-[var(--d-bg-card)] shadow transition-transform"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--d-ink)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

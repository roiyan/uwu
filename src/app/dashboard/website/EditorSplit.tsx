"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  saveWebsiteDraftAction,
  updateSectionOrderAction,
} from "@/lib/actions/event";
import { useToast } from "@/components/shared/Toast";
import { VenueMapField } from "@/components/shared/VenueMapField";
import { Preview } from "@/components/invitation/Preview";
import {
  DEFAULT_SECTION_ORDER,
  type SectionId as CanonicalSectionId,
} from "@/lib/theme/sections";
import { PhoneFrame, type Viewport } from "@/components/invitation/PhoneFrame";
import { MediaLibraryModal } from "@/components/media/MediaLibraryModal";
import { MediaPicker } from "@/components/media/MediaPicker";
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
  /**
   * Persisted left-rail section order. The page already projects any
   * dirty stored value back onto a clean canonical permutation via
   * `resolveSectionOrder`, so we trust the caller and treat this as
   * authoritative. Consumed by the DnD UI in a follow-up commit.
   */
  sectionOrder: string[];
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
  | "countdown"
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
    title: "Kisah Kami",
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
    id: "countdown",
    number: "06",
    title: "Hitung Mundur",
    description: "Live countdown ke hari H",
    flag: "countdown",
  },
  {
    id: "galeri",
    number: "07",
    title: "Galeri",
    description: "Foto pre-wedding",
    flag: "gallery",
  },
  {
    id: "rsvp",
    number: "08",
    title: "RSVP & Ucapan",
    description: "Form konfirmasi tamu",
    flag: "rsvp",
  },
  {
    id: "amplop",
    number: "09",
    title: "Tanda Kasih",
    description: "Rekening + konfirmasi tamu",
    flag: "gifts",
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
  // Section order — driven by the persisted override the page hands
  // us. Mutated optimistically on drop; the server action fires in a
  // detached transition so the drag flow stays snappy.
  const [orderedIds, setOrderedIds] = useState<string[]>(
    defaults.sectionOrder,
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Camera-icon button in TopBar opens this — manager view of the
  // central media library so the operator can review/delete assets
  // without scrolling into a section editor.
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
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

    toast.success("Perubahan tersimpan");
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
      // Drive the live preview's render order off `orderedIds` —
      // already updated optimistically in handleSectionDrop, so the
      // preview snaps to the new order on drop without waiting for
      // the server transition. The cast widens the local SectionId
      // alias to the canonical one (same string union, just a
      // different declaration site).
      sectionOrder={orderedIds as readonly CanonicalSectionId[]}
      staticMode
    />
  );

  const activeDef = SECTIONS.find((s) => s.id === activeSection)!;
  const activeFlagOn = activeDef.flag ? sections[activeDef.flag] : true;
  const activeIdx = SECTIONS.findIndex((s) => s.id === activeSection);

  // Project the canonical SECTIONS metadata onto the live order so
  // the left rail renders in the user's preferred order while every
  // SECTIONS-by-index lookup site (activeIdx, prev/next) keeps
  // working unchanged.
  const orderedSections = useMemo(() => {
    const byId = new Map<string, SectionDef>(SECTIONS.map((s) => [s.id, s]));
    const out: SectionDef[] = [];
    const seen = new Set<string>();
    for (const id of orderedIds) {
      const def = byId.get(id);
      if (def && !seen.has(id)) {
        out.push(def);
        seen.add(id);
      }
    }
    for (const s of SECTIONS) {
      if (!seen.has(s.id)) out.push(s);
    }
    return out;
  }, [orderedIds]);

  function handleSectionDragStart(
    id: string,
    e: React.DragEvent<HTMLElement>,
  ) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleSectionDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleSectionDrop(targetId: string) {
    const sourceId = draggingId;
    setDragOverId(null);
    setDraggingId(null);
    if (!sourceId || sourceId === targetId) return;
    const next = [...orderedIds];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  }

  // Centralised optimistic-update + persist helper used by drag-drop,
  // mobile ▲▼ buttons, and the header reset ↺. Always sets state
  // before firing the action so the preview re-renders immediately;
  // rolls back to the last persisted order if the server rejects.
  function persistOrder(next: string[]) {
    setOrderedIds(next);
    const eventId = defaults.event.id;
    if (!eventId) return;
    startTransition(async () => {
      const res = await updateSectionOrderAction(eventId, next);
      if (!res.ok) {
        toast.error(res.error);
        setOrderedIds(defaults.sectionOrder);
      }
    });
  }

  // True when the live order diverges from the canonical default.
  // Drives the visibility of the reset ↺ button in the rail header.
  // The two arrays have a fixed 8-element shape, so a same-length
  // index walk is fine — JSON.stringify works too but allocates.
  const isOrderChanged =
    orderedIds.length !== DEFAULT_SECTION_ORDER.length ||
    orderedIds.some((id, i) => id !== DEFAULT_SECTION_ORDER[i]);

  function handleResetOrder() {
    persistOrder([...DEFAULT_SECTION_ORDER]);
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    persistOrder(next);
  }

  function handleMoveDown(index: number) {
    if (index >= orderedIds.length - 1) return;
    const next = [...orderedIds];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    persistOrder(next);
  }

  // Mobile drag-and-drop for the section pills. iOS Safari ignores
  // HTML5 DnD on touch, so we feed the same draggingId / dragOverId
  // state from raw touch events and look up the target pill via
  // document.elementFromPoint().
  //
  // Drag mode is gated on a 500 ms long-press: until the timer fires
  // we leave the gesture alone so the pill strip can scroll
  // horizontally / page can scroll vertically as normal. After the
  // timer fires we set `pillDragId`, switch the held pill's
  // touch-action to "none", and start tracking pointer position.
  // Without that gate every quick swipe hijacks the scroll into a
  // failed drag, which felt awful.
  //
  // The synthetic click that fires after a touch drag gets
  // suppressed (suppressNextClickRef) so a drop doesn't also flip
  // the active section.
  const suppressNextClickRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pillDragId, setPillDragId] = useState<string | null>(null);

  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePillTouchStart(id: string) {
    suppressNextClickRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setPillDragId(id);
      setDraggingId(id);
      setDragOverId(null);
      // Light haptic so the user feels the drag mode unlock —
      // matches iOS native long-press affordance.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          /* ignore */
        }
      }
    }, 500);
  }
  function handlePillTouchMove(e: React.TouchEvent<HTMLButtonElement>) {
    // Pre-arm: a real move means the user is scrolling, not holding.
    // Cancel the drag-arm timer and fall through; we DO NOT
    // preventDefault here so the browser keeps scrolling normally.
    if (!pillDragId) {
      clearLongPress();
      return;
    }
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    const el = document.elementFromPoint(
      t.clientX,
      t.clientY,
    ) as HTMLElement | null;
    const pill = el?.closest<HTMLElement>("[data-pill-id]");
    const targetId = pill?.dataset.pillId;
    if (targetId && targetId !== pillDragId) {
      if (dragOverId !== targetId) setDragOverId(targetId);
      // Once the gesture has actually moved to a different pill,
      // treat it as a drag — the upcoming synthetic click should
      // not switch sections.
      suppressNextClickRef.current = true;
    }
  }
  function handlePillTouchEnd() {
    clearLongPress();
    if (pillDragId && dragOverId && pillDragId !== dragOverId) {
      handleSectionDrop(dragOverId);
    } else {
      setDraggingId(null);
      setDragOverId(null);
    }
    setPillDragId(null);
  }

  const enabledCount = SECTIONS.reduce((acc, s) => {
    if (s.comingSoon) return acc;
    if (!s.flag) return acc + 1; // always-on sections
    return acc + (sections[s.flag] ? 1 : 0);
  }, 0);

  return (
    <div className="flex-1">
      {/* Sticky top action bar — TopBar + mobile section pills share
          one sticky container so the pills sit flush under the bar
          on mobile without measuring its dynamic height. */}
      <div className="sticky top-0 z-30 border-b border-[var(--d-line)] bg-[var(--d-bg-0)]/95 backdrop-blur">
        <TopBar
          dirty={dirty}
          pending={pending}
          savedAt={savedAt}
          onSave={handleSave}
          onMobilePreview={() => setMobilePreviewOpen(true)}
          onOpenMedia={
            defaults.event.id
              ? () => setMediaLibraryOpen(true)
              : undefined
          }
        />

        {/* Mobile section pills — inside sticky so they ride along
            with the TopBar instead of scrolling out of view. The
            pills are draggable on both desktop (HTML5 DnD with a
            mouse) and mobile (touch). On touch we walk pointer
            position with elementFromPoint() because plain HTML5 DnD
            is unreliable on iOS Safari. */}
        <div className="lg:hidden">
          <nav className="flex gap-2 overflow-x-auto px-5 pb-2 pt-1">
            {orderedSections.map((s, idx) => {
              const isActive = activeSection === s.id;
              const isDragging = draggingId === s.id;
              const isDragOver =
                dragOverId === s.id && draggingId !== s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-pill-index={idx}
                  data-pill-id={s.id}
                  draggable
                  onDragStart={(e) => handleSectionDragStart(s.id, e)}
                  onDragOver={(e) => {
                    if (!draggingId || draggingId === s.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverId !== s.id) setDragOverId(s.id);
                  }}
                  onDragLeave={() =>
                    setDragOverId((cur) => (cur === s.id ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    handleSectionDrop(s.id);
                  }}
                  onDragEnd={handleSectionDragEnd}
                  onTouchStart={() => handlePillTouchStart(s.id)}
                  onTouchMove={handlePillTouchMove}
                  onTouchEnd={handlePillTouchEnd}
                  onClick={() => {
                    // Suppress the synthetic click that follows a
                    // touch drag — without this, releasing on a
                    // non-self pill would both reorder AND switch
                    // the active section.
                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }
                    setActiveSection(s.id);
                  }}
                  className={`d-mono inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-all duration-150 ${
                    isActive
                      ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
                      : isDragOver
                        ? "border-[var(--d-coral)] text-[var(--d-coral)]"
                        : "border-[var(--d-line)] text-[var(--d-ink-dim)]"
                  }`}
                  style={{
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragging ? "scale(0.95)" : "scale(1)",
                    // Default `pan-y` lets the browser handle vertical
                    // page scroll + horizontal pill-strip scroll
                    // normally. Once the long-press timer fires we
                    // promote the held pill to `touchAction: 'none'`
                    // so the upcoming move is treated as a drag, not
                    // a scroll.
                    touchAction:
                      pillDragId === s.id ? "none" : "pan-y",
                    cursor: "grab",
                  }}
                >
                  {s.title}
                </button>
              );
            })}
          </nav>
          <p className="d-mono px-5 pb-2 text-center text-[9px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            Tahan 0,5 detik lalu geser untuk ubah urutan
          </p>
        </div>
      </div>

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
              <div className="flex items-center gap-2">
                <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
                  {enabledCount} aktif
                </p>
                {isOrderChanged && (
                  <button
                    type="button"
                    onClick={handleResetOrder}
                    title="Reset urutan ke default"
                    aria-label="Reset urutan bagian ke default"
                    className="d-mono inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--d-line)] text-[12px] text-[var(--d-ink-faint)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
                  >
                    ↺
                  </button>
                )}
              </div>
            </header>
            <ul>
              {orderedSections.map((s) => (
                <SectionListItem
                  key={s.id}
                  def={s}
                  active={activeSection === s.id}
                  enabled={s.flag ? sections[s.flag] : true}
                  onSelect={() => setActiveSection(s.id)}
                  onToggle={
                    s.flag ? () => toggleSection(s.flag!) : undefined
                  }
                  isDragging={draggingId === s.id}
                  isDragOver={dragOverId === s.id}
                  onDragStart={(e) => handleSectionDragStart(s.id, e)}
                  onDragOver={(e) => {
                    if (!draggingId || draggingId === s.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverId !== s.id) setDragOverId(s.id);
                  }}
                  onDragLeave={() =>
                    setDragOverId((cur) => (cur === s.id ? null : cur))
                  }
                  onDrop={() => handleSectionDrop(s.id)}
                  onDragEnd={handleSectionDragEnd}
                />
              ))}
            </ul>
          </div>
        </aside>

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
              {activeSection === "countdown" && <CountdownForm />}
              {activeSection === "rsvp" && <RsvpForm />}
              {activeSection === "galeri" && (
                <GaleriForm eventId={defaults.event.id ?? ""} />
              )}
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

      {/* Centralised media library — opened from the camera button in
          TopBar. Manager mode (no onSelect): tiles are delete-only.
          Section editors call MediaPicker which mounts the same modal
          in picker mode. */}
      {defaults.event.id && (
        <MediaLibraryModal
          eventId={defaults.event.id}
          open={mediaLibraryOpen}
          onClose={() => setMediaLibraryOpen(false)}
        />
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
    case "countdown":
      return "Hitung mundur ke hari H. Otomatis pakai tanggal acara pertama — toggle di sini untuk menampilkan / menyembunyikan.";
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
  onOpenMedia,
}: {
  dirty: boolean;
  pending: boolean;
  savedAt: Date | null;
  onSave: () => void;
  onMobilePreview: () => void;
  // Optional — only wired when the event has been persisted (id !=
  // null). Without it the camera button is hidden.
  onOpenMedia?: () => void;
}) {
  return (
    <div>
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
        {/* Mobile: status + Simpan share row 1; Tema + Pratinjau on row 2.
            Desktop (sm+): everything inline in one flex-wrap row. */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="flex items-center justify-between gap-2 sm:order-1 sm:contents">
            <SaveIndicator dirty={dirty} savedAt={savedAt} />
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[12px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:order-4"
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
          <div className="flex gap-2 sm:contents">
            {onOpenMedia && (
              <button
                type="button"
                onClick={onOpenMedia}
                className="d-mono inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)] sm:order-2 sm:flex-initial"
              >
                📷 Media
              </button>
            )}
            <Link
              href="/dashboard/website/theme"
              className="d-mono inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[rgba(212,184,150,0.35)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-gold)] transition-colors hover:bg-[rgba(212,184,150,0.08)] sm:order-2 sm:flex-initial"
            >
              ✨ Tema
            </Link>
            <button
              type="button"
              onClick={onMobilePreview}
              className="d-mono inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] sm:order-3 sm:flex-initial xl:hidden"
            >
              👁 Pratinjau
            </button>
          </div>
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
            : "Tersimpan"}
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
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  def: SectionDef;
  active: boolean;
  enabled: boolean;
  onSelect: () => void;
  onToggle?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  // Layered styling: base for the active row, a coral wash for the
  // current drop target, and a dim for the dragged row so the rail
  // clearly shows what's moving.
  const baseStyle: React.CSSProperties = active
    ? {
        borderLeft: "2px solid var(--d-coral)",
        background:
          "linear-gradient(90deg, rgba(240,160,156,0.10) 0%, transparent 100%)",
      }
    : {};
  const dropStyle: React.CSSProperties = isDragOver
    ? {
        background: "rgba(240,160,156,0.10)",
        outline: "1px dashed var(--d-coral)",
        outlineOffset: "-2px",
      }
    : {};

  return (
    <li
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDrop();
            }
          : undefined
      }
      onDragEnd={onDragEnd}
      className={`group relative flex items-start gap-3 px-5 py-3 transition-colors ${
        onDragStart
          ? "cursor-grab active:cursor-grabbing"
          : active
            ? "cursor-pointer"
            : "cursor-pointer hover:bg-[var(--d-bg-2)]/40"
      } ${isDragging ? "opacity-40" : ""}`}
      style={{ ...baseStyle, ...dropStyle }}
      onClick={onSelect}
    >
      {onDragStart && (
        <span
          aria-hidden
          className="mt-1 shrink-0 text-[var(--d-ink-faint)] opacity-60 transition-opacity group-hover:opacity-100"
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.2" />
            <circle cx="8" cy="2" r="1.2" />
            <circle cx="2" cy="7" r="1.2" />
            <circle cx="8" cy="7" r="1.2" />
            <circle cx="2" cy="12" r="1.2" />
            <circle cx="8" cy="12" r="1.2" />
          </svg>
        </span>
      )}
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
          {/* Constrain to a portrait thumbnail (120 mobile, 160 desktop).
              Without the width cap MediaPicker's `w-full` button stretched
              the 3:4 aspect ratio across the entire two-column row, which
              made the upload tile look like a hero image. The picker
              still triggers the same library modal — only its on-screen
              footprint changed. */}
          <div className="w-[120px] md:w-[160px]">
            <MediaPicker
              eventId={eventId}
              label={`Foto ${title.toLowerCase()}`}
              helper="Pilih atau unggah ke perpustakaan"
              aspectRatio="3 / 4"
              value={(couple[photoKey] as string | null) ?? null}
              onChange={(v) =>
                onChange(photoKey as keyof CoupleData, (v ?? null) as never)
              }
            />
          </div>
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
  // Cover photo is wider (16:9 hero crop) than the couple portraits.
  // Empty string sentinel kept so the existing onChange signature
  // (string, not string | null) stays unchanged.
  return (
    <MediaPicker
      eventId={eventId}
      label="Foto sampul"
      helper="Tampil di hero undangan"
      aspectRatio="16 / 9"
      value={url || null}
      onChange={(v) => onChange(v ?? "")}
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
// Countdown — pure visibility-only, no extra inputs. The ticker reads
// the first schedule's eventDate / startTime / timezone from the
// existing Acara form, so toggling this section on/off is the only
// knob the couple needs.
// ============================================================================

function CountdownForm() {
  return (
    <div className="space-y-4 text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
      <p>
        Hitung mundur otomatis pakai{" "}
        <em className="not-italic text-[var(--d-ink)]">
          tanggal &amp; jam acara pertama
        </em>{" "}
        dari bagian Acara. Toggle di sini mengatur apakah blok “Hitung
        Mundur” tampil di halaman undangan.
      </p>
      <p className="text-[12.5px]">
        Belum mengisi tanggal? Buka{" "}
        <span className="text-[var(--d-coral)]">Acara</span> lalu kembali —
        ticker akan langsung hidup di pratinjau.
      </p>
    </div>
  );
}

// ============================================================================
// Galeri (placeholder UI — visual only, no save wired yet)
// ============================================================================

function GaleriForm({ eventId }: { eventId: string }) {
  return <GalleryEditorClient eventId={eventId} />;
}

function GalleryEditorClient({ eventId }: { eventId: string }) {
  const [images, setImages] = useState<
    { id: string; imageUrl: string; sortOrder: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    void import("@/lib/actions/gallery").then(({ listGalleryImagesAction }) =>
      listGalleryImagesAction(eventId).then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setImages(
            res.data.map((r) => ({
              id: r.id,
              imageUrl: r.imageUrl,
              sortOrder: r.sortOrder,
            })),
          );
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { uploadGalleryImageAction } = await import("@/lib/actions/gallery");
      const res = await uploadGalleryImageAction(eventId, fd);
      if (res.ok && res.data) {
        setImages((prev) => [
          ...prev,
          { id: res.data!.id, imageUrl: res.data!.imageUrl, sortOrder: prev.length },
        ]);
      } else if (!res.ok) {
        setError(res.error);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!eventId) return;
    if (!window.confirm("Hapus foto ini?")) return;
    const { deleteGalleryImageAction } = await import("@/lib/actions/gallery");
    const res = await deleteGalleryImageAction(eventId, id);
    if (res.ok) {
      setImages((prev) => prev.filter((p) => p.id !== id));
    } else if (!res.ok) {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
          Galeri Foto
        </p>
        <h3 className="d-serif mt-2 text-[20px] font-light leading-tight text-[var(--d-ink)]">
          Momen{" "}
          <em className="d-serif italic text-[var(--d-coral)]">terindah</em>{" "}
          kalian.
        </h3>
        <p className="d-serif mt-2 text-[12.5px] italic leading-relaxed text-[var(--d-ink-dim)]">
          Upload foto pre-wedding atau momen bersama. Maksimal 6 foto.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--d-line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.imageUrl} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <span className="d-mono absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-[10px] text-[var(--d-ink-dim)] backdrop-blur">
              {i + 1}
            </span>
            <button type="button" onClick={() => handleDelete(img.id)}
              aria-label={`Hapus foto ${i + 1}`}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                stroke="#E08A8A" strokeWidth={2} aria-hidden>
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] text-[var(--d-ink-faint)] transition-colors hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.04)] ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="sr-only" onChange={handleUpload} disabled={uploading} />
            {uploading ? (
              <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--d-coral)] border-t-transparent" />
            ) : (
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
            <span className="d-mono text-[9.5px] uppercase tracking-[0.16em]">
              {uploading ? "Mengunggah…" : `Foto ${images.length + 1}`}
            </span>
          </label>
        )}
      </div>

      {error && (
        <p className="d-serif text-[12.5px] italic text-[var(--d-coral)]">{error}</p>
      )}

      <p className="d-mono text-center text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
        {images.length}/6 foto · JPG / PNG / WebP · max 5 MB per foto
      </p>
    </div>
  );
}

// ============================================================================
// Tanda Kasih — full editor lives at /dashboard/amplop; this section
// just confirms the toggle is on and deep-links the couple over there.
// ============================================================================

function AmplopForm() {
  return (
    <div className="space-y-5 rounded-[14px] border border-[var(--d-line)] bg-[var(--d-bg-2)]/40 p-5">
      <div>
        <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
          Tanda Kasih
        </p>
        <h3 className="d-serif mt-2 text-[20px] font-light leading-tight text-[var(--d-ink)]">
          Tamu bisa{" "}
          <em className="d-serif italic text-[var(--d-coral)]">menitipkan doa</em>{" "}
          dalam bentuk lain — langsung dari undangan.
        </h3>
        <p className="d-serif mt-2 text-[12.5px] italic leading-relaxed text-[var(--d-ink-dim)]">
          Buka jembatan pertama agar tamu bisa mengirimkan tanda kasih mereka.
          Setup rekening + lihat konfirmasi masuk di halaman Tanda Kasih.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/amplop"
          className="d-mono inline-flex items-center gap-2 rounded-full bg-[var(--d-coral)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0B0B15] transition-shadow hover:shadow-[0_10px_30px_rgba(240,160,156,0.3)]"
        >
          Kelola Jembatan Kasih →
        </Link>
        <span className="d-mono text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
          Aktifkan toggle di kiri agar section ini tampil di undangan.
        </span>
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

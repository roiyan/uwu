"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import {
  moveGuestToGroupAction,
  softDeleteGuestAction,
} from "@/lib/actions/guest";
import { downloadGuestTemplate } from "@/lib/utils/guest-template";
import { parseGuestFile, type ParseResult } from "@/lib/utils/guest-parser";
import { GuestFormDialog } from "./guest-form-dialog";
import { GroupsPanel } from "./groups-panel";
import { GuestImportModal } from "./guest-import-modal";
import type { GuestStatus } from "@/lib/db/queries/guests";

export type GuestRow = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  email: string | null;
  token: string;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  rsvpMessage: string | null;
  rsvpedAt: Date | null;
  openedAt: Date | null;
  invitedAt: Date | null;
  lastSentAt: Date | null;
  lastSentVia: string | null;
  createdAt: Date;
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
};

export type GuestGroupRow = {
  id: string;
  eventId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: Date;
};

const STATUS_LABEL: Record<GuestStatus, string> = {
  baru: "Baru",
  diundang: "Diundang",
  dibuka: "Dibuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
};

// Status pill styling against the dashboard dark palette. Each value
// is a Tailwind class string applied to a flex pill in the table cell.
const STATUS_PILL: Record<GuestStatus, string> = {
  baru: "bg-[rgba(237,232,222,0.04)] text-[var(--d-ink-dim)]",
  diundang:
    "bg-[rgba(143,163,217,0.10)] text-[var(--d-blue)]",
  dibuka:
    "bg-[rgba(184,157,212,0.10)] text-[var(--d-lilac)]",
  hadir:
    "bg-[rgba(126,211,164,0.12)] text-[var(--d-green)]",
  tidak_hadir:
    "bg-[rgba(240,160,156,0.12)] text-[var(--d-coral)]",
};

const STATUS_DOT: Record<GuestStatus, string> = {
  baru: "var(--d-ink-faint)",
  diundang: "var(--d-blue)",
  dibuka: "var(--d-lilac)",
  hadir: "var(--d-green)",
  tidak_hadir: "var(--d-coral)",
};

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "·";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function formatRelative(d: Date | null): string {
  if (!d) return "—";
  const now = Date.now();
  const t = d.getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GuestsClient({
  eventId,
  eventSlug,
  guests,
  groups,
  limit,
  packageName,
  totalLive,
  filter,
}: {
  eventId: string;
  eventSlug: string;
  guests: GuestRow[];
  groups: GuestGroupRow[];
  limit: number;
  packageName: string;
  totalLive: number;
  filter: { search: string; groupId: string | null; status: GuestStatus | null };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // Top-level view tab: "tamu" (default — group chips, toolbar, table)
  // or "ucapan" (a search/sort view of guests who left an RSVP message).
  // Driven by ?tab=ucapan so the Beranda Ucapan card can deep-link into it.
  const tab = params.get("tab") === "ucapan" ? "ucapan" : "tamu";

  // Ucapan-tab-only state. Lives at this level so reopening the tab
  // returns to the same scroll/sort the operator left it in within the
  // session.
  const [messageSearch, setMessageSearch] = useState("");
  const [messageSort, setMessageSort] = useState<"newest" | "oldest">(
    "newest",
  );
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );
  const toggleExpandMessage = (id: string) =>
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const guestsWithMessages = useMemo(
    () =>
      guests.filter(
        (g) => g.rsvpMessage && g.rsvpMessage.trim().length > 0,
      ),
    [guests],
  );

  const filteredMessages = useMemo(() => {
    let result = guestsWithMessages;
    if (messageSearch) {
      const q = messageSearch.toLowerCase();
      result = result.filter(
        (g) =>
          g.name?.toLowerCase().includes(q) ||
          g.nickname?.toLowerCase().includes(q) ||
          g.rsvpMessage?.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      const aTs = a.rsvpedAt ? new Date(a.rsvpedAt).getTime() : 0;
      const bTs = b.rsvpedAt ? new Date(b.rsvpedAt).getTime() : 0;
      return messageSort === "newest" ? bTs - aTs : aTs - bTs;
    });
  }, [guestsWithMessages, messageSearch, messageSort]);

  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  // When the user clicks "+ TAMBAH" inside a group header, we pass that
  // group's id into GuestFormDialog so the Grup dropdown opens to it.
  const [addPresetGroup, setAddPresetGroup] = useState<string | null>(null);
  const [editGuest, setEditGuest] = useState<GuestRow | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<GuestRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [templatePending, setTemplatePending] = useState(false);
  const [importModal, setImportModal] = useState<
    { fileName: string; result: ParseResult } | null
  >(null);
  const [parsing, setParsing] = useState(false);

  // Bulk-select state — additive; existing single-row actions continue
  // to work alongside it.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMovePending, setBulkMovePending] = useState(false);
  const [bulkMoveDropdown, setBulkMoveDropdown] = useState(false);

  // Detail drawer — opens on row click (excluding action buttons).
  // Reads only data we already have on GuestRow; no new server queries.
  const [drawerGuest, setDrawerGuest] = useState<GuestRow | null>(null);
  useEffect(() => {
    if (!drawerGuest) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerGuest(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerGuest]);

  // Grouped vs flat view: when no group filter is active, the list
  // collapses into per-group sections (each with its own header +
  // "+ TAMBAH" + "KIRIM GRUP" actions). When a specific group is
  // filtered, we drop back to a flat list showing only that group.
  const groupedView = !filter.groupId;

  type GroupSection = {
    key: string;
    group: GuestGroupRow | null; // null = "Tanpa Grup" bucket
    rows: GuestRow[];
  };

  const sections: GroupSection[] = useMemo(() => {
    if (!groupedView) return [];
    const byGroupId = new Map<string | null, GuestRow[]>();
    for (const g of guests) {
      const k = g.groupId ?? null;
      if (!byGroupId.has(k)) byGroupId.set(k, []);
      byGroupId.get(k)!.push(g);
    }
    const out: GroupSection[] = [];
    // Always include every group from the prop — even ones with zero
    // guests. Empty groups still render (with a dashed-border drop
    // zone) so the operator can see the group exists and drag a guest
    // into it.
    for (const grp of groups) {
      const rows = byGroupId.get(grp.id) ?? [];
      out.push({ key: grp.id, group: grp, rows });
    }
    const ungrouped = byGroupId.get(null);
    if (ungrouped && ungrouped.length > 0) {
      out.push({ key: "__ungrouped", group: null, rows: ungrouped });
    }
    return out;
  }, [guests, groups, groupedView]);

  // Stat pills sourced from the same guests array we already render.
  const stats = useMemo(() => {
    const c = {
      diundang: 0,
      dibuka: 0,
      hadir: 0,
      tidak_hadir: 0,
      menunggu: 0,
      paxTotal: 0,
    };
    for (const g of guests) {
      if (g.rsvpStatus !== "baru") c.diundang++;
      if (g.openedAt) c.dibuka++;
      if (g.rsvpStatus === "hadir") {
        c.hadir++;
        c.paxTotal += g.rsvpAttendees ?? 1;
      } else if (g.rsvpStatus === "tidak_hadir") c.tidak_hadir++;
      else c.menunggu++;
    }
    return c;
  }, [guests]);

  async function handleTemplateDownload() {
    if (templatePending) return;
    setTemplatePending(true);
    try {
      await downloadGuestTemplate(groups.map((g) => ({ name: g.name })));
      toast.success("Template terunduh");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengunduh template",
      );
    } finally {
      setTemplatePending(false);
    }
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    try {
      const result = await parseGuestFile(
        file,
        groups.map((g) => g.name),
      );
      if (result.valid.length === 0 && result.warnings.length === 0) {
        toast.error("File kosong atau format tidak dikenali");
        return;
      }
      setImportModal({ fileName: file.name, result });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca file");
    } finally {
      setParsing(false);
    }
  }

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`?${next.toString()}`));
  }

  const atLimit = totalLive >= limit;

  function copyInviteLink(guest: GuestRow) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${eventSlug}?to=${guest.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(guest.id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  async function confirmDelete() {
    if (!deleteGuest) return;
    setDeletePending(true);
    try {
      await softDeleteGuestAction(eventId, deleteGuest.id);
      setDeleteGuest(null);
    } finally {
      setDeletePending(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === guests.length) return new Set();
      return new Set(guests.map((g) => g.id));
    });
  }

  async function confirmBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkPending(true);
    try {
      // Walk one at a time — softDeleteGuestAction already returns
      // promptly and revalidates server state per call.
      for (const id of selectedIds) {
        await softDeleteGuestAction(eventId, id);
      }
      toast.success(`${selectedIds.size} tamu dihapus`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus sebagian tamu",
      );
    } finally {
      setBulkPending(false);
    }
  }

  // Bulk move — reuses moveGuestToGroupAction one guest at a time.
  // The server action revalidates after each call which is wasted
  // work for big batches, but the alternative (a dedicated bulk
  // endpoint) doubles the action surface for marginal benefit on
  // typical wedding sizes (≤500 guests).
  async function handleBulkMove(targetGroupId: string | null) {
    if (selectedIds.size === 0 || bulkMovePending) return;
    setBulkMoveDropdown(false);
    setBulkMovePending(true);
    const ids = Array.from(selectedIds);
    const targetName =
      groups.find((g) => g.id === targetGroupId)?.name ?? "Tanpa Grup";
    try {
      const results = await Promise.all(
        ids.map((id) =>
          moveGuestToGroupAction(eventId, id, targetGroupId),
        ),
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed === 0) {
        toast.success(`${ids.length} tamu dipindahkan ke ${targetName}`);
        setSelectedIds(new Set());
      } else if (failed < ids.length) {
        toast.error(
          `${ids.length - failed} berhasil, ${failed} gagal — coba lagi.`,
        );
      } else {
        toast.error(`Gagal memindahkan tamu.`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memindahkan sebagian tamu",
      );
    } finally {
      setBulkMovePending(false);
    }
  }

  // Close the move-group dropdown when the operator clicks anywhere
  // outside of it. Scoped to mounted dropdown only — no listener when
  // closed.
  useEffect(() => {
    if (!bulkMoveDropdown) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-bulk-move-root]")) {
        setBulkMoveDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [bulkMoveDropdown]);

  const allSelected = guests.length > 0 && selectedIds.size === guests.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // ----- Drag-and-drop reassignment (desktop, grouped view only) -----
  // The HTML5 DnD API gives us a free re-order without a third-party
  // library. We track which guest is being dragged so its row can dim,
  // and which group header is hovered so its row can light up. The
  // actual move runs through `moveGuestToGroupAction` which the server
  // gates with `withAuth("editor")`.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFromGroupId, setDraggingFromGroupId] = useState<
    string | null
  >(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Per-group collapse state. Default = all expanded (empty Set). The
  // Set holds the section key (group id, or "__ungrouped") of any
  // section the operator has chosen to collapse.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const isCollapsed = (key: string) => collapsedGroups.has(key);
  const toggleCollapsed = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  // Used by the auto-expand-on-hover affordance: when a guest is being
  // dragged over a collapsed header for ≥800ms, the section opens so
  // the operator can drop into it. Cleared on dragEnd / drop / leave.
  const expandGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };
  const autoExpandTimerRef = useRef<{
    key: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  function scheduleAutoExpand(key: string) {
    if (autoExpandTimerRef.current?.key === key) return;
    cancelAutoExpand();
    if (!isCollapsed(key)) return;
    const timer = setTimeout(() => {
      expandGroup(key);
      autoExpandTimerRef.current = null;
    }, 800);
    autoExpandTimerRef.current = { key, timer };
  }
  function cancelAutoExpand() {
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current.timer);
      autoExpandTimerRef.current = null;
    }
  }
  // Cancel any pending auto-expand if the component unmounts mid-drag.
  useEffect(() => {
    return () => cancelAutoExpand();
  }, []);

  // Touch-primary devices fire HTML5 drag events unreliably and don't
  // give the operator a way to start a drag with one finger. We mirror
  // CSS `(hover: hover)` so genuine pointer-equipped devices (laptops
  // with touchscreens included) keep DnD, while phones/tablets opt
  // out — those users move guests via the edit drawer instead.
  const [dndEnabled, setDndEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setDndEnabled(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDndEnabled(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  function handleRowDragStart(g: GuestRow, e: React.DragEvent) {
    setDraggingId(g.id);
    setDraggingFromGroupId(g.groupId);
    // Some browsers refuse to start a drag without any data set.
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", g.id);
  }

  function handleRowDragEnd() {
    setDraggingId(null);
    setDraggingFromGroupId(null);
    setDragOverKey(null);
    cancelAutoExpand();
  }

  async function handleHeaderDrop(targetKey: string, targetGroupId: string | null) {
    const guestId = draggingId;
    const fromGroupId = draggingFromGroupId;
    setDragOverKey(null);
    setDraggingId(null);
    setDraggingFromGroupId(null);
    cancelAutoExpand();
    if (!guestId) return;
    // Same group → silent no-op so the operator doesn't see a toast for
    // accidentally dropping back where they started.
    if (fromGroupId === targetGroupId) return;
    const targetName =
      groups.find((g) => g.id === targetGroupId)?.name ?? "Tanpa Grup";
    const guest = guests.find((g) => g.id === guestId);
    const res = await moveGuestToGroupAction(eventId, guestId, targetGroupId);
    if (res.ok) {
      toast.success(
        `${guest?.name ?? "Tamu"} dipindahkan ke ${targetName}`,
      );
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
    void targetKey;
  }

  return (
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px w-7 bg-[var(--d-coral)]"
            />
            <p className="d-eyebrow">Daftar Tamu</p>
          </div>
          <h1 className="d-serif mt-3.5 text-[clamp(36px,4.5vw,54px)] font-extralight leading-[1] tracking-[-0.025em] text-[var(--d-ink)]">
            Siapa yang akan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">hadir</em>?
          </h1>
          <p className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[var(--d-ink-dim)]">
            <span className="d-serif inline-flex items-center gap-2 text-[14px]">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--d-coral)] shadow-[0_0_8px_var(--d-coral)]"
              />
              {totalLive} dari {limit} kuota terisi
            </span>
            <span className="d-serif text-[14px] italic text-[var(--d-gold)]">
              — {Math.max(0, limit - totalLive)} kursi tersisa · {packageName}
            </span>
            {atLimit && (
              <span className="d-mono rounded-full bg-[rgba(240,160,156,0.12)] px-2 py-0.5 text-[10px] tracking-[0.18em] text-[var(--d-coral)]">
                BATAS TERCAPAI
              </span>
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-shrink-0 sm:flex-row sm:flex-wrap">
          <div className="flex flex-wrap gap-2.5">
            <HeaderBtn
              onClick={handleTemplateDownload}
              disabled={templatePending}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 11v6M9 14l3 3 3-3M5 21h14a2 2 0 002-2V8l-6-6H5a2 2 0 00-2 2v15a2 2 0 002 2zM14 2v6h6" />
              </svg>
              {templatePending ? "Menyiapkan…" : "Template"}
            </HeaderBtn>
            <HeaderBtn
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing || atLimit}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {parsing ? "Membaca…" : "Import Excel"}
            </HeaderBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFilePicked}
            />
            <HeaderBtn onClick={() => setGroupsOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              Kelola Grup
            </HeaderBtn>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddPresetGroup(null);
              setAddOpen(true);
            }}
            disabled={atLimit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-[18px] py-[11px] text-[13px] font-medium text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.24)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:w-auto"
            style={{
              background:
                "linear-gradient(115deg, var(--d-blue), var(--d-lilac) 50%, var(--d-coral))",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Tamu
          </button>
        </div>
      </header>

      {/* KPI strip — 5 connected cells with shared dividers */}
      <section
        className="relative mb-7 grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--d-line)] sm:grid-cols-3 lg:grid-cols-5"
        style={{
          background:
            "linear-gradient(135deg, #0F1020 0%, var(--d-bg-card) 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50 blur-[40px]"
          style={{
            background:
              "radial-gradient(circle, rgba(240,160,156,0.18), transparent 70%)",
          }}
        />
        <KpiCell
          label="Total Tamu"
          dot="var(--d-coral)"
          glow
          number={totalLive}
          suffix={`/${limit}`}
          foot={`${packageName} · ${Math.max(0, limit - totalLive)} sisa`}
        />
        <KpiCell
          label="Diundang"
          dot="var(--d-blue)"
          number={stats.diundang}
          foot={
            stats.diundang === 0
              ? "belum ada"
              : `${totalLive - stats.diundang} belum`
          }
        />
        <KpiCell
          label="Dibuka"
          dot="var(--d-lilac)"
          number={stats.dibuka}
          suffix={
            stats.diundang > 0
              ? `·${Math.round((stats.dibuka / stats.diundang) * 100)}%`
              : undefined
          }
          foot={
            stats.dibuka === 0
              ? "menunggu pertama"
              : `${stats.diundang - stats.dibuka} belum buka`
          }
        />
        <KpiCell
          label="Hadir (RSVP)"
          dot="var(--d-green)"
          number={stats.hadir}
          highlight
          foot={
            stats.paxTotal > 0
              ? `total ${stats.paxTotal} pax`
              : "menunggu konfirmasi"
          }
        />
        <KpiCell
          label="Tidak Hadir"
          dot="var(--d-coral)"
          number={stats.tidak_hadir}
          foot={`${stats.menunggu} belum merespons`}
        />
      </section>

      {/* Top-level view tabs: Tamu (default list) vs Ucapan (RSVP
          messages). The Ucapan tab is reachable via /dashboard/guests
          ?tab=ucapan from the Beranda Ucapan card. */}
      <section className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateParam("tab", null)}
          aria-pressed={tab === "tamu"}
          className={`d-mono rounded-full px-4 py-2 text-[10.5px] uppercase tracking-[0.18em] transition-colors ${
            tab === "tamu"
              ? "bg-[rgba(240,160,156,0.10)] text-[var(--d-coral)]"
              : "text-[var(--d-ink-faint)] hover:text-[var(--d-ink)]"
          }`}
        >
          Daftar Tamu
        </button>
        <button
          type="button"
          onClick={() => updateParam("tab", "ucapan")}
          aria-pressed={tab === "ucapan"}
          className={`d-mono inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10.5px] uppercase tracking-[0.18em] transition-colors ${
            tab === "ucapan"
              ? "bg-[rgba(240,160,156,0.10)] text-[var(--d-coral)]"
              : "text-[var(--d-ink-faint)] hover:text-[var(--d-ink)]"
          }`}
        >
          <span aria-hidden>💬</span>
          Ucapan
          {guestsWithMessages.length > 0 && (
            <span className="rounded-full bg-[rgba(240,160,156,0.14)] px-2 py-0.5 text-[9px] text-[var(--d-coral)]">
              {guestsWithMessages.length}
            </span>
          )}
        </button>
      </section>

      {tab === "ucapan" ? (
        <UcapanTabPanel
          messages={filteredMessages}
          totalMessages={guestsWithMessages.length}
          totalGuests={totalLive}
          search={messageSearch}
          onSearchChange={setMessageSearch}
          sort={messageSort}
          onSortChange={setMessageSort}
          expanded={expandedMessages}
          onToggleExpand={toggleExpandMessage}
        />
      ) : (
        <>

      {/* Group chips — horizontal scroll quick filter */}
      {groups.length > 0 && (
        <section className="-mx-5 mb-5 overflow-x-auto px-5 scrollbar-hide lg:mx-0 lg:px-0">
          <div className="inline-flex w-max items-center gap-2.5 border-b border-[var(--d-line)] pb-4">
            <GroupChip
              active={!filter.groupId}
              onClick={() => updateParam("group", null)}
              dot="var(--d-ink-faint)"
              label="Semua"
              count={totalLive}
            />
            {groups.map((g) => {
              const count = guests.filter((x) => x.groupId === g.id).length;
              return (
                <GroupChip
                  key={g.id}
                  active={filter.groupId === g.id}
                  onClick={() => updateParam("group", g.id)}
                  dot={g.color ?? "var(--d-gold)"}
                  label={g.name}
                  count={count}
                />
              );
            })}
            <button
              type="button"
              onClick={() => setGroupsOpen(true)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[var(--d-line-strong)] px-3.5 py-2 text-[12.5px] text-[var(--d-ink-faint)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
            >
              <span aria-hidden className="text-[14px] leading-none">+</span>
              Grup
            </button>
          </div>
        </section>
      )}

      {/* Toolbar — pill search + dropdown filters */}
      <section className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5 transition-colors focus-within:border-[var(--d-coral)] focus-within:bg-[rgba(240,160,156,0.04)]">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 shrink-0 text-[var(--d-ink-faint)]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Cari nama, no. HP, atau email…"
            defaultValue={filter.search}
            onChange={(e) => updateParam("q", e.target.value || null)}
            className="d-serif flex-1 bg-transparent text-[13px] italic text-[var(--d-ink)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)]"
          />
        </label>
        <FilterSelect
          value={filter.groupId ?? "all"}
          onChange={(v) => updateParam("group", v)}
        >
          <option value="all">Semua Grup</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filter.status ?? "all"}
          onChange={(v) => updateParam("status", v)}
        >
          <option value="all">Semua Status</option>
          {(Object.keys(STATUS_LABEL) as GuestStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </FilterSelect>
      </section>

      {guests.length === 0 ? (
        (() => {
          const filtering = Boolean(
            filter.search || filter.groupId || filter.status,
          );
          return (
            <EmptyState
              icon="✦"
              title={filtering ? "Belum ada yang cocok" : "Belum ada tamu"}
              description={
                filtering
                  ? "Coba ubah kata kunci, kelompok, atau status. Setiap tamu yang Anda tambahkan akan tampil di sini."
                  : "Tambah tamu satu per satu — atau import dari Excel. Setiap tamu otomatis menerima tautan undangan unik."
              }
              actionLabel={filtering ? undefined : "+ Tambah Tamu Pertama"}
              onAction={filtering ? undefined : () => setAddOpen(true)}
              note={filtering ? "Atau hapus filter di atas." : undefined}
            />
          );
        })()
      ) : (
        <>
          {/* Desktop view — single table; in grouped mode, group-header
              <tr>s are interleaved between guest rows of each section. */}
          <div className="hidden overflow-hidden rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--d-line)] bg-[rgba(255,255,255,0.015)]">
                    <th className="w-12 px-6 py-3.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={toggleSelectAll}
                        aria-label="Pilih semua"
                        className="h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
                      />
                    </th>
                    <Th>Nama</Th>
                    <Th>Grup</Th>
                    <Th>Kontak</Th>
                    <Th>Status</Th>
                    <Th>Hadir</Th>
                    <th className="px-6 py-3.5 text-right text-[9.5px] font-normal uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedView
                    ? sections.flatMap((s, sIdx) => {
                        const isOpen = !isCollapsed(s.key);
                        const headerEl = (
                          <GroupHeaderRow
                            key={`gh-${s.key}`}
                            section={s}
                            isFirst={sIdx === 0}
                            collapsed={!isOpen}
                            onToggleCollapsed={() => toggleCollapsed(s.key)}
                            onAdd={() => {
                              setAddPresetGroup(s.group?.id ?? null);
                              setAddOpen(true);
                            }}
                            isDropTarget={
                              draggingId !== null && dndEnabled
                            }
                            isDragOver={dragOverKey === s.key}
                            onDragEnter={() => {
                              setDragOverKey(s.key);
                              // Auto-expand a collapsed section when
                              // the operator hovers a dragged guest
                              // over its header for ≥800ms.
                              if (!isOpen) scheduleAutoExpand(s.key);
                            }}
                            onDragLeave={() => {
                              setDragOverKey((cur) =>
                                cur === s.key ? null : cur,
                              );
                              if (
                                autoExpandTimerRef.current?.key === s.key
                              ) {
                                cancelAutoExpand();
                              }
                            }}
                            onDrop={() =>
                              handleHeaderDrop(s.key, s.group?.id ?? null)
                            }
                          />
                        );
                        if (!isOpen) return [headerEl];
                        if (s.rows.length === 0) {
                          return [
                            headerEl,
                            <EmptyGroupRowDesktop
                              key={`empty-${s.key}`}
                              isDropTarget={
                                draggingId !== null && dndEnabled
                              }
                              isDragOver={dragOverKey === s.key}
                              onDragEnter={() => setDragOverKey(s.key)}
                              onDragLeave={() => {
                                setDragOverKey((cur) =>
                                  cur === s.key ? null : cur,
                                );
                              }}
                              onDrop={() =>
                                handleHeaderDrop(
                                  s.key,
                                  s.group?.id ?? null,
                                )
                              }
                            />,
                          ];
                        }
                        return [
                          headerEl,
                          ...s.rows.map((g, i) =>
                            renderDesktopRow(g, i, {
                              selectedIds,
                              copied,
                              setDrawerGuest,
                              setEditGuest,
                              setDeleteGuest,
                              toggleSelect,
                              copyInviteLink,
                              draggingId,
                              onRowDragStart: dndEnabled
                                ? handleRowDragStart
                                : undefined,
                              onRowDragEnd: dndEnabled
                                ? handleRowDragEnd
                                : undefined,
                            }),
                          ),
                        ];
                      })
                    : guests.map((g, i) =>
                        renderDesktopRow(g, i, {
                          selectedIds,
                          copied,
                          setDrawerGuest,
                          setEditGuest,
                          setDeleteGuest,
                          toggleSelect,
                          copyInviteLink,
                        }),
                      )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view — grouped sections OR flat list */}
          {groupedView ? (
            <div className="space-y-6 md:hidden">
              {sections.map((s) => {
                const isOpen = !isCollapsed(s.key);
                return (
                  <section key={`m-${s.key}`}>
                    <GroupHeaderMobile
                      section={s}
                      collapsed={!isOpen}
                      onToggleCollapsed={() => toggleCollapsed(s.key)}
                      onAdd={() => {
                        setAddPresetGroup(s.group?.id ?? null);
                        setAddOpen(true);
                      }}
                    />
                    {isOpen && (
                      <div className="mt-3 space-y-3">
                        {s.rows.length === 0 ? (
                          <EmptyGroupCardMobile />
                        ) : (
                          s.rows.map((g, i) =>
                            renderMobileCard(g, i, {
                              copied,
                              setDrawerGuest,
                              setEditGuest,
                              setDeleteGuest,
                              copyInviteLink,
                            }),
                          )
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 md:hidden">
              {guests.map((g, i) =>
                renderMobileCard(g, i, {
                  copied,
                  setDrawerGuest,
                  setEditGuest,
                  setDeleteGuest,
                  copyInviteLink,
                }),
              )}
            </div>
          )}
        </>
      )}
        </>
      )}

      {/* Sticky bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed inset-x-4 bottom-20 z-40 mx-auto flex w-fit max-w-full items-center gap-3.5 rounded-[14px] border border-[rgba(240,160,156,0.3)] px-[18px] py-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur lg:bottom-8"
          style={{
            background:
              "linear-gradient(115deg, rgba(143,163,217,0.1), rgba(184,157,212,0.1) 50%, rgba(240,160,156,0.12)), var(--d-bg-1)",
          }}
        >
          <p className="d-serif text-[15px] text-[var(--d-ink)]">
            <em className="d-serif italic text-[var(--d-coral)]">
              {selectedIds.size}
            </em>{" "}
            tamu dipilih
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setBulkMoveDropdown(false);
              }}
              className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-black/20 px-3.5 py-1.5 text-[11.5px] tracking-[0.04em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-black/40"
            >
              Batal
            </button>

            {/* Bulk move-group dropdown. Position: dropup so the menu
                opens above the floating bar instead of off-screen. The
                outside-click effect above closes it when the operator
                clicks anywhere except inside this root. */}
            <div className="relative" data-bulk-move-root>
              <button
                type="button"
                onClick={() => setBulkMoveDropdown((prev) => !prev)}
                disabled={bulkMovePending || groups.length === 0}
                aria-haspopup="menu"
                aria-expanded={bulkMoveDropdown}
                className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-black/20 px-3.5 py-1.5 text-[11.5px] tracking-[0.04em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-black/40 disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-3 w-3"
                >
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {bulkMovePending ? "Memindahkan…" : "Pindah Grup"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-3 w-3 transition-transform ${
                    bulkMoveDropdown ? "rotate-180" : ""
                  }`}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {bulkMoveDropdown && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
                >
                  <p className="d-mono border-b border-[var(--d-line)] px-3 py-2.5 text-[9px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                    Pindahkan {selectedIds.size} tamu ke
                  </p>
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {groups.map((g) => {
                      const count = guests.filter(
                        (x) => x.groupId === g.id,
                      ).length;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleBulkMove(g.id)}
                            disabled={bulkMovePending}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50"
                          >
                            <span
                              aria-hidden
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: g.color ?? "var(--d-ink-faint)",
                              }}
                            />
                            <span className="d-serif flex-1 truncate text-[13px] text-[var(--d-ink)]">
                              {g.name}
                            </span>
                            <span className="d-mono text-[10px] tracking-[0.06em] text-[var(--d-ink-faint)]">
                              {String(count).padStart(2, "0")}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    <li className="border-t border-[var(--d-line)]">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleBulkMove(null)}
                        disabled={bulkMovePending}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50"
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full bg-[var(--d-ink-faint)]"
                        />
                        <span className="d-serif flex-1 truncate text-[13px] italic text-[var(--d-ink-dim)]">
                          Tanpa grup
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkPending}
              className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[rgba(224,138,138,0.3)] bg-black/20 px-3.5 py-1.5 text-[11.5px] tracking-[0.04em] text-[var(--d-coral)] transition-colors hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.08)] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
              </svg>
              Hapus
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {drawerGuest && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${drawerGuest.name}`}
        >
          <button
            type="button"
            aria-label="Tutup detail"
            onClick={() => setDrawerGuest(null)}
            className="absolute inset-0 bg-black/55"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col overflow-hidden border-l border-[var(--d-line-strong)] bg-[var(--d-bg-1)] shadow-[-30px_0_80px_rgba(0,0,0,0.5)]">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-36 -top-36 h-[400px] w-[400px] rounded-full blur-[60px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(240,160,156,0.12), transparent 70%)",
              }}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between gap-3 border-b border-[var(--d-line)] px-7 py-5">
              <div className="flex flex-col gap-0.5">
                <p className="d-mono text-[9.5px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
                  Detail Tamu · #
                  {drawerGuest.id.replace(/-/g, "").slice(0, 5).toUpperCase()}
                </p>
                <p className="d-serif text-[18px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
                  Profil <em className="d-serif italic text-[var(--d-coral)]">tamu</em>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerGuest(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--d-line-strong)] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
                aria-label="Tutup"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-3.5 w-3.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto px-7 py-7">
              {/* Hero — avatar + name + status pill + pax */}
              <div className="mb-7 flex items-center gap-[18px]">
                <Avatar
                  name={drawerGuest.name}
                  index={hashIndex(drawerGuest.id)}
                  size={64}
                />
                <div className="min-w-0">
                  <h2 className="d-serif text-[26px] font-light leading-[1.1] tracking-[-0.018em] text-[var(--d-ink)]">
                    {drawerGuest.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--d-ink-dim)]">
                    <StatusPill status={drawerGuest.rsvpStatus} />
                    {drawerGuest.rsvpStatus === "hadir" &&
                      drawerGuest.rsvpAttendees && (
                        <span className="d-serif italic text-[var(--d-green)]">
                          {drawerGuest.rsvpAttendees} pax
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <DrawerSection title="Kontak">
                <DrawerRow label="No. WhatsApp" mono>
                  {drawerGuest.phone || (
                    <span className="text-[var(--d-ink-faint)]">—</span>
                  )}
                </DrawerRow>
                <DrawerRow label="Email" mono>
                  {drawerGuest.email || (
                    <span className="text-[var(--d-ink-faint)]">—</span>
                  )}
                </DrawerRow>
                <DrawerRow label="Grup">
                  {drawerGuest.groupName ? (
                    <GroupTag
                      name={drawerGuest.groupName}
                      color={drawerGuest.groupColor}
                    />
                  ) : (
                    <span className="text-[var(--d-ink-faint)]">—</span>
                  )}
                </DrawerRow>
                <DrawerRow label="Panggilan">
                  {drawerGuest.nickname || (
                    <span className="text-[var(--d-ink-faint)]">—</span>
                  )}
                </DrawerRow>
              </DrawerSection>

              {/* Link Undangan */}
              <DrawerSection title="Link Undangan">
                <InviteLinkCard
                  guest={drawerGuest}
                  eventSlug={eventSlug}
                  copied={copied === drawerGuest.id}
                  onCopy={() => copyInviteLink(drawerGuest)}
                  onWhatsAppToast={() =>
                    toast.success("Membuka WhatsApp…")
                  }
                  onMissingPhone={() =>
                    toast.error("Tamu belum punya nomor WhatsApp.")
                  }
                  onMissingEmail={() =>
                    toast.error("Tamu belum punya email.")
                  }
                />
              </DrawerSection>

              {/* Aktivitas timeline */}
              <DrawerSection title="Aktivitas">
                <ActivityTimeline guest={drawerGuest} />
              </DrawerSection>
            </div>

            {/* Footer actions */}
            <div className="relative flex gap-2.5 border-t border-[var(--d-line)] px-7 py-[18px]">
              <button
                type="button"
                onClick={() => {
                  const guest = drawerGuest;
                  setDrawerGuest(null);
                  setEditGuest(guest);
                }}
                className="d-mono flex-1 rounded-full border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-[11.5px] uppercase tracking-[0.18em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.08)]"
              >
                Edit Detail
              </button>
              <button
                type="button"
                onClick={() => {
                  const guest = drawerGuest;
                  // Prefer WhatsApp resend (works without server provider).
                  // Falls back to mailto when there's no phone but an email
                  // is present. If neither, surface a clear error.
                  const link = `${window.location.origin}/${eventSlug}?to=${guest.token}`;
                  const greeting = guest.nickname
                    ? `Halo ${guest.nickname}`
                    : `Halo ${guest.name}`;
                  if (guest.phone) {
                    const text = encodeURIComponent(
                      `${greeting}, ini link undangan kami: ${link}`,
                    );
                    const phone = guest.phone.replace(/[^\d]/g, "");
                    window.open(
                      `https://api.whatsapp.com/send?phone=${phone}&text=${text}`,
                      "_blank",
                    );
                    toast.success("Membuka WhatsApp untuk kirim ulang…");
                  } else if (guest.email) {
                    const subject = encodeURIComponent(
                      "Undangan Pernikahan",
                    );
                    const body = encodeURIComponent(
                      `${greeting},\n\nBerikut link undangan kami:\n${link}\n\nTerima kasih.`,
                    );
                    window.location.href = `mailto:${guest.email}?subject=${subject}&body=${body}`;
                    toast.success("Membuka email untuk kirim ulang…");
                  } else {
                    toast.error("Tidak ada kontak — tambahkan WA/email dulu.");
                  }
                }}
                className="d-mono flex-1 rounded-full bg-[linear-gradient(115deg,var(--d-blue),var(--d-lilac)_50%,var(--d-coral))] px-5 py-3 text-[11.5px] font-medium uppercase tracking-[0.18em] text-[#0B0B15] transition-transform hover:-translate-y-px"
              >
                Kirim Ulang
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Conditionally render — not just hide content — so the dialog
          unmounts on close and remounts fresh on open. The previous
          version was always-mounted and used `if (!open) return null`
          inside, which left useActionState's state ({ ok: true, ... })
          persisted across closes. On the next open the effect that
          calls onClose() when the action result is ok would fire
          again immediately, slamming the dialog shut before the
          operator could see the form. Conditional render guarantees
          a fresh useActionState hook on every open. */}
      {(addOpen || editGuest !== null) && (
        <GuestFormDialog
          open
          eventId={eventId}
          groups={groups}
          editing={editGuest}
          presetGroupId={addPresetGroup}
          onClose={() => {
            setAddOpen(false);
            setEditGuest(null);
            setAddPresetGroup(null);
          }}
        />
      )}

      <GroupsPanel
        open={groupsOpen}
        eventId={eventId}
        groups={groups}
        onClose={() => setGroupsOpen(false)}
      />

      <ConfirmDialog
        open={deleteGuest !== null}
        title="Hapus tamu?"
        description={
          deleteGuest
            ? `Tamu ${deleteGuest.name} akan dihapus. Data tersimpan 30 hari sebelum dihapus permanen.`
            : undefined
        }
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteGuest(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Hapus ${selectedIds.size} tamu?`}
        description="Semua tamu yang dipilih akan dihapus. Data tersimpan 30 hari sebelum dihapus permanen."
        loading={bulkPending}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      {importModal && (
        <GuestImportModal
          eventId={eventId}
          fileName={importModal.fileName}
          result={importModal.result}
          onClose={() => setImportModal(null)}
          onSuccess={({ imported, newGroups, warnings }) => {
            setImportModal(null);
            const suffix = newGroups.length
              ? ` · ${newGroups.length} grup baru dibuat`
              : "";
            toast.success(`${imported} tamu berhasil diimport${suffix}`);
            if (warnings > 0) {
              toast.error(`${warnings} baris memiliki peringatan`);
            }
          }}
        />
      )}
    </main>
  );
}

function UcapanTabPanel({
  messages,
  totalMessages,
  totalGuests,
  search,
  onSearchChange,
  sort,
  onSortChange,
  expanded,
  onToggleExpand,
}: {
  messages: GuestRow[];
  totalMessages: number;
  totalGuests: number;
  search: string;
  onSearchChange: (s: string) => void;
  sort: "newest" | "oldest";
  onSortChange: (s: "newest" | "oldest") => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="d-serif text-[22px] font-light tracking-[-0.015em] text-[var(--d-ink)]">
        Ucapan dari{" "}
        <em className="d-serif italic text-[var(--d-coral)]">tamu</em>
      </h2>
      <p className="d-serif mt-1 text-[12.5px] italic text-[var(--d-ink-faint)]">
        {totalMessages} ucapan dari {totalGuests} tamu
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[260px] flex-1 items-center gap-2.5 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5 transition-colors focus-within:border-[var(--d-coral)]">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 shrink-0 text-[var(--d-ink-faint)]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Cari nama atau isi ucapan…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="d-serif flex-1 bg-transparent text-[13px] italic text-[var(--d-ink)] outline-none placeholder:italic placeholder:text-[var(--d-ink-faint)]"
          />
        </label>
        <div className="d-mono inline-flex gap-0.5 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-[3px] text-[10px] uppercase tracking-[0.16em]">
          {(["newest", "oldest"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSortChange(s)}
              aria-pressed={sort === s}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                sort === s
                  ? "bg-[var(--d-coral)] text-[#0B0B15]"
                  : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
              }`}
            >
              {s === "newest" ? "Terbaru" : "Terlama"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] px-5 py-12 text-center">
            <p className="d-serif text-[14px] italic text-[var(--d-ink-dim)]">
              {search
                ? `Tidak ditemukan ucapan untuk "${search}"`
                : "Belum ada ucapan dari tamu."}
            </p>
          </div>
        ) : (
          messages.map((g) => {
            const isOpen = expanded.has(g.id);
            const dateLabel = g.rsvpedAt
              ? new Date(g.rsvpedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })
              : null;
            return (
              <article
                key={g.id}
                onClick={() => onToggleExpand(g.id)}
                className="cursor-pointer rounded-[14px] border border-[var(--d-line)] bg-[rgba(255,255,255,0.02)] px-5 py-4 transition-colors hover:border-[var(--d-line-strong)] hover:bg-[rgba(255,255,255,0.03)]"
              >
                <p
                  className={`d-serif text-[14px] italic leading-[1.6] text-[var(--d-ink)] ${
                    isOpen ? "" : "line-clamp-3"
                  }`}
                >
                  <span
                    aria-hidden
                    className="d-serif mr-1 align-text-top text-[18px] leading-none text-[var(--d-coral)] opacity-40"
                  >
                    &ldquo;
                  </span>
                  {g.rsvpMessage}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden
                    className="d-serif flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] italic"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--d-coral), var(--d-peach))",
                      color: "#0B0B15",
                    }}
                  >
                    {(g.name || "?")[0]}
                  </span>
                  <span className="text-[13px] text-[var(--d-ink-dim)]">
                    {g.nickname || g.name}
                  </span>
                  {g.groupName && (
                    <>
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{
                          background: g.groupColor ?? "var(--d-ink-faint)",
                        }}
                      />
                      <span className="d-mono text-[9px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                        {g.groupName}
                      </span>
                    </>
                  )}
                  {dateLabel && (
                    <>
                      <span className="text-[var(--d-ink-faint)]">·</span>
                      <span className="d-mono text-[9px] uppercase tracking-[0.14em] text-[var(--d-ink-faint)]">
                        {dateLabel}
                      </span>
                    </>
                  )}
                </div>
                {!isOpen &&
                  g.rsvpMessage &&
                  g.rsvpMessage.length > 120 && (
                    <p className="d-mono mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--d-coral)]">
                      Klik untuk baca selengkapnya →
                    </p>
                  )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function HeaderBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] bg-transparent px-[18px] py-[11px] text-[13px] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.03)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5"
    >
      {children}
    </button>
  );
}

function KpiCell({
  label,
  dot,
  number,
  suffix,
  foot,
  glow,
  highlight,
}: {
  label: string;
  dot: string;
  number: number;
  suffix?: string;
  foot?: string;
  glow?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="relative border-r border-b border-[var(--d-line)] px-5 py-5 last:border-r-0 lg:border-b-0 lg:px-6 lg:py-6">
      <p className="d-mono mb-2.5 flex items-center gap-2 text-[9.5px] uppercase tracking-[0.24em] text-[var(--d-ink-faint)]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: dot,
            boxShadow: glow ? `0 0 6px ${dot}` : undefined,
          }}
        />
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span
          className={`d-serif text-[32px] font-extralight leading-none tracking-[-0.02em] lg:text-[34px] ${
            highlight ? "italic text-[var(--d-coral)]" : "text-[var(--d-ink)]"
          }`}
        >
          {number}
        </span>
        {suffix && (
          <span className="text-[14px] text-[var(--d-ink-dim)]">{suffix}</span>
        )}
      </div>
      {foot && (
        <p className="d-mono mt-2 text-[10.5px] tracking-[0.06em] text-[var(--d-ink-dim)]">
          {foot}
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] py-2.5 pl-4 pr-9 text-[12.5px] text-[var(--d-ink)] outline-none transition-colors hover:border-[var(--d-line-strong)] focus:border-[var(--d-coral)]"
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-[70%] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[var(--d-ink-dim)]"
      />
    </div>
  );
}

function GroupChip({
  active,
  onClick,
  dot,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  dot: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] transition-colors ${
        active
          ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-ink)]"
          : "border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] text-[var(--d-ink-dim)] hover:border-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
      }`}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dot }}
      />
      {label}
      <span
        className={`d-mono rounded-[3px] px-1.5 py-px text-[10px] tracking-[0.06em] ${
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="d-mono px-6 py-3.5 text-left text-[9.5px] font-normal uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
      {children}
    </th>
  );
}

function IconAction({
  label,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "active";
  children: React.ReactNode;
}) {
  const isActive = tone === "active";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border transition-colors ${
        isActive
          ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.1)] text-[var(--d-coral)]"
          : "border-[var(--d-line)] bg-[rgba(255,255,255,0.03)] text-[var(--d-ink-faint)] hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.06)] hover:text-[var(--d-coral)]"
      } [&_svg]:h-[13px] [&_svg]:w-[13px]`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: GuestStatus }) {
  const dot = STATUS_DOT[status];
  // Subtle glow for active states (diundang, dibuka, hadir);
  // baru/tidak_hadir stay flat to feel less prominent.
  const glow = status === "diundang" || status === "dibuka" || status === "hadir";
  return (
    <span
      className={`d-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${STATUS_PILL[status]}`}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: dot,
          boxShadow: glow ? `0 0 6px ${dot}` : undefined,
        }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

function GroupTag({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11.5px] text-[var(--d-ink-dim)]">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color ?? "var(--d-gold)" }}
      />
      {name}
    </span>
  );
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, var(--d-coral), var(--d-peach))",
  "linear-gradient(135deg, var(--d-lilac), var(--d-blue))",
  "linear-gradient(135deg, var(--d-gold), var(--d-peach))",
  "linear-gradient(135deg, var(--d-green), var(--d-blue))",
];

// Stats line shown under each group header — counts by RSVP status of
// the rows inside that section. Returns "X TAMU · Y HADIR · Z BELUM
// MERESPONS"-style copy depending on which buckets are non-zero.
function summarizeSection(rows: GuestRow[]): string {
  let hadir = 0;
  let menunggu = 0;
  let tidak = 0;
  for (const r of rows) {
    if (r.rsvpStatus === "hadir") hadir++;
    else if (r.rsvpStatus === "tidak_hadir") tidak++;
    else menunggu++;
  }
  const parts: string[] = [`${String(rows.length).padStart(2, "0")} TAMU`];
  if (hadir > 0) parts.push(`${hadir} HADIR`);
  if (tidak > 0) parts.push(`${tidak} TIDAK HADIR`);
  if (menunggu > 0) parts.push(`${menunggu} BELUM MERESPONS`);
  return parts.join(" · ");
}

type RowHandlers = {
  selectedIds: Set<string>;
  copied: string | null;
  setDrawerGuest: (g: GuestRow) => void;
  setEditGuest: (g: GuestRow) => void;
  setDeleteGuest: (g: GuestRow) => void;
  toggleSelect: (id: string) => void;
  copyInviteLink: (g: GuestRow) => void;
  // Drag-and-drop wiring. `null`-able so the flat (filtered) view can
  // pass undefined and skip drag affordances entirely. The row uses
  // `draggingId` to dim itself while a drag is in progress.
  draggingId?: string | null;
  onRowDragStart?: (g: GuestRow, e: React.DragEvent) => void;
  onRowDragEnd?: () => void;
};

type CardHandlers = Omit<RowHandlers, "selectedIds" | "toggleSelect">;

// Stamps one desktop guest <tr>. Extracted so the same row markup can
// be rendered both inside group sections (with interleaved headers)
// and inside the flat single-group view.
function renderDesktopRow(g: GuestRow, i: number, h: RowHandlers) {
  const isSel = h.selectedIds.has(g.id);
  const draggable = Boolean(h.onRowDragStart);
  const isDragging = draggable && h.draggingId === g.id;
  return (
    <tr
      key={g.id}
      draggable={draggable || undefined}
      onDragStart={
        draggable
          ? (e) => {
              const target = e.target as HTMLElement;
              // Don't initiate a drag from interactive controls — the
              // checkbox and the row-action buttons should still work.
              if (target.closest("button,input,a")) {
                e.preventDefault();
                return;
              }
              h.onRowDragStart?.(g, e);
            }
          : undefined
      }
      onDragEnd={draggable ? h.onRowDragEnd : undefined}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button,input,a")) return;
        h.setDrawerGuest(g);
      }}
      className={`group/row relative border-b border-[var(--d-line)] transition-colors last:border-0 ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragging
          ? "opacity-40"
          : isSel
            ? "bg-[rgba(240,160,156,0.06)]"
            : "hover:bg-[rgba(255,255,255,0.018)]"
      }`}
    >
      {isSel && (
        <td className="absolute inset-y-0 left-0 w-[2px] bg-[var(--d-coral)] p-0" />
      )}
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSel}
          onChange={() => h.toggleSelect(g.id)}
          aria-label={`Pilih ${g.name}`}
          className="h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={g.name} index={i} />
          <div className="min-w-0">
            <p className="truncate text-[14px] text-[var(--d-ink)]">{g.name}</p>
            {g.openedAt && (
              <p className="d-mono mt-0.5 truncate text-[11px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                dibuka {formatRelative(g.openedAt)}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {g.groupName ? (
          <GroupTag name={g.groupName} color={g.groupColor} />
        ) : (
          <span className="text-[var(--d-ink-faint)]">—</span>
        )}
      </td>
      <td className="d-mono px-6 py-4 text-[11.5px] tracking-[0.02em] text-[var(--d-ink-dim)]">
        {g.phone || g.email || (
          <span className="text-[var(--d-ink-faint)]">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <StatusPill status={g.rsvpStatus} />
      </td>
      <td className="d-serif px-6 py-4 text-[14px] italic text-[var(--d-ink-dim)]">
        {g.rsvpStatus === "hadir" && g.rsvpAttendees ? (
          <span className="text-[var(--d-green)]">
            {g.rsvpAttendees}
            <span className="d-mono ml-1.5 text-[9.5px] not-italic tracking-[0.16em] text-[var(--d-ink-faint)]">
              PAX
            </span>
          </span>
        ) : g.rsvpStatus === "tidak_hadir" ? (
          <span className="text-[var(--d-coral)]">—</span>
        ) : (
          <span>—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover/row:opacity-100">
          <IconAction
            label={h.copied === g.id ? "Tersalin" : "Salin link"}
            onClick={() => h.copyInviteLink(g)}
            tone={h.copied === g.id ? "active" : "default"}
          >
            {h.copied === g.id ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </IconAction>
          <IconAction label="Edit" onClick={() => h.setEditGuest(g)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" />
            </svg>
          </IconAction>
          <IconAction label="Hapus" onClick={() => h.setDeleteGuest(g)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
            </svg>
          </IconAction>
        </div>
      </td>
    </tr>
  );
}

function renderMobileCard(g: GuestRow, i: number, h: CardHandlers) {
  return (
    <article
      key={g.id}
      onClick={() => h.setDrawerGuest(g)}
      className="d-card cursor-pointer p-4"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={g.name} index={i} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-[var(--d-ink)]">{g.name}</p>
          <p className="d-mono mt-0.5 truncate text-[11px] tracking-[0.02em] text-[var(--d-ink-dim)]">
            {g.phone || g.email || "—"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {g.groupName && (
              <GroupTag name={g.groupName} color={g.groupColor} />
            )}
            <StatusPill status={g.rsvpStatus} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-3 text-[11px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            h.copyInviteLink(g);
          }}
          className="d-mono uppercase tracking-[0.18em] text-[var(--d-coral)]"
        >
          {h.copied === g.id ? "Disalin ✓" : "Salin"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            h.setEditGuest(g);
          }}
          className="d-mono uppercase tracking-[0.18em] text-[var(--d-ink-dim)]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            h.setDeleteGuest(g);
          }}
          className="d-mono uppercase tracking-[0.18em] text-[var(--d-coral)]"
        >
          Hapus
        </button>
      </div>
    </article>
  );
}

// Group header row inside the desktop <table> — spans all 7 columns
// and shows the colored dot + group name + stats + per-group actions.
// Doubles as the drop target for the drag-and-drop reassign affordance:
// a guest dropped on this row gets `groupId` set to `section.group.id`
// (or null for the "Tanpa Grup" bucket).
function GroupHeaderRow({
  section,
  isFirst,
  collapsed,
  onToggleCollapsed,
  onAdd,
  isDropTarget,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  section: { group: GuestGroupRow | null; rows: GuestRow[]; key: string };
  isFirst: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAdd: () => void;
  isDropTarget?: boolean;
  isDragOver?: boolean;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
}) {
  const name = section.group?.name ?? "Tanpa Grup";
  const color = section.group?.color ?? "var(--d-ink-faint)";
  const messagesHref = section.group
    ? `/dashboard/messages?group=${section.group.id}`
    : "/dashboard/messages";
  return (
    <tr
      onDragOver={
        isDropTarget
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          : undefined
      }
      onDragEnter={isDropTarget ? onDragEnter : undefined}
      onDragLeave={isDropTarget ? onDragLeave : undefined}
      onDrop={
        isDropTarget
          ? (e) => {
              e.preventDefault();
              onDrop?.();
            }
          : undefined
      }
      className={`transition-colors ${
        isDragOver
          ? "bg-[rgba(240,160,156,0.10)] outline outline-1 outline-dashed outline-[var(--d-coral)] outline-offset-[-1px]"
          : "bg-[rgba(255,255,255,0.02)]"
      } ${
        isFirst
          ? ""
          : "border-t-[6px] border-t-[var(--d-bg-1)]"
      }`}
    >
      <td colSpan={7} className="px-6 py-3.5">
        <div
          className="flex flex-wrap items-center gap-3"
          onClick={(e) => {
            // Toggle collapse when the operator clicks anywhere on the
            // header chrome — except inside the action buttons or any
            // other interactive child (those stop their own bubbling
            // via stopPropagation below).
            const target = e.target as HTMLElement;
            if (target.closest("button,a,input,select,label")) return;
            onToggleCollapsed();
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapsed();
            }}
            aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
            aria-expanded={!collapsed}
            className="-ml-1 flex h-6 w-6 items-center justify-center rounded text-[var(--d-ink-faint)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--d-ink)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <h3 className="d-serif text-[15px] text-[var(--d-ink)]">
            {section.group ? (
              <>
                {name.split(" ")[0]}{" "}
                <em className="d-serif italic text-[var(--d-coral)]">
                  {name.split(" ").slice(1).join(" ") || ""}
                </em>
              </>
            ) : (
              <em className="d-serif italic text-[var(--d-ink-dim)]">{name}</em>
            )}
          </h3>
          <span className="d-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            {summarizeSection(section.rows)}
          </span>
          {isDragOver && (
            <span className="d-mono inline-flex items-center gap-1.5 rounded-full bg-[rgba(240,160,156,0.12)] px-2.5 py-0.5 text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
              ↓ Pindahkan ke sini
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.025)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
            >
              <span aria-hidden>+</span> Tambah
            </button>
            {section.group && (
              <Link
                href={messagesHref}
                className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.025)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
              >
                Kirim Grup
              </Link>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function GroupHeaderMobile({
  section,
  collapsed,
  onToggleCollapsed,
  onAdd,
}: {
  section: { group: GuestGroupRow | null; rows: GuestRow[]; key: string };
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAdd: () => void;
}) {
  const name = section.group?.name ?? "Tanpa Grup";
  const color = section.group?.color ?? "var(--d-ink-faint)";
  const messagesHref = section.group
    ? `/dashboard/messages?group=${section.group.id}`
    : "/dashboard/messages";
  return (
    <div className="rounded-xl border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
        aria-expanded={!collapsed}
        className="flex w-full flex-wrap items-center gap-2 text-left"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 text-[var(--d-ink-faint)] transition-transform duration-200 ${
            collapsed ? "-rotate-90" : "rotate-0"
          }`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <h3 className="d-serif text-[15px] text-[var(--d-ink)]">{name}</h3>
      </button>
      <p className="d-mono mt-1 text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
        {summarizeSection(section.rows)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.025)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
        >
          <span aria-hidden>+</span> Tambah
        </button>
        {section.group && (
          <Link
            href={messagesHref}
            className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.025)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
          >
            Kirim Grup
          </Link>
        )}
      </div>
    </div>
  );
}

// Renders inside the desktop guest <table> as a single full-width row
// when a section has zero guests. Doubles as a drop target for the
// drag-and-drop reassign affordance — drops here use the same
// `handleHeaderDrop` path as drops on the group header above.
function EmptyGroupRowDesktop({
  isDropTarget,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  isDropTarget?: boolean;
  isDragOver?: boolean;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
}) {
  return (
    <tr>
      <td colSpan={7} className="px-6 pb-3 pt-1">
        <div
          onDragOver={
            isDropTarget
              ? (e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              : undefined
          }
          onDragEnter={isDropTarget ? onDragEnter : undefined}
          onDragLeave={isDropTarget ? onDragLeave : undefined}
          onDrop={
            isDropTarget
              ? (e) => {
                  e.preventDefault();
                  onDrop?.();
                }
              : undefined
          }
          className={`d-serif rounded-xl border border-dashed px-4 py-7 text-center text-[13px] italic leading-relaxed transition-colors ${
            isDragOver
              ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
              : "border-[var(--d-line-strong)] bg-[var(--d-bg-card)] text-[var(--d-ink-faint)]"
          }`}
        >
          Belum ada tamu di grup ini.
          <br />
          <span className="d-mono mt-1.5 inline-block text-[10px] not-italic uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
            Drag tamu ke sini, atau klik + Tambah.
          </span>
        </div>
      </td>
    </tr>
  );
}

// Mobile counterpart — no DnD (touch devices opt out via dndEnabled),
// just a static empty placeholder.
function EmptyGroupCardMobile() {
  return (
    <div className="d-serif rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[var(--d-bg-card)] px-4 py-7 text-center text-[13px] italic leading-relaxed text-[var(--d-ink-faint)]">
      Belum ada tamu di grup ini.
      <br />
      <span className="d-mono mt-1.5 inline-block text-[10px] not-italic uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
        Klik + Tambah untuk menambahkan.
      </span>
    </div>
  );
}

function Avatar({
  name,
  index = 0,
  size = 40,
}: {
  name: string;
  index?: number;
  size?: number;
}) {
  return (
    <span
      className="d-serif flex shrink-0 items-center justify-center rounded-full italic text-[#0B0B15]"
      style={{
        height: size,
        width: size,
        fontSize: size * 0.4,
        letterSpacing: "-0.01em",
        background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
      }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

function InviteLinkCard({
  guest,
  eventSlug,
  copied,
  onCopy,
  onWhatsAppToast,
  onMissingPhone,
  onMissingEmail,
}: {
  guest: GuestRow;
  eventSlug: string;
  copied: boolean;
  onCopy: () => void;
  onWhatsAppToast: () => void;
  onMissingPhone: () => void;
  onMissingEmail: () => void;
}) {
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/${eventSlug}?to=${guest.token}`
      : `/${eventSlug}?to=${guest.token}`;

  function openWhatsApp() {
    if (!guest.phone) {
      onMissingPhone();
      return;
    }
    const greeting = guest.nickname
      ? `Halo ${guest.nickname}`
      : `Halo ${guest.name}`;
    const text = encodeURIComponent(
      `${greeting}, ini link undangan untuk Anda: ${link}`,
    );
    const phone = guest.phone.replace(/[^\d]/g, "");
    window.open(
      `https://api.whatsapp.com/send?phone=${phone}&text=${text}`,
      "_blank",
    );
    onWhatsAppToast();
  }

  function openEmail() {
    if (!guest.email) {
      onMissingEmail();
      return;
    }
    const greeting = guest.nickname
      ? `Halo ${guest.nickname}`
      : `Halo ${guest.name}`;
    const subject = encodeURIComponent("Undangan Pernikahan");
    const body = encodeURIComponent(
      `${greeting},\n\nBerikut link undangan kami:\n${link}\n\nTerima kasih.`,
    );
    window.location.href = `mailto:${guest.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div
      className="rounded-[12px] border border-[var(--d-line-strong)] p-[18px]"
      style={{
        background:
          "linear-gradient(115deg, rgba(143,163,217,0.06), rgba(184,157,212,0.06) 50%, rgba(240,160,156,0.08))",
      }}
    >
      <p className="d-mono mb-2.5 text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Link Personal · Trackable
      </p>
      <p className="d-mono mb-3 break-all rounded-lg border border-[var(--d-line)] bg-black/30 px-3 py-2.5 text-[11.5px] text-[var(--d-ink)]">
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className={`d-mono inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[11.5px] tracking-[0.04em] transition-colors ${
            copied
              ? "border-[var(--d-coral)] bg-[var(--d-coral)] text-[#0B0B15]"
              : "border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--d-ink)] hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.08)]"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? "Tersalin ✓" : "Salin Link"}
        </button>
        <button
          type="button"
          onClick={openWhatsApp}
          className="d-mono inline-flex items-center gap-1.5 rounded-lg border border-[rgba(126,211,164,0.3)] bg-[rgba(126,211,164,0.06)] px-3.5 py-2 text-[11.5px] tracking-[0.04em] text-[var(--d-green)] transition-colors hover:border-[var(--d-green)] hover:bg-[rgba(126,211,164,0.12)] disabled:opacity-50"
          disabled={!guest.phone}
          title={!guest.phone ? "Tamu belum punya nomor WhatsApp" : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          WhatsApp
        </button>
        <button
          type="button"
          onClick={openEmail}
          className="d-mono inline-flex items-center gap-1.5 rounded-lg border border-[rgba(143,163,217,0.3)] bg-[rgba(143,163,217,0.06)] px-3.5 py-2 text-[11.5px] tracking-[0.04em] text-[var(--d-blue)] transition-colors hover:border-[var(--d-blue)] hover:bg-[rgba(143,163,217,0.12)] disabled:opacity-50"
          disabled={!guest.email}
          title={!guest.email ? "Tamu belum punya email" : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
            <path d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7a2 2 0 012-2h14a2 2 0 012 2" />
          </svg>
          Email
        </button>
      </div>
    </div>
  );
}

type ActivityEvent = {
  date: Date;
  type: "rsvp" | "opened" | "invited" | "created";
  text: React.ReactNode;
  color: string;
};

function buildTimeline(guest: GuestRow): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  if (guest.rsvpedAt) {
    const status =
      guest.rsvpStatus === "hadir"
        ? "Hadir"
        : guest.rsvpStatus === "tidak_hadir"
          ? "Tidak hadir"
          : "Direspons";
    const att = guest.rsvpAttendees ?? 1;
    events.push({
      date: guest.rsvpedAt,
      type: "rsvp",
      color: "var(--d-coral)",
      text: (
        <>
          RSVP dikirim — {status}
          {guest.rsvpStatus === "hadir" ? ` untuk ${att} orang` : ""}.
          {guest.rsvpMessage && (
            <span className="d-serif mt-1 block italic text-[var(--d-ink-dim)]">
              &ldquo;{guest.rsvpMessage}&rdquo;
            </span>
          )}
        </>
      ),
    });
  }
  if (guest.openedAt) {
    events.push({
      date: guest.openedAt,
      type: "opened",
      color: "var(--d-lilac)",
      text: (
        <>
          Undangan dibuka
          {guest.lastSentVia ? ` via ${guest.lastSentVia}` : ""}.
        </>
      ),
    });
  }
  if (guest.invitedAt) {
    events.push({
      date: guest.invitedAt,
      type: "invited",
      color: "var(--d-blue)",
      text: (
        <>
          Undangan dikirim
          {guest.lastSentVia ? ` via ${guest.lastSentVia}` : ""}.
        </>
      ),
    });
  }
  events.push({
    date: guest.createdAt,
    type: "created",
    color: "var(--d-ink-faint)",
    text: <>Tamu ditambahkan ke daftar.</>,
  });
  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  return events;
}

function ActivityTimeline({ guest }: { guest: GuestRow }) {
  const events = buildTimeline(guest);
  if (events.length === 0) {
    return (
      <p className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
        Belum ada aktivitas.
      </p>
    );
  }
  return (
    <ol className="relative pl-5">
      <span
        aria-hidden
        className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--d-line-strong)]"
      />
      {events.map((e, i) => (
        <li key={i} className="relative pb-4 last:pb-0">
          <span
            aria-hidden
            className="absolute left-[-15px] top-2 h-[10px] w-[10px] rounded-full border-2"
            style={{
              background: i === 0 ? e.color : "var(--d-bg-1)",
              borderColor: e.color,
            }}
          />
          <p className="d-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
            {e.date
              .toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
              .replace(",", " ·")}
          </p>
          <div className="mt-1 text-[12.5px] leading-[1.5] text-[var(--d-ink-dim)]">
            {e.text}
          </div>
        </li>
      ))}
    </ol>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h3 className="d-mono mb-3.5 border-b border-[var(--d-line)] pb-2 text-[9.5px] uppercase tracking-[0.26em] text-[var(--d-ink-faint)]">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function DrawerRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3.5 py-[9px] text-[13px]">
      <dt className="shrink-0 text-[var(--d-ink-dim)]">{label}</dt>
      <dd
        className={`text-right text-[var(--d-ink)] ${
          mono
            ? "d-mono text-[11.5px] tracking-[0.04em]"
            : "d-serif"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

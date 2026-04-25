"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { softDeleteGuestAction } from "@/lib/actions/guest";
import { downloadGuestTemplate } from "@/lib/utils/guest-template";
import { parseGuestFile, type ParseResult } from "@/lib/utils/guest-parser";
import { GuestFormDialog } from "./guest-form-dialog";
import { GroupsPanel } from "./groups-panel";
import { GuestImportModal } from "./guest-import-modal";
import type { GuestStatus } from "@/lib/db/queries/guests";

export type GuestRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  token: string;
  rsvpStatus: GuestStatus;
  rsvpAttendees: number | null;
  rsvpedAt: Date | null;
  openedAt: Date | null;
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

  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
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

  const allSelected = guests.length > 0 && selectedIds.size === guests.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

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
        <div className="flex flex-shrink-0 flex-wrap gap-2.5">
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
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={atLimit}
            className="inline-flex items-center gap-2 rounded-full px-[18px] py-[11px] text-[13px] font-medium text-[#0B0B15] transition-transform hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(240,160,156,0.24)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
        <EmptyState
          icon="👥"
          title={
            filter.search || filter.groupId || filter.status
              ? "Tidak ada tamu cocok"
              : "Belum ada tamu"
          }
          description={
            filter.search || filter.groupId || filter.status
              ? "Coba ubah kata kunci pencarian atau filter."
              : "Tambah tamu satu per satu. Setiap tamu otomatis mendapat link undangan unik."
          }
          actionLabel="+ Tambah Tamu Pertama"
          actionHref="#"
        />
      ) : (
        <>
          {/* Desktop table */}
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
                  {guests.map((g, i) => {
                    const isSel = selectedIds.has(g.id);
                    return (
                      <tr
                        key={g.id}
                        onClick={(e) => {
                          // Ignore clicks coming from interactive elements
                          // inside the row (buttons, checkbox, links).
                          const target = e.target as HTMLElement;
                          if (target.closest("button,input,a")) return;
                          setDrawerGuest(g);
                        }}
                        className={`group/row relative cursor-pointer border-b border-[var(--d-line)] transition-colors last:border-0 ${
                          isSel
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
                            onChange={() => toggleSelect(g.id)}
                            aria-label={`Pilih ${g.name}`}
                            className="h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <Avatar name={g.name} index={i} />
                            <div className="min-w-0">
                              <p className="truncate text-[14px] text-[var(--d-ink)]">
                                {g.name}
                              </p>
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
                            <GroupTag
                              name={g.groupName}
                              color={g.groupColor}
                            />
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
                              label={
                                copied === g.id ? "Tersalin" : "Salin link"
                              }
                              onClick={() => copyInviteLink(g)}
                              tone={copied === g.id ? "active" : "default"}
                            >
                              {copied === g.id ? (
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
                            <IconAction
                              label="Edit"
                              onClick={() => setEditGuest(g)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" />
                              </svg>
                            </IconAction>
                            <IconAction
                              label="Hapus"
                              onClick={() => setDeleteGuest(g)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
                              </svg>
                            </IconAction>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {guests.map((g, i) => (
              <article
                key={g.id}
                onClick={() => setDrawerGuest(g)}
                className="d-card cursor-pointer p-4"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar name={g.name} index={i} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-[var(--d-ink)]">
                      {g.name}
                    </p>
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
                      copyInviteLink(g);
                    }}
                    className="d-mono uppercase tracking-[0.18em] text-[var(--d-coral)]"
                  >
                    {copied === g.id ? "Disalin ✓" : "Salin"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditGuest(g);
                    }}
                    className="d-mono uppercase tracking-[0.18em] text-[var(--d-ink-dim)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteGuest(g);
                    }}
                    className="d-mono uppercase tracking-[0.18em] text-[var(--d-coral)]"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
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
              onClick={() => setSelectedIds(new Set())}
              className="d-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--d-line-strong)] bg-black/20 px-3.5 py-1.5 text-[11.5px] tracking-[0.04em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-black/40"
            >
              Batal
            </button>
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
                  Detail Tamu
                </p>
                <p className="d-serif text-[18px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
                  Profil &amp; aktivitas
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
                  <p className="mt-1.5 flex items-center gap-2.5 text-[12px] text-[var(--d-ink-dim)]">
                    {drawerGuest.groupName ? (
                      <GroupTag
                        name={drawerGuest.groupName}
                        color={drawerGuest.groupColor}
                      />
                    ) : (
                      <span className="text-[var(--d-ink-faint)]">
                        Tanpa grup
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Invite link card */}
              <div
                className="mb-5 rounded-[12px] border border-[var(--d-line-strong)] p-[18px]"
                style={{
                  background:
                    "linear-gradient(115deg, rgba(143,163,217,0.06), rgba(184,157,212,0.06) 50%, rgba(240,160,156,0.08))",
                }}
              >
                <p className="d-mono mb-2.5 text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
                  Link Undangan
                </p>
                <p className="d-mono mb-3 break-all rounded-lg border border-[var(--d-line)] bg-black/30 px-3 py-2.5 text-[11.5px] text-[var(--d-ink)]">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /{eventSlug}?to={drawerGuest.token}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(drawerGuest)}
                    className={`d-mono inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[11.5px] tracking-[0.04em] transition-colors ${
                      copied === drawerGuest.id
                        ? "border-[var(--d-coral)] bg-[var(--d-coral)] text-[#0B0B15]"
                        : "border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--d-ink)] hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.08)]"
                    }`}
                  >
                    {copied === drawerGuest.id ? "Tersalin ✓" : "Salin link"}
                  </button>
                  <a
                    href={`/${eventSlug}?to=${drawerGuest.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="d-mono inline-flex items-center gap-1.5 rounded-lg border border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.04)] px-3.5 py-2 text-[11.5px] tracking-[0.04em] text-[var(--d-ink)] transition-colors hover:border-[var(--d-ink-dim)] hover:bg-[rgba(255,255,255,0.08)]"
                  >
                    Pratinjau ↗
                  </a>
                </div>
              </div>

              <DrawerSection title="RSVP">
                <DrawerRow label="Status">
                  <StatusPill status={drawerGuest.rsvpStatus} />
                </DrawerRow>
                <DrawerRow label="Jumlah hadir">
                  {drawerGuest.rsvpAttendees ?? "—"}
                </DrawerRow>
                <DrawerRow label="Direspons">
                  {formatRelative(drawerGuest.rsvpedAt)}
                </DrawerRow>
                <DrawerRow label="Dibuka link">
                  {formatRelative(drawerGuest.openedAt)}
                </DrawerRow>
              </DrawerSection>

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
                className="d-mono flex-1 rounded-full bg-[linear-gradient(115deg,var(--d-blue),var(--d-lilac)_50%,var(--d-coral))] px-5 py-3 text-[11.5px] font-medium uppercase tracking-[0.18em] text-[#0B0B15] transition-transform hover:-translate-y-px"
              >
                Edit Tamu
              </button>
              <button
                type="button"
                onClick={() => {
                  const guest = drawerGuest;
                  setDrawerGuest(null);
                  setDeleteGuest(guest);
                }}
                className="d-mono flex-1 rounded-full border border-[rgba(224,138,138,0.3)] bg-[rgba(0,0,0,0.2)] px-5 py-3 text-[11.5px] uppercase tracking-[0.18em] text-[var(--d-coral)] transition-colors hover:border-[var(--d-coral)] hover:bg-[rgba(240,160,156,0.06)]"
              >
                Hapus
              </button>
            </div>
          </aside>
        </div>
      )}

      <GuestFormDialog
        open={addOpen || editGuest !== null}
        eventId={eventId}
        groups={groups}
        editing={editGuest}
        onClose={() => {
          setAddOpen(false);
          setEditGuest(null);
        }}
      />

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

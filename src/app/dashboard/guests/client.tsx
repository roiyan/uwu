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
    const c = { hadir: 0, tidak_hadir: 0, menunggu: 0 };
    for (const g of guests) {
      if (g.rsvpStatus === "hadir") c.hadir++;
      else if (g.rsvpStatus === "tidak_hadir") c.tidak_hadir++;
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
              className="h-px w-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
              }}
            />
            <p className="d-eyebrow">Daftar Tamu</p>
          </div>
          <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
            Siapa yang akan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">hadir</em>?
          </h1>
          <p className="d-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            {totalLive} / {limit} tamu · {packageName}
            {atLimit && (
              <span className="ml-3 rounded-full bg-[rgba(240,160,156,0.12)] px-2 py-0.5 text-[10px] tracking-[0.18em] text-[var(--d-coral)]">
                BATAS TERCAPAI
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTemplateDownload}
            disabled={templatePending}
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] disabled:opacity-50"
          >
            {templatePending ? "Menyiapkan…" : "📥 Template"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || atLimit}
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)] disabled:opacity-50"
          >
            {parsing ? "Membaca…" : "📤 Import Excel"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFilePicked}
          />
          <button
            type="button"
            onClick={() => setGroupsOpen(true)}
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
          >
            🏷 Kelola Grup
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={atLimit}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-6 py-2.5 text-[12px] font-medium tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Tambah Tamu
          </button>
        </div>
      </header>

      {/* Stat pills */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Total Tamu"
          value={totalLive}
          accent="var(--d-coral)"
        />
        <StatPill
          label="Hadir"
          value={stats.hadir}
          accent="var(--d-green)"
        />
        <StatPill
          label="Tidak Hadir"
          value={stats.tidak_hadir}
          accent="var(--d-coral)"
        />
        <StatPill
          label="Menunggu Respons"
          value={stats.menunggu}
          accent="var(--d-blue)"
        />
      </section>

      {/* Search + filters */}
      <section className="mb-6 d-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Cari nama, no. HP, atau email..."
            defaultValue={filter.search}
            onChange={(e) => updateParam("q", e.target.value || null)}
            className="min-w-[240px] flex-1 rounded-md border border-[var(--d-line-strong)] bg-transparent px-4 py-2.5 text-[13px] text-[var(--d-ink)] outline-none transition-colors placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)]"
          />
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
        </div>

        {/* Group quick-filter chips — surfaces top groups without
            replacing the dropdown for power users. */}
        {groups.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => updateParam("group", null)}
              className={`d-mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                !filter.groupId
                  ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
                  : "border-[var(--d-line)] text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)]"
              }`}
            >
              Semua
            </button>
            {groups.slice(0, 6).map((g) => {
              const active = filter.groupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => updateParam("group", g.id)}
                  className={`d-mono inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                    active
                      ? "border-[var(--d-coral)] bg-[rgba(240,160,156,0.08)] text-[var(--d-coral)]"
                      : "border-[var(--d-line)] text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)]"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: g.color ?? "var(--d-gold)" }}
                  />
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
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
          <div className="hidden d-card overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--d-line)]">
                    <th className="w-10 px-4 py-3">
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
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => {
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
                        className={`cursor-pointer border-b border-[var(--d-line)] transition-colors last:border-0 ${
                          isSel
                            ? "bg-[rgba(240,160,156,0.04)]"
                            : "hover:bg-[rgba(237,232,222,0.025)]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelect(g.id)}
                            aria-label={`Pilih ${g.name}`}
                            className="h-4 w-4 cursor-pointer accent-[var(--d-coral)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={g.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--d-ink)]">
                                {g.name}
                              </p>
                              {g.openedAt && (
                                <p className="truncate text-[11px] text-[var(--d-ink-faint)]">
                                  Dibuka {formatRelative(g.openedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {g.groupName ? (
                            <GroupTag
                              name={g.groupName}
                              color={g.groupColor}
                            />
                          ) : (
                            <span className="text-[var(--d-ink-faint)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--d-ink-dim)]">
                          {g.phone || g.email || (
                            <span className="text-[var(--d-ink-faint)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={g.rsvpStatus} />
                        </td>
                        <td className="px-4 py-3 text-[var(--d-ink-dim)]">
                          {g.rsvpAttendees ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-3 text-[11px]">
                            <button
                              type="button"
                              onClick={() => copyInviteLink(g)}
                              className="d-mono uppercase tracking-[0.18em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
                            >
                              {copied === g.id ? "Disalin ✓" : "Salin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditGuest(g)}
                              className="d-mono uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteGuest(g)}
                              className="d-mono uppercase tracking-[0.18em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
                            >
                              Hapus
                            </button>
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
            {guests.map((g) => (
              <article
                key={g.id}
                onClick={() => setDrawerGuest(g)}
                className="d-card cursor-pointer p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={g.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--d-ink)]">
                      {g.name}
                    </p>
                    <p className="truncate text-[12px] text-[var(--d-ink-dim)]">
                      {g.phone || g.email || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
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
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit items-center gap-4 rounded-full border border-[var(--d-line-strong)] bg-[var(--d-bg-1)]/95 px-5 py-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur lg:bottom-8">
          <p className="d-mono text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)]">
            <em className="d-serif not-italic text-[var(--d-coral)]">
              {selectedIds.size}
            </em>{" "}
            tamu dipilih
          </p>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-ink)]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkPending}
            className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(240,160,156,0.4)] bg-[rgba(240,160,156,0.08)] px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:bg-[rgba(240,160,156,0.14)] disabled:opacity-50"
          >
            🗑 Hapus
          </button>
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside
            className="absolute inset-y-0 right-0 w-full max-w-[420px] overflow-y-auto border-l border-[var(--d-line)] bg-[var(--d-bg-1)] p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
                  Tamu
                </p>
                <h2 className="d-serif mt-2 text-[28px] font-extralight leading-tight text-[var(--d-ink)]">
                  {drawerGuest.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerGuest(null)}
                className="rounded-full border border-[var(--d-line-strong)] px-3 py-1 text-[14px] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
                aria-label="Tutup"
              >
                ✕
              </button>
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
              <DrawerRow label="No. WhatsApp">
                {drawerGuest.phone || (
                  <span className="text-[var(--d-ink-faint)]">—</span>
                )}
              </DrawerRow>
              <DrawerRow label="Email">
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
            </DrawerSection>

            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyInviteLink(drawerGuest)}
                className="d-mono inline-flex items-center gap-2 rounded-full border border-[var(--d-line-strong)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink)] transition-colors hover:bg-[var(--d-bg-2)]"
              >
                {copied === drawerGuest.id ? "Disalin ✓" : "Salin Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const guest = drawerGuest;
                  setDrawerGuest(null);
                  setEditGuest(guest);
                }}
                className="d-mono inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  const guest = drawerGuest;
                  setDrawerGuest(null);
                  setDeleteGuest(guest);
                }}
                className="d-mono inline-flex items-center gap-2 rounded-full border border-[rgba(240,160,156,0.4)] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:bg-[rgba(240,160,156,0.08)]"
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

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="d-card p-5">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="d-serif text-[36px] font-extralight leading-none text-[var(--d-ink)]">
          {value}
        </p>
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
      </div>
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-4 py-2.5 text-[13px] text-[var(--d-ink)] outline-none transition-colors focus:border-[var(--d-coral)]"
    >
      {children}
    </select>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
      {children}
    </th>
  );
}

function StatusPill({ status }: { status: GuestStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${STATUS_PILL[status]}`}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: STATUS_DOT[status] }}
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
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--d-line)] bg-[var(--d-bg-2)] px-2.5 py-1 text-[11px] text-[var(--d-ink)]">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color ?? "var(--d-gold)" }}
      />
      {name}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="d-serif flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-light text-[var(--d-coral)]"
      style={{
        background: "rgba(240, 160, 156, 0.10)",
        border: "1px solid rgba(240, 160, 156, 0.18)",
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
    <section className="mt-8 border-t border-[var(--d-line)] pt-6">
      <h3 className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
        {title}
      </h3>
      <dl className="mt-4 space-y-3">{children}</dl>
    </section>
  );
}

function DrawerRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <dt className="text-[var(--d-ink-dim)]">{label}</dt>
      <dd className="text-right text-[var(--d-ink)]">{children}</dd>
    </div>
  );
}

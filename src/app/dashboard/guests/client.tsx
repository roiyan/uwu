"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import {
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

const STATUS_VAR: Record<GuestStatus, string> = {
  baru: "var(--color-rsvp-baru)",
  diundang: "var(--color-rsvp-diundang)",
  dibuka: "var(--color-rsvp-dibuka)",
  hadir: "var(--color-rsvp-hadir)",
  tidak_hadir: "var(--color-rsvp-tidak-hadir)",
};

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
    // Reset input so selecting the same file twice still fires onChange.
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
      toast.error(
        err instanceof Error ? err.message : "Gagal membaca file",
      );
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

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-navy">Tamu</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalLive} dari {limit} tamu ({packageName}).
            {atLimit && (
              <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-dark">
                Batas tercapai
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTemplateDownload}
            disabled={templatePending}
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            {templatePending ? "Menyiapkan..." : "📥 Template"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || atLimit}
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            {parsing ? "Membaca..." : "📤 Import Excel"}
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
            className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            🏷 Grup
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={atLimit}
            className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark disabled:opacity-60"
          >
            + Tambah Tamu
          </button>
        </div>
      </header>

      <section className="mb-6 rounded-2xl bg-surface-card p-4 shadow-ghost-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Cari nama, no. HP, atau email..."
            defaultValue={filter.search}
            onChange={(e) => updateParam("q", e.target.value || null)}
            className="min-w-[240px] flex-1 rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2 text-sm outline-none focus:border-navy focus:shadow-[var(--focus-ring-navy)]"
          />
          <select
            value={filter.groupId ?? "all"}
            onChange={(e) => updateParam("group", e.target.value)}
            className="rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="all">Semua Grup</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={filter.status ?? "all"}
            onChange={(e) => updateParam("status", e.target.value)}
            className="rounded-lg border border-[color:var(--border-medium)] bg-white px-4 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="all">Semua Status</option>
            {(Object.keys(STATUS_LABEL) as GuestStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {guests.length === 0 ? (
        <EmptyState
          icon="👥"
          title={filter.search || filter.groupId || filter.status ? "Tidak ada tamu cocok" : "Belum ada tamu"}
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
          <div className="hidden overflow-hidden rounded-2xl bg-surface-card shadow-ghost-sm md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-hint">
                <tr className="border-b border-[color:var(--border-ghost)]">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Grup</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Hadir</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-b border-[color:var(--border-ghost)] last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                    <td className="px-4 py-3">
                      {g.groupName ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: g.groupColor ?? "var(--color-gold-50)",
                            color: "#1A1A2E",
                          }}
                        >
                          {g.groupName}
                        </span>
                      ) : (
                        <span className="text-ink-hint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {g.phone || g.email || <span className="text-ink-hint">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: STATUS_VAR[g.rsvpStatus] }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: STATUS_VAR[g.rsvpStatus] }}
                        />
                        {STATUS_LABEL[g.rsvpStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {g.rsvpAttendees ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(g)}
                          className="font-medium text-navy hover:underline"
                        >
                          {copied === g.id ? "Disalin ✓" : "Salin Link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditGuest(g)}
                          className="font-medium text-ink-muted hover:text-navy"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteGuest(g)}
                          className="font-medium text-ink-muted hover:text-rose"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {guests.map((g) => (
              <article
                key={g.id}
                className="rounded-2xl bg-surface-card p-4 shadow-ghost-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{g.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {g.phone || g.email || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {g.groupName && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px]"
                          style={{
                            background: g.groupColor ?? "var(--color-gold-50)",
                            color: "#1A1A2E",
                          }}
                        >
                          {g.groupName}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: STATUS_VAR[g.rsvpStatus] }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: STATUS_VAR[g.rsvpStatus] }}
                        />
                        {STATUS_LABEL[g.rsvpStatus]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(g)}
                    className="font-medium text-navy"
                  >
                    {copied === g.id ? "Disalin ✓" : "Salin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGuest(g)}
                    className="font-medium text-ink-muted"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteGuest(g)}
                    className="font-medium text-rose"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
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
    </>
  );
}

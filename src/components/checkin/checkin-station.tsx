"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import {
  checkinGuestAction,
  checkinGuestPublic,
  checkinWalkInAction,
  checkinWalkInPublic,
  undoCheckinAction,
  undoCheckinPublic,
  type CheckinPayload,
  type WalkInPayload,
} from "@/lib/actions/checkin";
import type {
  CheckedInGuestRow,
  CheckinStats,
  GroupCheckinBreakdown,
  RecentCheckinRow,
} from "@/lib/db/queries/checkin";
import {
  CheckinConfirmation,
  type ConfirmationGuest,
} from "./checkin-confirmation";
import { QrScanner, extractGuestToken } from "./qr-scanner";
import { WalkinForm } from "./walkin-form";

type Variant = "dashboard" | "public";

type Mode = "scan" | "search" | "walkin";

/**
 * Top-level operator surface for both the authenticated dashboard
 * (`/dashboard/checkin`) and the public station (`/check-in/[eventId]`).
 *
 * The `variant` prop drives two things:
 *   1. Which server actions get called — authenticated routes use the
 *      `withAuth("editor")`-wrapped versions; the public station uses
 *      the open versions that re-check `checkinEnabled` and resolve
 *      the guest by token (no session).
 *   2. The shared/social affordances. The public station is intended
 *      to run on a borrowed device handed to a non-owner, so we hide
 *      the "Salin Link Stasiun" button when `hideShare` is true.
 *
 * Three operating modes — Scan / Search / Walk-in — are tabs because
 * an operator typically settles into one mode for a stretch (e.g.
 * scan for the dinner crowd, walk-in for late arrivals) and we want
 * the muscle memory to stick.
 */
export function CheckinStation({
  eventId,
  invitationOrigin,
  invitationSlug,
  groups,
  guests: initialGuests,
  stats: initialStats,
  recent: initialRecent,
  breakdown: initialBreakdown,
  variant,
  defaultOperator,
  hideShare = false,
}: {
  eventId: string;
  invitationOrigin: string;
  invitationSlug: string;
  groups: { id: string; name: string }[];
  guests: CheckedInGuestRow[];
  stats: CheckinStats;
  recent: RecentCheckinRow[];
  breakdown: GroupCheckinBreakdown[];
  variant: Variant;
  defaultOperator: string;
  hideShare?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("scan");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmationGuest | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  // Re-fetch tick — bumped after each successful mutation so server-
  // streamed data invalidates and we get fresh stats / recent feed.
  // Using router.refresh() so we don't need to re-query client-side.
  const refresh = () => startTransition(() => router.refresh());

  // Prevent double-firing the same scan while the modal is open. The
  // QrScanner already debounces 2.5s per decoded value, but a paused
  // overlay during the confirmation flow makes intent clearer.
  const scannerPaused = busy || confirmTarget !== null;

  // --- Search index ----------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return initialGuests
      .filter((g) => {
        const hay = [g.name, g.nickname ?? "", g.phone ?? ""]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [search, initialGuests]);

  // --- Action wrappers -------------------------------------------------
  // Picking the right server action per `variant` keeps the component
  // ignorant of the auth posture — the dashboard and public station
  // share the same UX.

  async function runCheckin(
    target: ConfirmationGuest,
    payload: CheckinPayload,
  ) {
    setBusy(true);
    setActionError(null);
    try {
      const guestRow = initialGuests.find((g) => g.id === target.id);
      const token = guestRow?.token;
      const res =
        variant === "dashboard"
          ? await checkinGuestAction(eventId, target.id, payload)
          : token
            ? await checkinGuestPublic(eventId, token, payload)
            : { ok: false as const, error: "Tamu tidak ditemukan." };
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(`✓ ${target.name} sudah dicatat hadir.`);
      setConfirmTarget(null);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runUndo(target: ConfirmationGuest) {
    setBusy(true);
    setActionError(null);
    try {
      const res =
        variant === "dashboard"
          ? await undoCheckinAction(eventId, target.id)
          : await undoCheckinPublic(eventId, target.id);
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(`Check-in untuk ${target.name} dibatalkan.`);
      setConfirmTarget(null);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runWalkIn(payload: WalkInPayload) {
    setBusy(true);
    try {
      const res =
        variant === "dashboard"
          ? await checkinWalkInAction(eventId, payload)
          : await checkinWalkInPublic(eventId, payload);
      if (!res.ok) {
        toast.error(res.error);
        throw new Error(res.error);
      }
      toast.success(`✓ ${payload.name} dicatat sebagai walk-in.`);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  // --- Scan handler ----------------------------------------------------
  function handleScan(decoded: string) {
    if (busy || confirmTarget) return;
    const token = extractGuestToken(decoded);
    if (!token) {
      toast.error("QR tidak dikenali. Coba lagi atau pakai mode Cari.");
      return;
    }
    const match = initialGuests.find((g) => g.token === token);
    if (!match) {
      toast.error("Tamu tidak ditemukan untuk acara ini.");
      return;
    }
    setConfirmTarget(toConfirmationGuest(match));
  }

  // Open confirmation when the operator taps a search result.
  function handleSearchPick(row: CheckedInGuestRow) {
    setConfirmTarget(toConfirmationGuest(row));
  }

  // Reset action error when the modal closes so it doesn't reappear
  // on the next open.
  useEffect(() => {
    if (!confirmTarget) setActionError(null);
  }, [confirmTarget]);

  // --- Render ----------------------------------------------------------

  return (
    <div className="theme-dashboard grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
      {/* Left column: mode tabs + the active surface */}
      <section>
        <ModeTabs mode={mode} onChange={setMode} />

        <div className="mt-5">
          {mode === "scan" && (
            <ScanPanel
              onScan={handleScan}
              paused={scannerPaused}
              shareUrl={
                hideShare ? null : `${invitationOrigin}/check-in/${eventId}`
              }
              invitationSlug={invitationSlug}
            />
          )}
          {mode === "search" && (
            <SearchPanel
              query={search}
              onQuery={setSearch}
              results={filtered}
              onPick={handleSearchPick}
              empty={initialGuests.length === 0}
            />
          )}
          {mode === "walkin" && (
            <WalkinForm
              groups={groups}
              defaultOperator={defaultOperator}
              onSubmit={runWalkIn}
              busy={busy}
              onCancel={() => setMode("scan")}
            />
          )}
        </div>
      </section>

      {/* Right column: live counter + recent feed + group breakdown */}
      <aside className="space-y-5">
        <StatsCard stats={initialStats} />
        <RecentCard rows={initialRecent} />
        <BreakdownCard groups={initialBreakdown} />
      </aside>

      <CheckinConfirmation
        open={confirmTarget !== null}
        guest={confirmTarget}
        defaultOperator={defaultOperator}
        busy={busy}
        error={actionError}
        onConfirm={(payload) => {
          if (!confirmTarget) return Promise.resolve();
          return runCheckin(confirmTarget, payload);
        }}
        onUndo={
          confirmTarget?.checkedInAt
            ? () => {
                if (!confirmTarget) return Promise.resolve();
                return runUndo(confirmTarget);
              }
            : undefined
        }
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function toConfirmationGuest(row: CheckedInGuestRow): ConfirmationGuest {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    groupName: row.groupName,
    rsvpStatus: row.rsvpStatus,
    rsvpAttendees: row.rsvpAttendees,
    checkedInAt: row.checkedInAt,
    actualPax: row.actualPax,
  };
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const tabs: { id: Mode; label: string; hint: string }[] = [
    { id: "scan", label: "Scan QR", hint: "Pindai kode dari undangan tamu" },
    { id: "search", label: "Cari Nama", hint: "Cari di daftar tamu" },
    { id: "walkin", label: "Walk-in", hint: "Tamu di luar undangan" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Mode check-in"
      className="d-mono inline-flex flex-wrap gap-1 rounded-full border border-[var(--d-line)] bg-[rgba(255,255,255,0.025)] p-1 text-[10.5px] uppercase tracking-[0.18em]"
    >
      {tabs.map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={t.hint}
            onClick={() => onChange(t.id)}
            className={`rounded-full px-4 py-2 transition-colors ${
              active
                ? "bg-[var(--d-coral)] text-[#0B0B15]"
                : "text-[var(--d-ink-dim)] hover:text-[var(--d-ink)]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ScanPanel({
  onScan,
  paused,
  shareUrl,
  invitationSlug,
}: {
  onScan: (decoded: string) => void;
  paused: boolean;
  shareUrl: string | null;
  invitationSlug: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Scan Kode QR
      </p>
      <h3 className="d-serif mt-2 text-[22px] font-extralight leading-tight text-[var(--d-ink)]">
        Arahkan kamera ke{" "}
        <em className="d-serif italic text-[var(--d-coral)]">undangan</em>{" "}
        tamu.
      </h3>
      <p className="mt-2 max-w-[44ch] text-[12.5px] leading-relaxed text-[var(--d-ink-dim)]">
        Tamu yang sudah RSVP &ldquo;Hadir&rdquo; mendapat QR di halaman undangan
        mereka — pindai untuk konfirmasi kehadiran. Acara: <code className="d-mono text-[11px] text-[var(--d-ink)]">/{invitationSlug}</code>
      </p>

      <div className="mt-5 max-w-md">
        <QrScanner onScan={onScan} paused={paused} />
      </div>

      {shareUrl && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--d-line)] bg-[var(--d-bg-card)] px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--d-ink)]">
              Bagikan akses check-in ke penerima tamu
            </p>
            <p className="d-serif mt-0.5 text-[11px] italic text-[var(--d-ink-faint)]">
              Buat link + PIN aman di Pengaturan
            </p>
          </div>
          <Link
            href="/dashboard/settings?tab=preferensi#operator-link"
            className="d-mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(240,160,156,0.25)] bg-[rgba(240,160,156,0.08)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--d-coral)] transition-colors hover:bg-[rgba(240,160,156,0.14)]"
          >
            Buka Pengaturan →
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchPanel({
  query,
  onQuery,
  results,
  onPick,
  empty,
}: {
  query: string;
  onQuery: (q: string) => void;
  results: CheckedInGuestRow[];
  onPick: (row: CheckedInGuestRow) => void;
  empty: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6 lg:p-7">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Cari Nama
      </p>
      <h3 className="d-serif mt-2 text-[22px] font-extralight leading-tight text-[var(--d-ink)]">
        Ketik nama atau{" "}
        <em className="d-serif italic text-[var(--d-coral)]">nomor</em>.
      </h3>

      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="cari tamu…"
        autoFocus
        className="mt-5 w-full rounded-full border border-[var(--d-line-strong)] bg-[var(--d-bg-2)] px-4 py-3 text-[14px] text-[var(--d-ink)] outline-none transition-colors placeholder:text-[var(--d-ink-faint)] focus:border-[var(--d-coral)]"
      />

      {empty ? (
        <p className="mt-6 text-[13px] text-[var(--d-ink-dim)]">
          Belum ada tamu di daftar — buka halaman Tamu untuk menambah.
        </p>
      ) : query.trim() === "" ? (
        <p className="mt-6 text-[13px] text-[var(--d-ink-dim)]">
          Mulai mengetik untuk mencari tamu.
        </p>
      ) : results.length === 0 ? (
        <p className="mt-6 text-[13px] text-[var(--d-ink-dim)]">
          Tidak ada tamu cocok dengan{" "}
          <span className="d-serif italic text-[var(--d-coral)]">{query}</span>.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--d-line)]">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onPick(row)}
                className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.018)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-[var(--d-ink)]">
                    {row.name}
                  </span>
                  <span className="d-mono mt-0.5 block truncate text-[11px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                    {row.groupName ?? "—"}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </span>
                </span>
                {row.checkedInAt ? (
                  <span className="d-mono shrink-0 rounded-full bg-[rgba(126,211,164,0.12)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--d-green)]">
                    Hadir
                  </span>
                ) : (
                  <span aria-hidden className="text-[var(--d-ink-faint)]">
                    →
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatsCard({ stats }: { stats: CheckinStats }) {
  return (
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Live Counter
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="d-serif text-[44px] font-extralight leading-none text-[var(--d-ink)]">
          {stats.checkedIn}
        </span>
        <span className="text-[14px] text-[var(--d-ink-dim)]">
          / {stats.totalGuests} tamu
        </span>
      </div>
      <p className="d-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
        {stats.totalPax} pax · {stats.walkIns} walk-in · {stats.belumTiba} belum tiba
      </p>
    </div>
  );
}

function RecentCard({ rows }: { rows: RecentCheckinRow[] }) {
  return (
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Baru Tiba
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--d-ink-dim)]">
          Belum ada tamu yang check-in.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[var(--d-ink)]">
                  {r.name}
                </span>
                {r.groupName && (
                  <span className="d-mono mt-0.5 block truncate text-[10px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                    {r.groupName}
                  </span>
                )}
              </span>
              <span className="d-mono shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                {new Date(r.checkedInAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BreakdownCard({ groups }: { groups: GroupCheckinBreakdown[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
        Breakdown Grup
      </p>
      <ul className="mt-4 space-y-3">
        {groups.map((g) => {
          const pct =
            g.total > 0 ? Math.round((g.checkedIn / g.total) * 100) : 0;
          return (
            <li key={g.id} className="text-[12.5px]">
              <div className="flex items-center justify-between gap-2 text-[var(--d-ink)]">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: g.color ?? "var(--d-gold)" }}
                  />
                  <span className="truncate">{g.name}</span>
                </span>
                <span className="d-mono shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
                  {g.checkedIn}/{g.total}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: g.color ?? "var(--d-gold)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

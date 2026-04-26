"use client";

import { PinGate } from "@/components/checkin/pin-gate";
import { CheckinStation } from "@/components/checkin/checkin-station";
import type {
  CheckedInGuestRow,
  CheckinStats,
  GroupCheckinBreakdown,
  RecentCheckinRow,
} from "@/lib/db/queries/checkin";

/**
 * Thin client wrapper around <PinGate>. The page itself is a Server
 * Component (data fetching happens there) but PinGate's render-prop
 * children can't be authored in a server component — closures aren't
 * serializable across the RSC boundary. This component owns the
 * function child + the operator-aware header.
 */
export function PublicStationShell({
  eventId,
  token,
  eventTitle,
  invitationOrigin,
  invitationSlug,
  groups,
  guests,
  stats,
  recent,
  breakdown,
}: {
  eventId: string;
  token: string | null;
  eventTitle: string;
  invitationOrigin: string;
  invitationSlug: string;
  groups: { id: string; name: string }[];
  guests: CheckedInGuestRow[];
  stats: CheckinStats;
  recent: RecentCheckinRow[];
  breakdown: GroupCheckinBreakdown[];
}) {
  return (
    <PinGate eventId={eventId} token={token} eventTitle={eventTitle}>
      {(operatorName, onSignOut) => (
        <main
          className="theme-dashboard min-h-screen"
          style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
        >
          <header
            className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--d-line)] px-5 py-6 lg:px-10"
            style={{ background: "var(--d-bg-1)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-px w-8"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
                  }}
                />
                <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-coral)]">
                  Stasiun Check-in
                </p>
              </div>
              <h1 className="d-serif mt-3 text-[26px] font-extralight leading-[1.1] text-[var(--d-ink)] md:text-[36px]">
                {eventTitle}
              </h1>
              {operatorName && (
                <p className="d-mono mt-2 text-[10.5px] uppercase tracking-[0.24em] text-[var(--d-ink-dim)]">
                  Bertugas:{" "}
                  <span className="text-[var(--d-coral)]">{operatorName}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="d-mono shrink-0 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
            >
              Keluar
            </button>
          </header>
          <div className="px-5 pb-12 lg:px-10">
            <CheckinStation
              eventId={eventId}
              invitationOrigin={invitationOrigin}
              invitationSlug={invitationSlug}
              groups={groups}
              guests={guests}
              stats={stats}
              recent={recent}
              breakdown={breakdown}
              variant="public"
              defaultOperator={operatorName}
              hideShare
            />
          </div>
        </main>
      )}
    </PinGate>
  );
}

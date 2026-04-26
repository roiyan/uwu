"use client";

import type { ComponentProps } from "react";
import { OperatorPinGate } from "@/components/checkin/operator-pin-gate";
import { CheckinStation } from "@/components/checkin/checkin-station";

type StationProps = ComponentProps<typeof CheckinStation>;

export function PublicCheckinClient({
  eventId,
  token,
  eventTitle,
  stationProps,
}: {
  eventId: string;
  token: string | null;
  eventTitle: string;
  stationProps: StationProps;
}) {
  return (
    <OperatorPinGate eventId={eventId} token={token} eventTitle={eventTitle}>
      {(handleSignOut) => (
        <>
          <PublicHeader eventTitle={eventTitle} onSignOut={handleSignOut} />
          <div className="px-5 pb-12 lg:px-10">
            <CheckinStation {...stationProps} />
          </div>
        </>
      )}
    </OperatorPinGate>
  );
}

function PublicHeader({
  eventTitle,
  onSignOut,
}: {
  eventTitle: string;
  onSignOut: () => void;
}) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--d-line)] px-5 py-6 lg:px-10"
      style={{ background: "var(--d-bg-1)" }}
    >
      <div className="min-w-0 flex-1">
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
        <p className="mt-2 max-w-[58ch] text-[12px] leading-relaxed text-[var(--d-ink-dim)] md:text-[13px]">
          Setiap tamu yang Anda sambut adalah hadiah hari ini.
        </p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="d-mono shrink-0 rounded-full border border-[var(--d-line-strong)] px-4 py-2 text-[10.5px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]"
      >
        Keluar
      </button>
    </header>
  );
}

import { notFound } from "next/navigation";
import { listGuestGroups } from "@/lib/db/queries/guests";
import {
  getCheckinEventGate,
  getCheckinStats,
  getGroupCheckinBreakdown,
  listGuestsForCheckin,
  listRecentCheckins,
} from "@/lib/db/queries/checkin";
import { CheckinStation } from "@/components/checkin/checkin-station";

export const dynamic = "force-dynamic";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Public operator station: anyone with the eventId UUID can scan/search
// guests in. Authorization is by possession of the link (the UUID is
// non-guessable). The owner can revoke by toggling check-in off in
// Pengaturan, which makes assertCheckinEnabled fail in the actions.
export default async function PublicCheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const gate = await getCheckinEventGate(eventId);
  if (!gate) notFound();

  if (!gate.checkinEnabled) {
    return (
      <main
        className="theme-dashboard min-h-screen px-5 py-12"
        style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--d-line)] bg-[var(--d-bg-card)] p-8 text-center md:p-12">
          <p className="d-mono text-[10px] uppercase tracking-[0.32em] text-[var(--d-gold)]">
            Stasiun Tertutup
          </p>
          <h1 className="d-serif mt-5 text-[28px] font-extralight leading-[1.2] text-[var(--d-ink)] md:text-[36px]">
            Pintu penyambutan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">
              belum dibuka.
            </em>
          </h1>
          <p className="mx-auto mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[var(--d-ink-dim)]">
            Mempelai belum mengaktifkan check-in digital, atau acara sudah
            selesai. Hubungi pasangan untuk konfirmasi.
          </p>
        </div>
      </main>
    );
  }

  const [stats, guests, groupRows, recent, breakdown] = await Promise.all([
    getCheckinStats(eventId),
    listGuestsForCheckin(eventId),
    listGuestGroups(eventId),
    listRecentCheckins(eventId, 10),
    getGroupCheckinBreakdown(eventId),
  ]);

  return (
    <main
      className="theme-dashboard min-h-screen"
      style={{ background: "var(--d-bg-0)", color: "var(--d-ink)" }}
    >
      <PublicHeader eventTitle={gate.title} />
      <div className="px-5 pb-12 lg:px-10">
        <CheckinStation
          eventId={eventId}
          invitationOrigin={appUrl()}
          invitationSlug={gate.slug}
          groups={groupRows.map((g) => ({ id: g.id, name: g.name }))}
          guests={guests}
          stats={stats}
          recent={recent}
          breakdown={breakdown}
          variant="public"
          defaultOperator=""
          hideShare
        />
      </div>
    </main>
  );
}

function PublicHeader({ eventTitle }: { eventTitle: string }) {
  return (
    <header
      className="border-b border-[var(--d-line)] px-5 py-6 lg:px-10"
      style={{ background: "var(--d-bg-1)" }}
    >
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
    </header>
  );
}

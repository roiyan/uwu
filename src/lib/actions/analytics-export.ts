"use server";

import { withAuth, type ActionResult } from "@/lib/auth-guard";
import { getEventBundle } from "@/lib/db/queries/events";
import {
  countLiveGuests,
  getEventPackageLimit,
  getOpenHeatmap,
  getResponseFunnel,
  listGuestsForEvent,
  sumAttendees,
} from "@/lib/db/queries/guests";

/**
 * Snapshot of event analytics + the full guest list, shaped for the
 * three client-side exporters (Excel/PDF/PNG). One server round-trip
 * regardless of which format the operator picks.
 *
 * Auth is `viewer` because exports are read-only. The query fan-out
 * matches what the analytics page itself uses, so cache hits across
 * the page render and a subsequent export are free.
 */
export type AnalyticsExportData = {
  coupleName: string;
  eventDate: string | null;
  venue: string | null;
  packageName: string;
  generatedAt: string;
  totals: {
    totalGuests: number;
    confirmedAttendees: number;
    invited: number;
    opened: number;
    responded: number;
    attending: number;
    notAttending: number;
    notResponded: number;
  };
  events: Array<{
    label: string;
    date: string;
    start: string | null;
    end: string | null;
    venue: string | null;
    address: string | null;
  }>;
  guests: Array<{
    name: string;
    nickname: string | null;
    group: string | null;
    phone: string | null;
    email: string | null;
    rsvp: string;
    pax: number | null;
    openedAt: string | null;
    rsvpedAt: string | null;
    via: string | null;
    message: string | null;
  }>;
  // 7×24 day-of-week × hour buckets of opens. Same shape as the
  // ActivityHeatmap component consumes — the infographic flattens
  // it into a compact 7×8 grid (3-hour blocks) for readability.
  heatmap: Array<{ day: number; hour: number; count: number }>;
};

const RSVP_LABEL: Record<string, string> = {
  baru: "Baru",
  diundang: "Diundang",
  dibuka: "Dibuka",
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
};

function fmtDate(d: Date | string | null): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getAnalyticsExportData(
  eventId: string,
): Promise<ActionResult<AnalyticsExportData>> {
  return withAuth(eventId, "viewer", async () => {
    const [
      bundle,
      total,
      confirmedAttendees,
      funnel,
      guests,
      packageInfo,
      heatmap,
    ] = await Promise.all([
      getEventBundle(eventId),
      countLiveGuests(eventId),
      sumAttendees(eventId),
      getResponseFunnel(eventId),
      listGuestsForEvent(eventId),
      getEventPackageLimit(eventId),
      getOpenHeatmap(eventId),
    ]);

    if (!bundle) {
      throw new Error("Acara tidak ditemukan.");
    }

    const coupleName = bundle.couple
      ? `${bundle.couple.brideName} & ${bundle.couple.groomName}`
      : bundle.event.title;
    const firstSchedule = bundle.schedules[0];
    const eventDate = firstSchedule?.eventDate ?? null;
    const venue = firstSchedule?.venueName ?? null;

    return {
      coupleName,
      eventDate,
      venue,
      packageName: packageInfo.packageName,
      generatedAt: new Date().toISOString(),
      totals: {
        totalGuests: total,
        confirmedAttendees,
        invited: funnel.invited,
        opened: funnel.opened,
        responded: funnel.responded,
        attending: funnel.attending,
        notAttending: funnel.responded - funnel.attending,
        notResponded: total - funnel.responded,
      },
      events: bundle.schedules.map((s) => ({
        label: s.label,
        date: s.eventDate,
        start: s.startTime,
        end: s.endTime,
        venue: s.venueName,
        address: s.venueAddress,
      })),
      guests: guests.map((g) => ({
        name: g.name,
        nickname: g.nickname,
        group: g.groupName,
        phone: g.phone,
        email: g.email,
        rsvp: RSVP_LABEL[g.rsvpStatus] ?? g.rsvpStatus,
        pax: g.rsvpAttendees,
        openedAt: fmtDate(g.openedAt),
        rsvpedAt: fmtDate(g.rsvpedAt),
        via: g.lastSentVia,
        message: g.rsvpMessage,
      })),
      heatmap,
    };
  });
}

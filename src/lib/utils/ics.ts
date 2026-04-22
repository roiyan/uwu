// Simple .ics generator for "Save to calendar" button on the invitation page.
// Keeps payload small; intentionally avoids timezone VTIMEZONE blocks and uses
// UTC conversion from the event's local date/time + timezone offset when a
// proper IANA offset is tricky — fall back to floating local time otherwise.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcStamp(
  dateIso: string,
  time: string | null,
  fallbackAt: "start" | "end",
) {
  // dateIso: 'YYYY-MM-DD', time: 'HH:MM' or null
  const [y, m, d] = dateIso.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = (time ?? (fallbackAt === "start" ? "09:00" : "12:00"))
    .split(":")
    .map((x) => parseInt(x, 10));
  // Treat as UTC+7 (Asia/Jakarta) default — subtract 7 hours to get UTC.
  const local = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));
  return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}T${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}00Z`;
}

function escapeText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export type IcsEvent = {
  uid: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  description?: string;
  location?: string;
};

export function buildIcsFile(events: IcsEvent[]): string {
  const now = new Date();
  const stampNow = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//uwu Wedding Platform//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@uwu.id`,
      `DTSTAMP:${stampNow}`,
      `DTSTART:${toUtcStamp(e.date, e.startTime, "start")}`,
      `DTEND:${toUtcStamp(e.date, e.endTime ?? e.startTime, "end")}`,
      `SUMMARY:${escapeText(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(e: IcsEvent): string {
  const start = toUtcStamp(e.date, e.startTime, "start");
  const end = toUtcStamp(e.date, e.endTime ?? e.startTime, "end");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${start}/${end}`,
    details: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function mapsUrl(
  venueName: string | null,
  venueAddress: string | null,
  mapUrl: string | null,
): string | null {
  if (mapUrl) return mapUrl;
  const q = [venueName, venueAddress].filter(Boolean).join(", ");
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

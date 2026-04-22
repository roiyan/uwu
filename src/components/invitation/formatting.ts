const TZ_ABBR: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

export function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(raw: string | null, timezone: string): string {
  if (!raw) return "";
  const [h, m] = raw.split(":");
  const zone = TZ_ABBR[timezone] ?? timezone;
  return `${h.padStart(2, "0")}.${(m ?? "00").padStart(2, "0")} ${zone}`;
}

export function formatTimeRange(
  start: string | null,
  end: string | null,
  timezone: string,
): string | null {
  if (!start && !end) return null;
  const zone = TZ_ABBR[timezone] ?? timezone;
  const startTime = start ? formatTime(start, timezone) : "—";
  if (!end) return startTime;
  const stripped = startTime.replace(/ \S+$/, "");
  const endStripped = formatTime(end, timezone).replace(/ \S+$/, "");
  return `${stripped} – ${endStripped} ${zone}`;
}

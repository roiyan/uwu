// Human-readable relative timestamps for the activity log + KPI
// cards. Mirrors WhatsApp's "Baru saja / 22 jam lalu / Kemarin /
// 3 hari lalu / 12 Apr" cascade — couples skim the dashboard fast
// and the codified "22J" / "1H" form forced them to decode it.

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function formatTimeAgo(date: Date | string | number): string {
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return "—";
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return `${then.getDate()} ${MONTHS_ID[then.getMonth()]}`;
}

export type GroupableActivity = {
  id: string;
  summary: string;
  userName: string | null;
  userEmail: string;
  createdAt: Date | string;
};

export type GroupedActivity = GroupableActivity & {
  count: number;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Collapse consecutive rows that share the same actor + summary
 * within a 1-hour window into a single row carrying a `count`. The
 * rendered list shows "edited mempelai · 4 perubahan" instead of
 * four nearly-identical rows, which read like noise.
 *
 * Input is assumed already sorted desc by createdAt (the way
 * `getRecentActivity` returns it).
 */
export function groupActivities(
  activities: GroupableActivity[],
): GroupedActivity[] {
  const out: GroupedActivity[] = [];
  for (const a of activities) {
    const last = out[out.length - 1];
    if (
      last &&
      last.summary === a.summary &&
      last.userName === a.userName &&
      Math.abs(
        new Date(last.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ) < ONE_HOUR_MS
    ) {
      last.count += 1;
      continue;
    }
    out.push({ ...a, count: 1 });
  }
  return out;
}

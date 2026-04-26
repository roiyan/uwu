"use client";

export type SourceData = {
  whatsapp: number;
  email: number;
  direct: number;
};

export type GroupEngagementRow = {
  id: string;
  name: string;
  color: string | null;
  total: number;
  attending: number;
  opened: number;
};

export type EnthusiastRow = {
  id: string;
  name: string;
  nickname: string | null;
  groupName: string | null;
  groupColor: string | null;
  rsvpStatus:
    | "baru"
    | "diundang"
    | "dibuka"
    | "hadir"
    | "tidak_hadir";
  rsvpAttendees: number | null;
  rsvpMessage: string | null;
  openedAt: Date | null;
  rsvpedAt: Date | null;
};

export function BreakdownCards({
  source,
  groups,
  totalGuests,
  enthusiasts,
}: {
  source: SourceData;
  groups: GroupEngagementRow[];
  totalGuests: number;
  enthusiasts: EnthusiastRow[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <EnthusiastCard rows={enthusiasts} />
      <SourceCard source={source} totalGuests={totalGuests} />
      <GroupCard groups={groups} />
    </section>
  );
}

/**
 * "Tamu Paling Antusias" — top 5 guests scored by signals that reveal
 * excitement: opened the invite, RSVP'd "hadir", responded fast after
 * opening, brought a +1, left a wish. Replaces the old WishesCard
 * (wishes are now their own tab on /dashboard/guests).
 */
function rsvpSpeedLabel(opened: Date | null, rsvped: Date | null): string {
  if (!opened || !rsvped) return "";
  const diff = (new Date(rsvped).getTime() - new Date(opened).getTime()) / 60000;
  if (diff < 1) return "RSVP langsung";
  if (diff < 60) return `RSVP ${Math.round(diff)} menit setelah buka`;
  if (diff < 1440) return `RSVP ${Math.round(diff / 60)} jam setelah buka`;
  return `RSVP ${Math.round(diff / 1440)} hari setelah buka`;
}

function scoreEnthusiast(g: EnthusiastRow): number {
  let score = 0;
  if (g.rsvpStatus === "hadir") score += 3;
  if (g.openedAt && g.rsvpedAt) {
    const diff =
      (new Date(g.rsvpedAt).getTime() - new Date(g.openedAt).getTime()) /
      60000;
    if (diff < 5) score += 3;
    else if (diff < 30) score += 2;
    else if (diff < 60) score += 1;
  }
  if (g.rsvpMessage && g.rsvpMessage.trim().length > 0) score += 2;
  if (g.rsvpAttendees && g.rsvpAttendees > 1) score += 1;
  return score;
}

function EnthusiastCard({ rows }: { rows: EnthusiastRow[] }) {
  const ranked = rows
    .filter((g) => g.openedAt)
    .map((g) => ({ ...g, score: scoreEnthusiast(g) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const medals = ["🥇", "🥈", "🥉", "4", "5"];
  const avatarBg = (rank: number) => {
    if (rank === 0)
      return "linear-gradient(135deg, var(--d-coral), var(--d-peach))";
    if (rank === 1)
      return "linear-gradient(135deg, var(--d-lilac), var(--d-blue))";
    return "rgba(255,255,255,0.06)";
  };

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Tamu Paling Antusias
      </p>
      <h3 className="d-serif mt-2 text-[18px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
        Siapa yang paling{" "}
        <em className="d-serif italic text-[var(--d-coral)]">antusias</em>?
      </h3>

      {ranked.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center">
          <p className="d-serif text-[14px] italic text-[var(--d-ink-dim)]">
            Belum ada tamu yang membuka undangan.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col">
          {ranked.map((g, i) => {
            const speed = rsvpSpeedLabel(g.openedAt, g.rsvpedAt);
            const meta = [
              speed,
              g.rsvpAttendees && g.rsvpAttendees > 1
                ? `${g.rsvpAttendees} pax`
                : null,
              g.rsvpMessage ? "💬" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={g.id}
                className={`flex items-center gap-3.5 py-3 ${
                  i < ranked.length - 1
                    ? "border-b border-[var(--d-line)]"
                    : ""
                }`}
              >
                <div
                  className={`d-mono w-7 shrink-0 text-center ${
                    i < 3 ? "text-[18px]" : "text-[12px]"
                  } ${i < 3 ? "text-[var(--d-ink)]" : "text-[var(--d-ink-faint)]"}`}
                >
                  {medals[i]}
                </div>
                <div
                  aria-hidden
                  className="d-serif flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] italic"
                  style={{
                    background: avatarBg(i),
                    color: i < 2 ? "#0B0B15" : "var(--d-ink-dim)",
                  }}
                >
                  {(g.name || "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--d-ink)]">
                    {g.nickname || g.name}
                  </p>
                  {meta && (
                    <p className="d-mono mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-[var(--d-ink-faint)]">
                      {meta}
                    </p>
                  )}
                </div>
                <div className="d-mono shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--d-ink-faint)] opacity-60">
                  {g.score}pt
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CardShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        {eyebrow}
      </p>
      <h3 className="d-serif mt-2 text-[18px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
        {title}
      </h3>
      <div className="mt-5 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function BrkRow({
  icon,
  iconColor,
  iconBg,
  name,
  sub,
  pct,
  value,
  barColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  name: string;
  sub: string;
  pct: number;
  value: number | string;
  barColor: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_88px_auto] items-center gap-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--d-line)]"
          style={{ background: iconBg, color: iconColor }}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0">
          <p className="truncate text-[13px] text-[var(--d-ink)]">{name}</p>
          <p className="d-mono mt-0.5 truncate text-[10.5px] tracking-[0.04em] text-[var(--d-ink-faint)]">
            {sub}
          </p>
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--d-line)]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
        />
      </div>
      <div className="text-right">
        <span className="d-serif text-[18px] text-[var(--d-ink)]">{value}</span>
        <span className="d-mono ml-1 text-[10px] tracking-[0.06em] text-[var(--d-ink-faint)]">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function SourceCard({
  source,
  totalGuests,
}: {
  source: SourceData;
  totalGuests: number;
}) {
  const denom = Math.max(1, source.whatsapp + source.email + source.direct);
  const rows: Array<{
    name: string;
    sub: string;
    count: number;
    color: string;
    icon: React.ReactNode;
    iconBg: string;
  }> = [
    {
      name: "WhatsApp",
      sub: "Link broadcast",
      count: source.whatsapp,
      color: "var(--d-green)",
      iconBg: "rgba(126,211,164,0.1)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      ),
    },
    {
      name: "Email",
      sub: "Gmail · Apple Mail",
      count: source.email,
      color: "var(--d-blue)",
      iconBg: "rgba(143,163,217,0.1)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7a2 2 0 012-2h14a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: "Link Langsung",
      sub: "Copy-paste URL",
      count: source.direct,
      color: "var(--d-lilac)",
      iconBg: "rgba(184,157,212,0.1)",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
        </svg>
      ),
    },
  ];

  // If everything is zero, show a placeholder note but keep the rows.
  const empty = totalGuests === 0 || denom === 0;

  return (
    <CardShell eyebrow="Sumber Trafik" title="Dari mana mereka datang">
      {empty && (
        <p className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
          Belum ada bukaan tercatat — angka akan muncul setelah broadcast
          pertama.
        </p>
      )}
      {rows.map((r) => (
        <BrkRow
          key={r.name}
          icon={r.icon}
          iconColor={r.color}
          iconBg={r.iconBg}
          name={r.name}
          sub={r.sub}
          pct={Math.round((r.count / denom) * 100)}
          value={r.count}
          barColor={r.color}
        />
      ))}
    </CardShell>
  );
}

function GroupCard({ groups }: { groups: GroupEngagementRow[] }) {
  const sorted = [...groups]
    .map((g) => ({
      ...g,
      pct: g.total > 0 ? Math.round((g.attending / g.total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  return (
    <CardShell eyebrow="Engagement per Grup" title="Grup teratas">
      {sorted.length === 0 && (
        <p className="d-serif text-[12.5px] italic text-[var(--d-ink-faint)]">
          Belum ada grup. Buat grup di halaman Tamu untuk melihat engagement.
        </p>
      )}
      {sorted.map((g) => (
        <BrkRow
          key={g.id}
          icon={
            <span className="d-serif text-[12px] italic">
              {initialsOf(g.name)}
            </span>
          }
          iconColor="#0B0B15"
          iconBg={g.color ?? "var(--d-gold)"}
          name={g.name}
          sub={
            g.total === 0
              ? "kosong"
              : `${g.attending}/${g.total} hadir`
          }
          pct={g.pct}
          value={`${g.attending}/${g.total}`}
          barColor={g.color ?? "var(--d-gold)"}
        />
      ))}
    </CardShell>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

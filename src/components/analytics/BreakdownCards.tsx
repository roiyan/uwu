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

export type WishRow = {
  id: string;
  name: string;
  message: string | null;
  groupName: string | null;
  groupColor: string | null;
  rsvpedAt: Date | null;
};

export function BreakdownCards({
  source,
  groups,
  totalGuests,
  wishes,
  wishesTotal,
  wishesGuestTotal,
}: {
  source: SourceData;
  groups: GroupEngagementRow[];
  totalGuests: number;
  wishes: WishRow[];
  wishesTotal: number;
  wishesGuestTotal: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <WishesCard
        wishes={wishes}
        total={wishesTotal}
        guestTotal={wishesGuestTotal}
      />
      <SourceCard source={source} totalGuests={totalGuests} />
      <GroupCard groups={groups} />
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

function WishesCard({
  wishes,
  total,
  guestTotal,
}: {
  wishes: WishRow[];
  total: number;
  guestTotal: number;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-6">
      <p className="d-mono text-[10px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Ucapan Tamu
      </p>
      <h3 className="d-serif mt-2 text-[18px] font-light leading-tight tracking-[-0.01em] text-[var(--d-ink)]">
        Kata-kata{" "}
        <em className="d-serif italic text-[var(--d-coral)]">terindah</em> dari
        mereka yang mendoakan.
      </h3>

      {wishes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--d-line-strong)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center">
          <p className="d-serif text-[14px] italic text-[var(--d-ink-dim)]">
            Belum ada ucapan.
          </p>
          <p className="d-serif mx-auto mt-2 max-w-[28ch] text-[12.5px] italic leading-relaxed text-[var(--d-ink-faint)]">
            Saat tamu mengonfirmasi kehadiran dan meninggalkan pesan, kata-kata
            mereka akan muncul di sini.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3">
            {wishes.map((w) => (
              <WishCard key={w.id} wish={w} />
            ))}
          </div>
          <p className="d-mono mt-5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-dim)]">
            <span className="text-[var(--d-ink)]">{total}</span> ucapan dari{" "}
            <span className="text-[var(--d-ink)]">{guestTotal}</span> tamu
          </p>
        </>
      )}
    </section>
  );
}

function WishCard({ wish }: { wish: WishRow }) {
  const dateLabel = wish.rsvpedAt
    ? new Date(wish.rsvpedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : null;
  return (
    <article className="relative rounded-xl border border-[var(--d-line)] bg-[var(--d-bg-1)] p-4 pl-5">
      <span
        aria-hidden
        className="d-serif pointer-events-none absolute left-2 top-1.5 text-[36px] italic leading-none text-[var(--d-coral)]/30"
      >
        &ldquo;
      </span>
      <p className="d-serif relative text-[14px] italic leading-relaxed text-[var(--d-ink)]">
        {wish.message}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[13px] font-medium text-[var(--d-ink)]">
          <span aria-hidden className="text-[var(--d-ink-faint)]">
            —{" "}
          </span>
          {wish.name}
        </p>
        <p className="d-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--d-ink-faint)]">
          {wish.groupName && (
            <>
              <span
                aria-hidden
                className="h-1 w-1 rounded-full"
                style={{
                  background: wish.groupColor ?? "var(--d-gold)",
                }}
              />
              {wish.groupName}
            </>
          )}
          {wish.groupName && dateLabel && <span aria-hidden>·</span>}
          {dateLabel && <span>{dateLabel}</span>}
        </p>
      </div>
    </article>
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

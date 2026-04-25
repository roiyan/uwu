"use client";

export type TopOpenerRow = {
  id: string;
  name: string;
  groupName: string | null;
  groupColor: string | null;
  rsvpStatus:
    | "baru"
    | "diundang"
    | "dibuka"
    | "hadir"
    | "tidak_hadir";
  rsvpAttendees: number | null;
  sendCount: number;
  openedAt: Date | null;
  rsvpedAt: Date | null;
};

const RANK_COLOR = ["var(--d-coral)", "var(--d-peach)", "var(--d-gold)"];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, var(--d-coral), var(--d-peach))",
  "linear-gradient(135deg, var(--d-lilac), var(--d-blue))",
  "linear-gradient(135deg, var(--d-gold), var(--d-peach))",
  "linear-gradient(135deg, var(--d-green), var(--d-blue))",
];

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TopOpeners({ rows }: { rows: TopOpenerRow[] }) {
  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <p className="d-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--d-coral)]">
        Tamu Paling Antusias
      </p>
      <h2 className="d-serif mt-2 text-[24px] font-light leading-tight tracking-[-0.015em] text-[var(--d-ink)] lg:text-[26px]">
        Top openers
      </h2>

      {rows.length === 0 ? (
        <p className="d-serif mt-6 text-[13px] italic text-[var(--d-ink-faint)]">
          Belum ada bukaan tercatat — daftar akan terisi setelah tamu pertama
          membuka undangan.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col">
          {rows.map((r, i) => {
            const isRsvp = r.rsvpStatus === "hadir" || r.rsvpStatus === "tidak_hadir";
            return (
              <li
                key={r.id}
                className="grid grid-cols-[28px_40px_1fr_auto] items-center gap-3.5 border-t border-[var(--d-line)] py-3 first:border-t-0 first:pt-0"
              >
                <span
                  className="d-serif text-center text-[22px] font-light italic"
                  style={{
                    color:
                      i < 3
                        ? RANK_COLOR[i]
                        : "var(--d-ink-faint)",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="d-serif flex h-9 w-9 items-center justify-center rounded-full text-[14px] italic text-[#0B0B15]"
                  style={{
                    background: AVATAR_GRADIENTS[hashIndex(r.id) % AVATAR_GRADIENTS.length],
                  }}
                  aria-hidden
                >
                  {initials(r.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-[var(--d-ink)]">
                    {r.name}
                  </p>
                  <p className="d-mono mt-0.5 truncate text-[10.5px] tracking-[0.04em] text-[var(--d-ink-faint)]">
                    {r.groupName ?? "Tanpa grup"} ·{" "}
                    {r.sendCount > 0 ? `${r.sendCount}× kirim` : "1× buka"}
                  </p>
                </div>
                {isRsvp ? (
                  <span
                    className={`d-mono rounded-[4px] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${
                      r.rsvpStatus === "hadir"
                        ? "bg-[rgba(126,211,164,0.1)] text-[var(--d-green)]"
                        : "bg-[rgba(224,138,138,0.1)] text-[#E08A8A]"
                    }`}
                  >
                    {r.rsvpStatus === "hadir"
                      ? `${r.rsvpAttendees ?? 1} RSVP`
                      : "Tdk Hadir"}
                  </span>
                ) : (
                  <span className="d-mono rounded-[4px] bg-[rgba(143,163,217,0.1)] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[var(--d-blue)]">
                    Buka
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

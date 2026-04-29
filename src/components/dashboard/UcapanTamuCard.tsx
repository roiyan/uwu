"use client";

import { useState } from "react";
import Link from "next/link";

type Wish = {
  id: string;
  name: string;
  message: string | null;
  groupName: string | null;
  groupColor: string | null;
  rsvpedAt: Date | null;
};

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatShortDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
}

import { isTestName } from "@/lib/utils/test-name-filter";

const TEST_BLOCKLIST = new Set([
  "test",
  "tes",
  "testing",
  "coba",
  "gtt",
  "asdf",
  "xxx",
  "males",
]);

function isTestWish(message: string | null): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  if (TEST_BLOCKLIST.has(trimmed.toLowerCase())) return true;
  // Tightened from "< 10 + < 3 words" — the old gate let through
  // short throwaway lines from test accounts. < 5 chars is always
  // noise; sub-10-char single-word fragments still get filtered.
  if (trimmed.length < 5) return true;
  if (
    trimmed.length < 10 &&
    trimmed.split(/\s+/).filter(Boolean).length < 3
  ) {
    return true;
  }
  return false;
}

// Either gate (name OR message) is enough to reject the wish.
function isVisibleWish(name: string | null, message: string | null): boolean {
  if (isTestName(name)) return false;
  if (isTestWish(message)) return false;
  return true;
}

export function UcapanTamuCard({
  wishes: rawWishes,
  totalWishes,
  totalGuests,
}: {
  wishes: Wish[];
  totalWishes: number;
  totalGuests: number;
}) {
  const wishes = rawWishes.filter((w) => isVisibleWish(w.name, w.message));
  // Hooks must run unconditionally — keep the state declaration above
  // any early return so the empty-state path stays compatible with
  // the React hooks rules.
  const [open, setOpen] = useState(totalWishes >= 3);

  if (wishes.length === 0) {
    return (
      <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
        <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
          Doa & Ucapan
        </p>
        <h2 className="d-serif mt-3 text-[20px] font-light text-[var(--d-ink)]">
          Menunggu{" "}
          <em className="d-serif italic text-[var(--d-coral)]">doa pertama</em>.
        </h2>
        <p className="d-serif mt-2 text-[12.5px] italic text-[var(--d-ink-faint)]">
          Doa dan ucapan tamu akan mengalir di sini setelah mereka merespons.
        </p>
      </section>
    );
  }

  const [featured, ...rest] = wishes;
  const smallWishes = rest.slice(0, 2);

  return (
    <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ucapan-body"
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="d-mono text-[10px] uppercase tracking-[0.26em] text-[var(--d-coral)]">
            Doa & Ucapan
          </p>
          <h2 className="d-serif mt-3 text-[22px] font-light leading-[1.3] text-[var(--d-ink)] lg:text-[24px]">
            Kata-kata{" "}
            <em className="d-serif italic text-[var(--d-coral)]">terindah</em>{" "}
            dari mereka yang mendoakan.
          </h2>
        </div>
        <span
          aria-hidden
          className="d-mono mt-1 shrink-0 text-[12px] text-[var(--d-ink-faint)]"
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div id="ucapan-body" className="mt-5">
      <article
        className="rounded-[14px] border border-[var(--d-line)] px-5 py-5 lg:px-6 lg:py-6"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <p className="d-serif text-[15px] italic leading-[1.6] text-[var(--d-ink)] lg:text-[16px]">
          <span
            aria-hidden
            className="d-serif mr-1 align-text-top text-[20px] leading-none text-[var(--d-coral)] opacity-40"
          >
            “
          </span>
          {featured.message}
        </p>
        <FooterLine
          name={featured.name}
          groupName={featured.groupName}
          groupColor={featured.groupColor}
          rsvpedAt={featured.rsvpedAt}
        />
      </article>

      {smallWishes.length > 0 && (
        <div
          className={`custom-scroll mt-3.5 grid gap-3.5 ${smallWishes.length === 1 ? "" : "md:grid-cols-2"}`}
        >
          {smallWishes.map((w) => (
            <article
              key={w.id}
              className="rounded-[12px] border border-[var(--d-line)] px-[18px] py-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p
                className="d-serif text-[13px] italic leading-[1.5] text-[var(--d-ink-dim)]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden
                  className="d-serif mr-0.5 align-text-top text-[16px] leading-none text-[var(--d-coral)] opacity-40"
                >
                  “
                </span>
                {w.message}
              </p>
              <FooterLine
                name={w.name}
                groupName={w.groupName}
                groupColor={w.groupColor}
                rsvpedAt={null}
                compact
              />
            </article>
          ))}
        </div>
      )}

        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[var(--d-line)] pt-3.5">
        <span className="d-mono text-[10px] uppercase tracking-[0.16em] text-[var(--d-ink-faint)]">
          {totalWishes} ucapan dari{" "}
          <em className="not-italic text-[var(--d-coral)]">{totalGuests}</em>{" "}
          tamu
        </span>
        <Link
          href="/dashboard/guests?tab=ucapan"
          className="d-mono text-[10px] uppercase tracking-[0.16em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-ink)]"
        >
          Lihat semua →
        </Link>
      </div>
    </section>
  );
}

function FooterLine({
  name,
  groupName,
  groupColor,
  rsvpedAt,
  compact = false,
}: {
  name: string;
  groupName: string | null;
  groupColor: string | null;
  rsvpedAt: Date | null;
  compact?: boolean;
}) {
  const dateStr = formatShortDate(rsvpedAt);
  return (
    <div className={`mt-${compact ? 2.5 : 3.5} flex flex-wrap items-center gap-2`}>
      <span
        className={`text-[var(--d-ink-dim)] ${compact ? "text-[12px]" : "text-[13px]"}`}
      >
        — {name}
      </span>
      {groupName && (
        <>
          <span
            aria-hidden
            className="shrink-0 rounded-full"
            style={{
              width: compact ? 4 : 5,
              height: compact ? 4 : 5,
              background: groupColor ?? "var(--d-ink-faint)",
            }}
          />
          <span
            className={`d-mono uppercase tracking-[0.18em] text-[var(--d-ink-faint)] ${compact ? "text-[8.5px]" : "text-[9px]"}`}
          >
            {groupName}
            {dateStr ? ` · ${dateStr}` : ""}
          </span>
        </>
      )}
    </div>
  );
}

export function UcapanTamuSkeleton() {
  return (
    <section className="mt-8 rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7 lg:p-8">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-[var(--d-bg-2)]" />
      <div className="mt-5 h-32 animate-pulse rounded-[14px] bg-[var(--d-bg-2)]" />
      <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
        <div className="h-24 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]" />
        <div className="h-24 animate-pulse rounded-[12px] bg-[var(--d-bg-2)]" />
      </div>
    </section>
  );
}

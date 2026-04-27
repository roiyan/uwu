"use client";

import { motion } from "framer-motion";
import {
  DEFAULT_SECTION_ORDER,
  type SectionId,
} from "@/lib/theme/sections";
import { Countdown } from "./countdown";
import { formatDate, formatTimeRange } from "./formatting";
import { ALL_SECTIONS_ON } from "./types";
import type {
  CoupleData,
  InvitationEvent,
  Palette,
  ScheduleData,
  SectionFlags,
} from "./types";

type Props = {
  event: InvitationEvent;
  palette: Palette;
  couple: CoupleData | null;
  schedules: ScheduleData[];
  guestName?: string;
  sections?: SectionFlags;
  /** Bagian render order. Mirrors the public invitation's
   *  sectionOrder prop so the editor preview reflects drag-drop
   *  reorders in the section rail without a server round-trip.
   *  Falls back to DEFAULT_SECTION_ORDER when omitted. */
  sectionOrder?: readonly SectionId[];
  // When true, mutes scroll animations — useful for the live editor so the
  // preview doesn't animate every keystroke.
  staticMode?: boolean;
};

export function Preview({
  event,
  palette,
  couple,
  schedules,
  guestName = "Bpk/Ibu/Saudara/i",
  sections = ALL_SECTIONS_ON,
  sectionOrder,
  staticMode = false,
}: Props) {
  // Resolve render order: caller-provided override (live drag-drop
  // state from the editor) → canonical default. Order is the only
  // axis that varies per render; visibility is still gated by the
  // SectionFlags below so toggling a section off in the rail keeps
  // working independently of where it sits in the list.
  const order = sectionOrder ?? DEFAULT_SECTION_ORDER;
  return (
    <div
      className="min-h-screen font-body"
      style={{ background: palette.secondary, color: "#1A1A2E" }}
    >
      {order.map((id) => {
        switch (id) {
          case "foto-sampul":
            return (
              <HeroSection
                key={id}
                event={event}
                palette={palette}
                couple={couple}
                guestName={guestName}
                firstSchedule={schedules[0]}
                staticMode={staticMode}
              />
            );
          case "kutipan":
            return sections.quote && couple?.quote ? (
              <QuoteSection
                key={id}
                quote={couple.quote}
                palette={palette}
                staticMode={staticMode}
              />
            ) : null;
          case "mempelai":
            return sections.couple && couple ? (
              <CoupleSection
                key={id}
                couple={couple}
                palette={palette}
                staticMode={staticMode}
              />
            ) : null;
          case "cerita":
            return sections.story && couple?.story ? (
              <StorySection
                key={id}
                story={couple.story}
                palette={palette}
                staticMode={staticMode}
              />
            ) : null;
          case "acara":
            return sections.schedules && schedules.length > 0 ? (
              <SchedulesSection
                key={id}
                schedules={schedules}
                palette={palette}
                staticMode={staticMode}
              />
            ) : null;
          case "countdown":
            return sections.countdown ? (
              <Countdown
                key={id}
                eventDate={schedules[0]?.eventDate}
                startTime={schedules[0]?.startTime}
                timezone={schedules[0]?.timezone}
                palette={palette}
                staticMode={staticMode}
              />
            ) : null;
          case "galeri":
            return sections.gallery ? (
              <GalleryPlaceholder key={id} palette={palette} />
            ) : null;
          case "rsvp":
            return sections.rsvp ? (
              <RsvpPlaceholder key={id} palette={palette} />
            ) : null;
          case "amplop":
            return sections.gifts ? (
              <GiftPlaceholder key={id} palette={palette} />
            ) : null;
          default:
            return null;
        }
      })}

      <footer className="py-10 text-center text-xs opacity-70">
        <p>Dibuat dengan ♡ di uwu</p>
        <p className="mt-1">uwu.id/{event.slug}</p>
      </footer>
    </div>
  );
}

const reveal = (staticMode: boolean) =>
  staticMode
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: 0.6 },
      };

function HeroSection({
  event,
  palette,
  couple,
  guestName,
  firstSchedule,
  staticMode,
}: {
  event: InvitationEvent;
  palette: Palette;
  couple: CoupleData | null;
  guestName: string;
  firstSchedule: ScheduleData | undefined;
  staticMode: boolean;
}) {
  const hasCover = Boolean(couple?.coverPhotoUrl);
  return (
    <section
      className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
      style={{
        backgroundImage: hasCover
          ? `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, ${palette.secondary} 100%), url(${couple!.coverPhotoUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <motion.p
        {...(staticMode
          ? {}
          : {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.6, ease: "easeOut" },
            })}
        className="text-xs uppercase tracking-[0.3em]"
        style={{ color: palette.primary }}
      >
        The Wedding Of
      </motion.p>
      <motion.h1
        {...(staticMode
          ? {}
          : {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.8, delay: 0.1, ease: "easeOut" },
            })}
        className="mt-4 font-display text-5xl italic leading-tight md:text-7xl"
        style={{ color: palette.primary }}
      >
        {event.title || "Nama Anda"}
      </motion.h1>
      {firstSchedule && firstSchedule.eventDate && (
        <p className="mt-6 text-sm">{formatDate(firstSchedule.eventDate)}</p>
      )}
      <div
        className="mt-10 flex items-center gap-3"
        style={{ color: palette.accent }}
      >
        <span className="h-px w-12 bg-current" />
        <span>♡</span>
        <span className="h-px w-12 bg-current" />
      </div>
      <p className="mt-8 text-sm">Kepada Yth.</p>
      <p className="font-display text-lg italic">{guestName}</p>
    </section>
  );
}

function QuoteSection({
  quote,
  palette,
  staticMode,
}: {
  quote: string;
  palette: Palette;
  staticMode: boolean;
}) {
  return (
    <section className="px-6 py-14 text-center">
      <motion.p
        {...reveal(staticMode)}
        className="mx-auto max-w-2xl font-display text-xl italic leading-relaxed"
        style={{ color: palette.primary }}
      >
        “{quote}”
      </motion.p>
    </section>
  );
}

function CoupleSection({
  couple,
  palette,
  staticMode,
}: {
  couple: CoupleData;
  palette: Palette;
  staticMode: boolean;
}) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-2">
        <CouplePortrait
          palette={palette}
          side="Mempelai Wanita"
          person={couple.brideName}
          nickname={couple.brideNickname}
          father={couple.brideFatherName}
          mother={couple.brideMotherName}
          photo={couple.bridePhotoUrl}
          staticMode={staticMode}
        />
        <CouplePortrait
          palette={palette}
          side="Mempelai Pria"
          person={couple.groomName}
          nickname={couple.groomNickname}
          father={couple.groomFatherName}
          mother={couple.groomMotherName}
          photo={couple.groomPhotoUrl}
          staticMode={staticMode}
        />
      </div>
    </section>
  );
}

function StorySection({
  story,
  palette,
  staticMode,
}: {
  story: string;
  palette: Palette;
  staticMode: boolean;
}) {
  return (
    <section className="px-6 py-14">
      <motion.div
        {...reveal(staticMode)}
        className="mx-auto max-w-2xl rounded-2xl bg-white/70 p-8 backdrop-blur"
      >
        <h2
          className="font-display text-2xl"
          style={{ color: palette.primary }}
        >
          Cerita Kami
        </h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">
          {story}
        </p>
      </motion.div>
    </section>
  );
}

function SchedulesSection({
  schedules,
  palette,
  staticMode,
}: {
  schedules: ScheduleData[];
  palette: Palette;
  staticMode: boolean;
}) {
  return (
    <section className="px-6 py-14">
      <h2
        className="text-center font-display text-3xl"
        style={{ color: palette.primary }}
      >
        Rangkaian Acara
      </h2>
      <div className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
        {schedules.map((s, idx) => {
          const range = formatTimeRange(s.startTime, s.endTime, s.timezone);
          return (
            <motion.div
              key={idx}
              {...reveal(staticMode)}
              className="rounded-2xl bg-white/70 p-6 backdrop-blur"
            >
              <p
                className="text-xs uppercase tracking-wide"
                style={{ color: palette.accent }}
              >
                {s.label || "Acara"}
              </p>
              {s.eventDate && (
                <p className="mt-2 font-display text-xl">{formatDate(s.eventDate)}</p>
              )}
              {range && <p className="mt-1 text-sm">{range}</p>}
              {s.venueName && <p className="mt-3 font-medium">{s.venueName}</p>}
              {s.venueAddress && (
                <p className="text-sm opacity-70">{s.venueAddress}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function RsvpPlaceholder({ palette }: { palette: Palette }) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-xl rounded-2xl bg-white/80 p-8 backdrop-blur">
        <h2
          className="text-center font-display text-3xl"
          style={{ color: palette.primary }}
        >
          Konfirmasi Kehadiran
        </h2>
        <p className="mt-3 text-center text-sm text-ink-muted">
          Form RSVP tampil untuk tamu yang membuka tautan pribadi mereka.
        </p>
      </div>
    </section>
  );
}

// Editor-only placeholders for sections whose data isn't piped into
// the live preview yet. Keeping a visible block here means a couple
// dragging "Galeri" or "Tanda Kasih" up/down still sees something
// move — without the placeholder the section would silently
// disappear from the preview and the reorder would feel broken.
function GalleryPlaceholder({ palette }: { palette: Palette }) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white/80 p-8 text-center backdrop-blur">
        <h2
          className="font-display text-3xl"
          style={{ color: palette.primary }}
        >
          Galeri
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          Foto pre-wedding tampil di sini saat tamu membuka undangan.
        </p>
      </div>
    </section>
  );
}

function GiftPlaceholder({ palette }: { palette: Palette }) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white/80 p-8 text-center backdrop-blur">
        <h2
          className="font-display text-3xl"
          style={{ color: palette.primary }}
        >
          Tanda Kasih
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          Rekening + konfirmasi tamu tampil di sini saat undangan dibuka.
        </p>
      </div>
    </section>
  );
}

function CouplePortrait({
  palette,
  side,
  person,
  nickname,
  father,
  mother,
  photo,
  staticMode,
}: {
  palette: Palette;
  side: string;
  person: string;
  nickname: string | null;
  father: string | null;
  mother: string | null;
  photo: string | null;
  staticMode: boolean;
}) {
  const display = nickname || person || "Nama";
  return (
    <motion.div
      {...reveal(staticMode)}
      className="rounded-2xl bg-white/70 p-6 text-center backdrop-blur"
    >
      <div
        className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
        style={{ background: palette.accent }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={person} className="h-full w-full object-cover" />
        ) : (
          <span
            className="font-display text-3xl"
            style={{ color: palette.primary }}
          >
            {(person || "N")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
      </div>
      <p
        className="mt-3 text-xs uppercase tracking-wide"
        style={{ color: palette.accent }}
      >
        {side}
      </p>
      <p
        className="mt-1 font-display text-xl"
        style={{ color: palette.primary }}
      >
        {display}
      </p>
      {person && person !== display && (
        <p className="text-sm opacity-80">{person}</p>
      )}
      {(father || mother) && (
        <p className="mt-3 text-xs opacity-70">
          Putra/i dari Bpk. {father ?? "—"} &amp; Ibu {mother ?? "—"}
        </p>
      )}
    </motion.div>
  );
}

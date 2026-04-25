"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  markOpenedAction,
  resolveGuestByTokenAction,
  type ResolvedGuest,
} from "@/lib/actions/rsvp";
import { buildIcsFile, googleCalendarUrl, mapsUrl } from "@/lib/utils/ics";
import {
  formatDate,
  formatTimeRange,
} from "@/components/invitation/formatting";
import { RsvpForm } from "./rsvp-form";

type Palette = { primary: string; secondary: string; accent: string };

type Couple = {
  brideName: string;
  brideNickname: string | null;
  bridePhotoUrl: string | null;
  brideFatherName: string | null;
  brideMotherName: string | null;
  groomName: string;
  groomNickname: string | null;
  groomPhotoUrl: string | null;
  groomFatherName: string | null;
  groomMotherName: string | null;
  coverPhotoUrl: string | null;
  story: string | null;
  quote: string | null;
};

type Schedule = {
  label: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  venueMapUrl: string | null;
};

// formatDate / formatTime / formatTimeRange come from
// @/components/invitation/formatting — single source of truth so the live
// editor preview and the public invitation stay in lockstep.

export function InvitationClient(props: {
  event: {
    id: string;
    title: string;
    slug: string;
    musicUrl: string | null;
    checkinEnabled: boolean;
  };
  palette: Palette;
  couple: Couple | null;
  schedules: Schedule[];
}) {
  return (
    <Suspense fallback={<Skeleton palette={props.palette} />}>
      <InvitationInner {...props} />
    </Suspense>
  );
}

function Skeleton({ palette }: { palette: Palette }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: palette.secondary }}
    >
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-pulse rounded-full"
          style={{ background: palette.primary, opacity: 0.4 }}
        />
        <p className="mt-3 text-xs text-ink-muted">Memuat undangan...</p>
      </div>
    </div>
  );
}

function InvitationInner({
  event,
  palette,
  couple,
  schedules,
}: {
  event: {
    id: string;
    title: string;
    slug: string;
    musicUrl: string | null;
    checkinEnabled: boolean;
  };
  palette: Palette;
  couple: Couple | null;
  schedules: Schedule[];
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("to");

  const [guest, setGuest] = useState<ResolvedGuest | null>(null);
  const [guestResolved, setGuestResolved] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setGuestResolved(true);
        return;
      }
      const resolved = await resolveGuestByTokenAction(event.id, token);
      if (!cancelled) {
        setGuest(resolved);
        setGuestResolved(true);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [event.id, token]);

  function handleOpen() {
    setOpened(true);
    if (token) {
      markOpenedAction(token).catch(() => undefined);
    }
  }

  const guestName =
    guest?.name ??
    (token && !guestResolved ? "…" : "Bpk/Ibu/Saudara/i");
  const isExistingRsvp =
    guest?.rsvpStatus === "hadir" || guest?.rsvpStatus === "tidak_hadir";

  return (
    <div
      className="min-h-screen font-body"
      style={{ background: palette.secondary, color: "#1A1A2E" }}
    >
      <AnimatePresence>
        {!opened && (
          <EnvelopeReveal
            palette={palette}
            title={event.title}
            guestName={guestName}
            date={schedules[0] ? formatDate(schedules[0].eventDate) : null}
            onOpen={handleOpen}
          />
        )}
      </AnimatePresence>

      <HeroSection
        event={event}
        palette={palette}
        couple={couple}
        guestName={guestName}
        firstSchedule={schedules[0]}
      />

      {couple?.quote && <QuoteSection quote={couple.quote} palette={palette} />}

      {couple && <CoupleSection couple={couple} palette={palette} />}

      {couple?.story && <StorySection story={couple.story} palette={palette} />}

      <SchedulesSection
        schedules={schedules}
        palette={palette}
        eventTitle={event.title}
      />

      <RsvpSection
        token={token}
        guest={guest}
        guestResolved={guestResolved}
        isExistingRsvp={isExistingRsvp}
        palette={palette}
      />

      <footer className="py-10 text-center text-xs opacity-70">
        <p>Dibuat dengan ♡ di uwu</p>
        <p className="mt-1">uwu.id/{event.slug}</p>
      </footer>

      {event.musicUrl && <MusicPlayer url={event.musicUrl} primary={palette.primary} />}
    </div>
  );
}

function EnvelopeReveal({
  palette,
  title,
  guestName,
  date,
  onOpen,
}: {
  palette: Palette;
  title: string;
  guestName: string;
  date: string | null;
  onOpen: () => void;
}) {
  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6"
      style={{ background: palette.secondary }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md rounded-3xl bg-white/70 p-10 text-center shadow-ghost-lg backdrop-blur"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-muted">
          The Wedding Of
        </p>
        <h1
          className="mt-4 font-display text-4xl italic leading-tight"
          style={{ color: palette.primary }}
        >
          {title}
        </h1>
        {date && <p className="mt-3 text-sm text-ink-muted">{date}</p>}
        <div
          className="mt-6 flex items-center justify-center gap-3"
          style={{ color: palette.accent }}
        >
          <span className="h-px w-12 bg-current" />
          <span>♡</span>
          <span className="h-px w-12 bg-current" />
        </div>
        <div className="mt-6">
          <p className="text-xs text-ink-muted">Kepada Yth.</p>
          <p className="font-display text-lg italic text-ink">{guestName}</p>
        </div>
        <motion.button
          type="button"
          onClick={onOpen}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-8 rounded-full px-8 py-3 text-sm font-medium text-white shadow-ghost-md"
          style={{ background: palette.primary }}
        >
          ✉ Buka Undangan
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function HeroSection({
  event,
  palette,
  couple,
  guestName,
  firstSchedule,
}: {
  event: { title: string };
  palette: Palette;
  couple: Couple | null;
  guestName: string;
  firstSchedule: Schedule | undefined;
}) {
  // C-03: when the couple has uploaded a cover photo, overlay a dark
  // top-down gradient so the serif title + guest name stay readable even
  // over bright/busy images. Text contrast stays ≥ 4.5:1 (WCAG AA).
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-xs uppercase tracking-[0.3em]"
        style={{ color: palette.primary }}
      >
        The Wedding Of
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
        className="mt-4 font-display text-5xl italic leading-tight md:text-7xl"
        style={{ color: palette.primary }}
      >
        {event.title}
      </motion.h1>

      {firstSchedule && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6 text-sm"
        >
          {formatDate(firstSchedule.eventDate)}
        </motion.p>
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

function QuoteSection({ quote, palette }: { quote: string; palette: Palette }) {
  return (
    <section className="px-6 py-14 text-center">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl font-display text-xl italic leading-relaxed"
        style={{ color: palette.primary }}
      >
        “{quote}”
      </motion.p>
    </section>
  );
}

function CoupleSection({ couple, palette }: { couple: Couple; palette: Palette }) {
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
        />
        <CouplePortrait
          palette={palette}
          side="Mempelai Pria"
          person={couple.groomName}
          nickname={couple.groomNickname}
          father={couple.groomFatherName}
          mother={couple.groomMotherName}
          photo={couple.groomPhotoUrl}
        />
      </div>
    </section>
  );
}

function StorySection({ story, palette }: { story: string; palette: Palette }) {
  return (
    <section className="px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl rounded-2xl bg-white/70 p-8 backdrop-blur"
      >
        <h2 className="font-display text-2xl" style={{ color: palette.primary }}>
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
  eventTitle,
}: {
  schedules: Schedule[];
  palette: Palette;
  eventTitle: string;
}) {
  function handleDownloadIcs() {
    const ics = buildIcsFile(
      schedules.map((s, idx) => ({
        uid: `${eventTitle.replace(/\s+/g, "-").toLowerCase()}-${idx}-${s.eventDate}`,
        title: `${eventTitle} — ${s.label}`,
        date: s.eventDate,
        startTime: s.startTime,
        endTime: s.endTime,
        description: `Undangan pernikahan ${eventTitle}`,
        location: [s.venueName, s.venueAddress].filter(Boolean).join(", "),
      })),
    );
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uwu-${eventTitle.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          const maps = mapsUrl(s.venueName, s.venueAddress, s.venueMapUrl);
          const gcal = googleCalendarUrl({
            uid: `${idx}-${s.eventDate}`,
            title: `${eventTitle} — ${s.label}`,
            date: s.eventDate,
            startTime: s.startTime,
            endTime: s.endTime,
            description: `Undangan pernikahan ${eventTitle}`,
            location: [s.venueName, s.venueAddress].filter(Boolean).join(", "),
          });
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-2xl bg-white/70 p-6 backdrop-blur"
            >
              <p
                className="text-xs uppercase tracking-wide"
                style={{ color: palette.accent }}
              >
                {s.label}
              </p>
              <p className="mt-2 font-display text-xl">
                {formatDate(s.eventDate)}
              </p>
              {formatTimeRange(s.startTime, s.endTime, s.timezone) && (
                <p className="mt-1 text-sm">
                  {formatTimeRange(s.startTime, s.endTime, s.timezone)}
                </p>
              )}
              {s.venueName && <p className="mt-3 font-medium">{s.venueName}</p>}
              {s.venueAddress && (
                <p className="text-sm opacity-70">{s.venueAddress}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {maps && (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-3 py-1.5 text-[11px] font-medium text-white"
                    style={{ background: palette.primary }}
                  >
                    📍 Google Maps
                  </a>
                )}
                <a
                  href={gcal}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
                  style={{ borderColor: palette.primary, color: palette.primary }}
                >
                  📅 Google Calendar
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {schedules.length > 0 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="text-xs text-ink-muted underline decoration-dotted underline-offset-4 hover:text-ink"
          >
            Unduh semua acara ke kalender (.ics)
          </button>
        </div>
      )}
    </section>
  );
}

function RsvpSection({
  token,
  guest,
  guestResolved,
  isExistingRsvp,
  palette,
}: {
  token: string | null;
  guest: ResolvedGuest | null;
  guestResolved: boolean;
  isExistingRsvp: boolean;
  palette: Palette;
}) {
  return (
    <section id="rsvp" className="px-6 py-14">
      <div className="mx-auto max-w-xl rounded-2xl bg-white/80 p-8 backdrop-blur">
        <h2
          className="text-center font-display text-3xl"
          style={{ color: palette.primary }}
        >
          Konfirmasi Kehadiran
        </h2>
        {token ? (
          <>
            {guestResolved && !guest && (
              <p className="mx-auto mt-4 max-w-md rounded-md bg-rose-50 px-4 py-3 text-center text-sm text-rose-dark">
                Tautan undangan tidak dikenali. Mohon gunakan tautan yang dikirim
                ke Anda.
              </p>
            )}
            {guest && (
              <>
                {isExistingRsvp && (
                  <p className="mt-3 text-center text-xs text-ink-muted">
                    Anda sudah mengkonfirmasi. Anda dapat memperbarui di bawah.
                  </p>
                )}
                <RsvpForm
                  token={token}
                  palette={palette}
                  initial={{
                    status:
                      guest.rsvpStatus === "hadir" ||
                      guest.rsvpStatus === "tidak_hadir"
                        ? guest.rsvpStatus
                        : "hadir",
                    attendees: guest.rsvpAttendees ?? 1,
                    message: guest.rsvpMessage ?? "",
                  }}
                  editing={isExistingRsvp}
                />
              </>
            )}
          </>
        ) : (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Mohon gunakan tautan undangan pribadi Anda untuk dapat melakukan
            konfirmasi kehadiran.
          </p>
        )}
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
}: {
  palette: Palette;
  side: string;
  person: string;
  nickname: string | null;
  father: string | null;
  mother: string | null;
  photo: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
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
            {person
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
        {nickname ? nickname : person}
      </p>
      <p className="text-sm opacity-80">{person}</p>
      {(father || mother) && (
        <p className="mt-3 text-xs opacity-70">
          Putra/i dari Bpk. {father ?? "—"} &amp; Ibu {mother ?? "—"}
        </p>
      )}
    </motion.div>
  );
}

function MusicPlayer({ url, primary }: { url: string; primary: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after envelope opens; small delay for smoothness.
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  if (!visible) return null;

  return (
    <>
      <audio ref={ref} src={url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-ghost-md transition-transform hover:scale-105"
        style={{ background: primary }}
      >
        <span className={playing ? "animate-pulse" : ""}>{playing ? "♫" : "♪"}</span>
      </button>
    </>
  );
}

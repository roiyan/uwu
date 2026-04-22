"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  markOpenedAction,
  resolveGuestByTokenAction,
  type ResolvedGuest,
} from "@/lib/actions/rsvp";
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

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function InvitationClient(props: {
  event: { id: string; title: string; slug: string; musicUrl: string | null };
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
    <div className="flex min-h-screen items-center justify-center" style={{ background: palette.secondary }}>
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full" style={{ background: palette.primary, opacity: 0.4 }} />
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
  event: { id: string; title: string; slug: string; musicUrl: string | null };
  palette: Palette;
  couple: Couple | null;
  schedules: Schedule[];
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("to");

  const [guest, setGuest] = useState<ResolvedGuest | null>(null);
  const [guestResolved, setGuestResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setGuestResolved(true);
        return;
      }
      const [resolved] = await Promise.all([
        resolveGuestByTokenAction(event.id, token),
        markOpenedAction(token).catch(() => undefined),
      ]);
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

  const guestName =
    guest?.name ??
    (token && !guestResolved ? "…" : "Bpk/Ibu/Saudara/i");
  const isExistingRsvp =
    guest?.rsvpStatus === "hadir" || guest?.rsvpStatus === "tidak_hadir";

  return (
    <div className="min-h-screen font-body" style={{ background: palette.secondary, color: "#1A1A2E" }}>
      <section
        className="flex min-h-[90vh] flex-col items-center justify-center px-6 py-16 text-center"
        style={{
          backgroundImage: couple?.coverPhotoUrl
            ? `linear-gradient(180deg, rgba(250,246,241,0.3) 0%, ${palette.secondary} 100%), url(${couple.coverPhotoUrl})`
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

        {schedules[0] && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-sm"
          >
            {formatDate(schedules[0].eventDate)}
          </motion.p>
        )}

        <div className="mt-10 flex items-center gap-3" style={{ color: palette.accent }}>
          <span className="h-px w-12 bg-current" />
          <span>♡</span>
          <span className="h-px w-12 bg-current" />
        </div>

        <p className="mt-8 text-sm">Kepada Yth.</p>
        <p className="font-display text-lg italic">{guestName}</p>
      </section>

      {couple?.quote && (
        <section className="px-6 py-14 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl font-display text-xl italic leading-relaxed"
            style={{ color: palette.primary }}
          >
            “{couple.quote}”
          </motion.p>
        </section>
      )}

      {couple && (
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
      )}

      {couple?.story && (
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
              {couple.story}
            </p>
          </motion.div>
        </section>
      )}

      <section className="px-6 py-14">
        <h2 className="text-center font-display text-3xl" style={{ color: palette.primary }}>
          Rangkaian Acara
        </h2>
        <div className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
          {schedules.map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-2xl bg-white/70 p-6 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: palette.accent }}>
                {s.label}
              </p>
              <p className="mt-2 font-display text-xl">{formatDate(s.eventDate)}</p>
              {(s.startTime || s.endTime) && (
                <p className="mt-1 text-sm">
                  {s.startTime ?? "—"} – {s.endTime ?? "—"} {s.timezone}
                </p>
              )}
              {s.venueName && <p className="mt-3 font-medium">{s.venueName}</p>}
              {s.venueAddress && <p className="text-sm opacity-70">{s.venueAddress}</p>}
              {s.venueMapUrl && (
                <a
                  href={s.venueMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-full px-4 py-2 text-xs font-medium text-white"
                  style={{ background: palette.primary }}
                >
                  Buka Google Maps
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <section id="rsvp" className="px-6 py-14">
        <div className="mx-auto max-w-xl rounded-2xl bg-white/80 p-8 backdrop-blur">
          <h2 className="text-center font-display text-3xl" style={{ color: palette.primary }}>
            Konfirmasi Kehadiran
          </h2>
          {token ? (
            <>
              {guestResolved && !guest && (
                <p className="mx-auto mt-4 max-w-md rounded-md bg-rose-50 px-4 py-3 text-center text-sm text-rose-dark">
                  Tautan undangan tidak dikenali. Mohon gunakan tautan yang dikirim ke Anda.
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
                        guest.rsvpStatus === "hadir" || guest.rsvpStatus === "tidak_hadir"
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
              Mohon gunakan tautan undangan pribadi Anda untuk dapat melakukan konfirmasi kehadiran.
            </p>
          )}
        </div>
      </section>

      <footer className="py-10 text-center text-xs opacity-70">
        <p>Dibuat dengan ♡ di uwu</p>
        <p className="mt-1">uwu.id/{event.slug}</p>
      </footer>
    </div>
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
          <span className="font-display text-3xl" style={{ color: palette.primary }}>
            {person
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: palette.accent }}>
        {side}
      </p>
      <p className="mt-1 font-display text-xl" style={{ color: palette.primary }}>
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

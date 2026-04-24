"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export function HomeHero() {
  const reduced = useReducedMotion();
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden px-6 py-24">
      <div className="hero-mesh" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative inline-block"
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-60"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden
          />
          <h1 className="sr-only">uwu</h1>
          <Image
            src="/logo.png"
            alt=""
            width={640}
            height={206}
            priority
            className="h-24 w-auto md:h-40"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-xs uppercase tracking-[0.3em] text-[color:var(--color-dark-text-secondary)]"
        >
          A Love Story, Beautifully Told.
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="mt-8 font-display leading-[1.1] text-white"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Undangan pernikahan digital,
          <br />
          <span className="italic text-gradient">dibuat untuk Anda.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[color:var(--color-dark-text-secondary)]"
        >
          Desain elegan, manajemen tamu cerdas, broadcast WhatsApp otomatis,
          dan analytics real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand px-8 py-3 font-medium text-white shadow-[0_10px_40px_-12px_rgba(139,157,195,0.7)] transition-all hover:shadow-[0_16px_48px_-8px_rgba(232,160,160,0.7)] hover:scale-105"
          >
            Mulai Gratis
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href="/tema"
            className="rounded-full border border-[color:var(--color-gold)] px-8 py-3 font-medium text-[color:var(--color-gold)] transition-colors hover:bg-[color:var(--color-gold)]/10"
          >
            Lihat Tema
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-[color:var(--color-dark-text-muted)]"
        >
          <span>1000+ Pasangan</span>
          <span className="text-[color:var(--color-gold)]">·</span>
          <span>50+ Tema</span>
          <span className="text-[color:var(--color-gold)]">·</span>
          <span>3 Menit Setup</span>
        </motion.div>
      </div>

      {!reduced && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 1.3 },
            y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-2xl text-[color:var(--color-dark-text-muted)]"
          aria-hidden
        >
          ⌄
        </motion.div>
      )}
    </section>
  );
}

type FeatureSection = {
  label: string;
  title: string;
  body: string;
  reverse?: boolean;
  visual: React.ReactNode;
};

function FeatureBlock({ feature }: { feature: FeatureSection }) {
  return (
    <section
      className={`flex min-h-[80vh] items-center px-6 py-20 ${
        feature.reverse ? "bg-[color:var(--color-dark-surface)]" : ""
      }`}
    >
      <div
        className={`mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-2 md:items-center ${
          feature.reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <ScrollReveal>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
            {feature.label}
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">
            {feature.title}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[color:var(--color-dark-text-secondary)]">
            {feature.body}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>{feature.visual}</ScrollReveal>
      </div>
    </section>
  );
}

export function HomeFeatures() {
  const features: FeatureSection[] = [
    {
      label: "Desain",
      title: "Tema premium eksklusif",
      body: "Pilih dari pustaka tema yang dirancang desainer profesional. Sesuaikan palet warna dan tipografi tanpa menulis satu baris kode pun.",
      visual: <PhoneMockup />,
    },
    {
      label: "Tamu",
      title: "Kelola tamu dengan cerdas",
      body: "Import daftar tamu, kelompokkan, dan pantau RSVP real-time. Setiap tamu mendapat link pribadi dengan nama mereka di undangan.",
      reverse: true,
      visual: <DashboardMockup />,
    },
    {
      label: "Pesan",
      title: "Broadcast WhatsApp otomatis",
      body: "Kirim 300 undangan personal dalam hitungan menit. Template otomatis menyesuaikan preferensi budaya — Islami, formal umum, atau santai.",
      visual: <WaMockup />,
    },
    {
      label: "Analytics",
      title: "Pantau respons real-time",
      body: "Funnel lengkap dari undangan dibuka hingga konfirmasi hadir. Tahu persis siapa yang sudah merespons dan siapa yang perlu di-follow up.",
      reverse: true,
      visual: <AnalyticsMockup />,
    },
  ];
  return (
    <>
      {features.map((f) => (
        <FeatureBlock key={f.title} feature={f} />
      ))}
    </>
  );
}

function MockupFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="absolute inset-0 -z-10 rounded-[2.5rem] opacity-40 blur-2xl"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden
      />
      <div className="rounded-[2.5rem] border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface-alt)] p-3 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <MockupFrame>
      <div className="overflow-hidden rounded-[2rem] bg-[#FFF8F2] text-[#1A1A2E]">
        <div className="px-6 py-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#C06070]">
            The Wedding Of
          </p>
          <p className="mt-3 font-display text-2xl italic text-[#C06070]">
            Anisa &amp; Rizky
          </p>
          <p className="mt-3 text-xs text-[#5A5A72]">Sabtu, 15 November 2026</p>
          <div className="mt-6 flex items-center justify-center gap-3 text-[#D4A574]">
            <span className="h-px w-10 bg-current" />
            <span>♡</span>
            <span className="h-px w-10 bg-current" />
          </div>
          <div
            className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white"
            style={{ background: "#C06070" }}
          >
            ♡
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function DashboardMockup() {
  return (
    <MockupFrame>
      <div className="space-y-2 rounded-[2rem] bg-[#FAFAFA] p-4 text-[#1A1A2E]">
        <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-[#E8EEF5]" />
            <div>
              <p className="text-xs font-medium">Bpk. Budi Santoso</p>
              <p className="text-[10px] text-[#8A8A9A]">+62 812 ···</p>
            </div>
          </div>
          <span className="rounded-full bg-[#E8F3EE] px-2 py-0.5 text-[10px] text-[#3B7A57]">
            Hadir
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-[#F9EDEF]" />
            <div>
              <p className="text-xs font-medium">Ibu Sarah</p>
              <p className="text-[10px] text-[#8A8A9A]">+62 821 ···</p>
            </div>
          </div>
          <span className="rounded-full bg-[#E8EEF5] px-2 py-0.5 text-[10px] text-[#1E3A5F]">
            Dibuka
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-[#FBF4EC]" />
            <div>
              <p className="text-xs font-medium">Pak Hadi &amp; Keluarga</p>
              <p className="text-[10px] text-[#8A8A9A]">+62 857 ···</p>
            </div>
          </div>
          <span className="rounded-full bg-[#FBF4EC] px-2 py-0.5 text-[10px] text-[#B8926A]">
            Diundang
          </span>
        </div>
      </div>
    </MockupFrame>
  );
}

function WaMockup() {
  return (
    <MockupFrame>
      <div className="rounded-[2rem] bg-[#0B141A] p-4 text-white">
        <p className="mb-3 text-center text-[10px] text-white/50">
          WhatsApp · uwu Broadcast
        </p>
        <div className="space-y-2">
          <div className="rounded-xl bg-[#005C4B] p-3 text-xs leading-relaxed">
            Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i{" "}
            <span className="font-semibold">Budi Santoso</span> untuk menghadiri
            acara pernikahan kami…
          </div>
          <div className="flex justify-end gap-1 text-[10px] text-white/60">
            <span>12:34</span>
            <span>✓✓</span>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function AnalyticsMockup() {
  return (
    <MockupFrame>
      <div className="space-y-3 rounded-[2rem] bg-[#FAFAFA] p-5 text-[#1A1A2E]">
        <p className="text-[10px] uppercase tracking-wide text-[#8A8A9A]">
          Respons hari ini
        </p>
        <p className="font-display text-3xl">247</p>
        <p className="text-[11px] text-[#5A5A72]">182 orang dikonfirmasi hadir</p>
        <div className="space-y-1.5 pt-2">
          {[
            { label: "Dibuka", pct: 88, color: "#8B9DC3" },
            { label: "Merespons", pct: 73, color: "#D4A574" },
            { label: "Hadir", pct: 62, color: "#3B7A57" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-[10px]">
                <span>{row.label}</span>
                <span className="text-[#8A8A9A]">{row.pct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E8EEF5]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${row.pct}%`, background: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupFrame>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24">
      <div className="mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-xs uppercase tracking-[0.3em] text-ink-muted"
        >
          A Love Story, Beautifully Told.
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
          className="mt-4 font-display text-5xl leading-tight text-ink md:text-6xl"
        >
          Undangan pernikahan digital,{" "}
          <span className="italic text-navy">dibuat untuk Anda.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted"
        >
          Desain elegan, manajemen tamu cerdas, broadcast WhatsApp otomatis, dan
          analytics real-time. Semua yang Anda butuhkan untuk undangan digital
          yang berkelas.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="rounded-full bg-coral px-8 py-3 font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Mulai Gratis
          </Link>
          <Link
            href="/tema"
            className="rounded-full border border-[color:var(--border-medium)] px-8 py-3 font-medium text-navy transition-colors hover:bg-surface-muted"
          >
            Lihat Tema
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-3 text-gold"
        >
          <span className="h-px w-14 bg-current" />
          <span>♡</span>
          <span className="h-px w-14 bg-current" />
        </motion.div>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-4 px-2 md:grid-cols-3">
        {[
          { n: "300+", label: "pasangan sudah bergabung" },
          { n: "50K+", label: "tamu diundang lewat uwu" },
          { n: "99.9%", label: "uptime undangan" },
        ].map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
            className="rounded-2xl bg-surface-card p-5 text-center shadow-ghost-sm"
          >
            <p className="font-display text-3xl text-navy">{s.n}</p>
            <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function HomeSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-muted md:text-base">
                {description}
              </p>
            )}
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>{children}</ScrollReveal>
      </div>
    </section>
  );
}

export function HomeFeatureGrid() {
  const features = [
    {
      icon: "🎨",
      title: "True Responsive Dashboard",
      body:
        "Kelola undangan dari ponsel dengan pengalaman asli mobile — bukan sekadar miniatur desktop.",
    },
    {
      icon: "✨",
      title: "AI Copywriter",
      body:
        "Biarkan AI bantu menulis cerita cinta, ucapan, dan balasan pesan — dalam bahasa Indonesia, Inggris, atau Arab.",
    },
    {
      icon: "📊",
      title: "Smart Analytics",
      body:
        "Funnel RSVP, sumber tamu yang paling aktif, dan kurva pembukaan — bukan sekadar angka total.",
    },
    {
      icon: "💬",
      title: "Broadcast WhatsApp",
      body:
        "Kirim undangan personal ke 300 tamu sekaligus. Template otomatis menyesuaikan preferensi budaya.",
    },
    {
      icon: "🕌",
      title: "Sensitif secara budaya",
      body:
        "Pilih nada formal Islami, umum, atau kustom — template, mute musik default, dan AI menyesuaikan.",
    },
    {
      icon: "⚡",
      title: "Loading instan",
      body:
        "Halaman undangan muat di bawah 1.5 detik di jaringan 4G. Tamu tidak menunggu.",
    },
  ];

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map((f, idx) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: idx * 0.05 }}
          className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-50 text-2xl">
            {f.icon}
          </div>
          <h3 className="mt-4 font-display text-lg text-ink">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

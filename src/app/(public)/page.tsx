import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { HomeHero, HomeFeatures } from "./home-parts";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { PricingGrid } from "@/components/public/PricingGrid";

export const revalidate = 3600;

export const metadata = {
  title: "uwu — A Love Story, Beautifully Told.",
  description:
    "Undangan pernikahan digital untuk pasangan Indonesia. Desain elegan, manajemen tamu cerdas, broadcast WhatsApp otomatis, analytics real-time.",
};

const PACKAGE_ORDER: Record<string, number> = {
  starter: 0,
  lite: 1,
  pro: 2,
  premium: 3,
  ultimate: 4,
};

const TESTIMONIALS = [
  {
    couple: "Anisa & Rizky",
    date: "November 2026",
    quote:
      "Set up dalam sore, dan tamu kami langsung kagum. RSVP-nya tinggi banget — 92% kehadiran.",
  },
  {
    couple: "Maya & Fadhil",
    date: "September 2026",
    quote:
      "Paket PRO benar-benar worth it. Broadcast WhatsApp ke 300 tamu otomatis, tidak perlu copy-paste satu per satu.",
  },
  {
    couple: "Sekar & Bima",
    date: "Juli 2026",
    quote:
      "Desainnya elegan. Orangtua pun suka karena ada template Islami yang formal. Recommended!",
  },
];

export default async function HomePage() {
  const rows = await db.select().from(packages).orderBy(asc(packages.priceIdr));
  const sorted = rows.sort(
    (a, b) => (PACKAGE_ORDER[a.tier] ?? 99) - (PACKAGE_ORDER[b.tier] ?? 99),
  );

  return (
    <main>
      <HomeHero />
      <HomeFeatures />
      <CulturalShowcase />

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
                Harga
              </p>
              <h2 className="mt-4 font-display text-4xl text-white md:text-5xl">
                Pilih paket yang pas untuk Anda
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-[color:var(--color-dark-text-secondary)] md:text-base">
                Bayar sekali, akses selamanya. Tanpa biaya langganan.
              </p>
            </div>
          </ScrollReveal>

          <PricingGrid packages={sorted} />

          <p className="mt-8 text-center text-xs text-[color:var(--color-dark-text-muted)]">
            Pembayaran aman via Midtrans. Sekali bayar, akses selamanya.
          </p>
        </div>
      </section>

      <Testimonials />

      <section className="px-6 py-24">
        <ScrollReveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[color:var(--dark-border-hover)] bg-[color:var(--color-dark-surface)] px-8 py-14 text-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{ background: "var(--brand-gradient-dim)" }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="font-display text-3xl text-white md:text-4xl">
                Siap membuat undangan digital yang berkesan?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-[color:var(--color-dark-text-secondary)]">
                Bergabunglah dengan ribuan pasangan lainnya.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-10 py-4 text-base font-medium text-white shadow-[0_10px_40px_-12px_rgba(232,160,160,0.7)] transition-transform hover:scale-105"
              >
                Mulai Gratis Sekarang <span>→</span>
              </Link>
              <p className="mt-4 text-xs text-[color:var(--color-dark-text-muted)]">
                Gratis untuk 25 tamu pertama. Tanpa kartu kredit.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}

function CulturalShowcase() {
  const cards = [
    {
      label: "Islami",
      title: "Nuansa sakral & penuh berkah",
      body: "Pembuka salam, kutipan ayat Al-Quran, dan tone formal yang menghormati tradisi.",
      accent: "linear-gradient(135deg, #3B7A57, #D4A574)",
    },
    {
      label: "Modern Minimalis",
      title: "Elegan, bersih, timeless",
      body: "Tipografi halus, palet netral, dan komposisi yang memberi ruang pada cerita Anda.",
      accent: "linear-gradient(135deg, #8B9DC3, #B8A0D0)",
    },
    {
      label: "Adat & Tradisional",
      title: "Kaya motif, hangat personal",
      body: "Ornamen khas Nusantara dan warna-warna earth tone untuk pernikahan berbudaya.",
      accent: "linear-gradient(135deg, #C06070, #D4A574)",
    },
  ];
  return (
    <section className="bg-[color:var(--color-dark-surface)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
              Untuk setiap momen spesial
            </p>
            <h2 className="mt-4 font-display text-4xl text-white md:text-5xl">
              Menghormati tradisi, merayakan cinta
            </h2>
          </div>
        </ScrollReveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((c, idx) => (
            <ScrollReveal key={c.label} delay={idx * 0.1}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-[color:var(--dark-border)] bg-[color:var(--color-dark-bg)] p-6 transition-all hover:-translate-y-1 hover:border-[color:var(--color-gold)]">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80"
                  style={{ background: c.accent }}
                  aria-hidden
                />
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-gold)]">
                  {c.label}
                </p>
                <h3 className="mt-3 font-display text-xl text-white">
                  {c.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-dark-text-secondary)]">
                  {c.body}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
              Testimoni
            </p>
            <h2 className="mt-4 font-display text-4xl text-white md:text-5xl">
              Kata mereka tentang uwu
            </h2>
          </div>
        </ScrollReveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <ScrollReveal key={t.couple} delay={idx * 0.1}>
              <article className="flex h-full flex-col rounded-2xl border border-[color:var(--dark-border)] bg-[color:var(--color-dark-surface)] p-6">
                <span
                  className="font-display text-5xl leading-none text-[color:var(--color-gold)]"
                  aria-hidden
                >
                  “
                </span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--color-dark-text)]">
                  {t.quote}
                </p>
                <div className="mt-6 border-t border-[color:var(--dark-border)] pt-4">
                  <p className="font-display text-base text-white">
                    {t.couple}
                  </p>
                  <p className="text-xs text-[color:var(--color-dark-text-muted)]">
                    {t.date}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

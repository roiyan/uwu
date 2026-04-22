import Link from "next/link";
import { HomeHero, HomeSection, HomeFeatureGrid } from "./home-parts";

export const metadata = {
  title: "uwu — A Love Story, Beautifully Told.",
  description:
    "Platform undangan pernikahan digital untuk pasangan Indonesia. Kelola tamu, kirim via WhatsApp, terima RSVP — semua di satu tempat.",
};

export default function HomePage() {
  return (
    <main>
      <HomeHero />

      <HomeSection
        eyebrow="Dibangun untuk pasangan Indonesia"
        title="Lebih dari sekadar undangan"
        description="uwu menggabungkan desain elegan, manajemen tamu yang cerdas, dan analitik RSVP dalam satu platform. Tanpa repot, tanpa lembar kerja."
      >
        <HomeFeatureGrid />
      </HomeSection>

      <HomeSection
        eyebrow="Bagaimana cara kerjanya"
        title="Dari ide jadi kenyataan dalam 4 langkah"
      >
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            {
              n: "01",
              title: "Daftar gratis",
              body: "Buat akun dalam hitungan detik — tanpa kartu kredit.",
            },
            {
              n: "02",
              title: "Pilih tema",
              body: "Pilih dari pustaka tema premium dan sesuaikan warnanya.",
            },
            {
              n: "03",
              title: "Tambah tamu",
              body: "Import atau tambah satu per satu. Setiap tamu dapat link unik.",
            },
            {
              n: "04",
              title: "Kirim & pantau",
              body: "Broadcast via WhatsApp, terima RSVP, pantau analytics real-time.",
            },
          ].map((step) => (
            <li
              key={step.n}
              className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm"
            >
              <p className="font-display text-3xl text-gold-dark">{step.n}</p>
              <p className="mt-3 font-display text-lg text-ink">{step.title}</p>
              <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </HomeSection>

      <HomeSection
        eyebrow="Sensitif secara budaya"
        title="Template yang menghormati tradisi Anda"
        description="Pilih nada formal Islami, formal umum, atau kustom. Template broadcast dan nada AI akan menyesuaikan secara otomatis."
      >
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              tag: "Islami",
              body:
                "Assalamu'alaikum Warahmatullahi Wabarakatuh. Dengan memohon rahmat dan ridha Allah SWT...",
              palette: ["#3B7A57", "#E8F3EE", "#D4A574"],
            },
            {
              tag: "Formal Umum",
              body:
                "Dengan hormat, bersama ini kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami...",
              palette: ["#1E3A5F", "#E8EEF5", "#D4A574"],
            },
            {
              tag: "Santai",
              body:
                "Hi sobat! Tanpa terasa hari bahagia kami tiba juga. Yuk, jadi bagian dari momen spesial kami...",
              palette: ["#C06070", "#F9EDEF", "#E8917E"],
            },
          ].map((card) => (
            <div
              key={card.tag}
              className="rounded-2xl p-5 shadow-ghost-sm"
              style={{ background: card.palette[1] }}
            >
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ background: card.palette[0] }}
              >
                {card.tag}
              </span>
              <p
                className="mt-4 text-sm italic leading-relaxed"
                style={{ color: card.palette[0] }}
              >
                “{card.body}”
              </p>
            </div>
          ))}
        </div>
      </HomeSection>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-navy via-navy-dark to-[#0F1F38] px-8 py-14 text-center text-white shadow-ghost-lg">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">
            Siap memulai?
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">
            Ceritakan kisah cinta Anda dengan indah.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
            Buat undangan pertama Anda gratis. Upgrade kapan saja saat daftar
            tamu Anda bertambah.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
            >
              Mulai Gratis
            </Link>
            <Link
              href="/harga"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Lihat Harga
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

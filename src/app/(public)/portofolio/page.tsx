import Link from "next/link";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const metadata = {
  title: "Portofolio — uwu Wedding Platform",
  description:
    "Inspirasi undangan digital dari pasangan-pasangan uwu. Lihat bagaimana mereka menceritakan kisah cinta mereka.",
};

const SHOWCASES = [
  {
    couple: "Anisa & Rizky",
    tagline: "Pernikahan Nusantara — paduan Jawa & Minang.",
    palette: { primary: "#1E3A5F", secondary: "#E8EEF5", accent: "#D4A574" },
    theme: "Navy Elegance",
    guests: 287,
    attendanceRate: "92%",
  },
  {
    couple: "Sekar & Bima",
    tagline: "Akad intim dengan tema sakura dreams.",
    palette: { primary: "#C06070", secondary: "#F9EDEF", accent: "#E8917E" },
    theme: "Sakura Dreams",
    guests: 120,
    attendanceRate: "88%",
  },
  {
    couple: "Maya & Fadhil",
    tagline: "Resepsi pantai dengan nuansa rose gold.",
    palette: { primary: "#C06070", secondary: "#FFF8F2", accent: "#D4A574" },
    theme: "Rose Gold Luxe",
    guests: 450,
    attendanceRate: "95%",
  },
];

export default function PortofolioPage() {
  return (
    <main className="px-6 pb-20 pt-14">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">
              Portofolio
            </p>
            <h1 className="mt-3 font-display text-4xl text-navy md:text-5xl">
              Cerita cinta yang{" "}
              <span className="italic">kami bantu ceritakan</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-muted md:text-base">
              Contoh nyata pasangan yang telah menggunakan uwu untuk mengundang
              tamu mereka. Angka tingkat kehadiran adalah data anonim dengan izin.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SHOWCASES.map((s, idx) => (
            <ScrollReveal key={s.couple} delay={idx * 0.1}>
              <article className="overflow-hidden rounded-2xl bg-surface-card shadow-ghost-sm">
                <div
                  className="flex h-56 flex-col items-center justify-center text-center"
                  style={{ background: s.palette.secondary }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: s.palette.primary }}
                  >
                    The Wedding Of
                  </p>
                  <h2
                    className="mt-3 font-display text-2xl italic"
                    style={{ color: s.palette.primary }}
                  >
                    {s.couple}
                  </h2>
                  <div
                    className="mt-4 flex items-center gap-3"
                    style={{ color: s.palette.accent }}
                  >
                    <span className="h-px w-10 bg-current" />
                    <span>♡</span>
                    <span className="h-px w-10 bg-current" />
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="rounded-full px-2 py-0.5 font-medium uppercase tracking-wide"
                      style={{ background: s.palette.accent, color: "#1A1A2E" }}
                    >
                      {s.theme}
                    </span>
                    <span className="text-ink-hint">{s.guests} tamu</span>
                  </div>
                  <p className="text-sm text-ink-muted">{s.tagline}</p>
                  <div className="flex items-center justify-between border-t border-[color:var(--border-ghost)] pt-3">
                    <span className="text-xs text-ink-hint">
                      Tingkat kehadiran
                    </span>
                    <span
                      className="font-display text-lg"
                      style={{ color: s.palette.primary }}
                    >
                      {s.attendanceRate}
                    </span>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <section className="mt-16 rounded-3xl bg-gradient-to-br from-navy to-navy-dark p-10 text-center text-white">
          <h2 className="font-display text-3xl md:text-4xl">
            Tertarik ditampilkan di sini?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
            Setelah acara Anda selesai, kami dengan senang hati berdiskusi untuk
            menampilkan cerita Anda sebagai inspirasi pasangan lain.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-full bg-coral px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
          >
            Mulai Undangan Anda
          </Link>
        </section>
      </div>
    </main>
  );
}

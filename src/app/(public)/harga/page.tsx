import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const revalidate = 3600;

export const metadata = {
  title: "Harga — uwu Wedding Platform",
  description:
    "Paket undangan digital mulai dari gratis. Bayar sekali, tanpa biaya bulanan.",
};

const PACKAGE_ORDER: Record<string, number> = {
  starter: 0,
  lite: 1,
  pro: 2,
  premium: 3,
  ultimate: 4,
};

function formatIdr(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function HargaPage() {
  const rows = await db.select().from(packages).orderBy(asc(packages.priceIdr));
  const sorted = rows.sort(
    (a, b) => (PACKAGE_ORDER[a.tier] ?? 99) - (PACKAGE_ORDER[b.tier] ?? 99),
  );

  return (
    <main className="px-6 pb-20 pt-14">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">
              Harga
            </p>
            <h1 className="mt-3 font-display text-4xl text-navy md:text-5xl">
              Bayar sekali. <span className="italic">Tenang seumur hidup.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-ink-muted md:text-base">
              Pilih paket yang sesuai. Semua paket sudah termasuk hosting,
              enkripsi TLS, dan update gratis. Tanpa biaya tersembunyi.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {sorted.map((pkg) => {
            const isRecommended = pkg.tier === "pro";
            return (
              <article
                key={pkg.id}
                className={`flex flex-col rounded-2xl bg-surface-card p-6 shadow-ghost-sm ${
                  isRecommended
                    ? "ring-2 ring-coral lg:scale-105"
                    : "ring-1 ring-[color:var(--border-ghost)]"
                }`}
              >
                {isRecommended && (
                  <span className="mb-3 inline-flex w-max items-center gap-1 rounded-full bg-coral px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                    ⭐ Paling Populer
                  </span>
                )}
                <h2 className="font-display text-2xl text-ink">{pkg.name}</h2>
                <p className="mt-3 font-display text-3xl text-navy">
                  {pkg.priceIdr === 0 ? "Gratis" : formatIdr(pkg.priceIdr)}
                </p>
                <p className="text-xs text-ink-hint">
                  {pkg.priceIdr === 0 ? "selamanya" : "sekali bayar"}
                </p>
                <hr className="my-5 border-[color:var(--border-ghost)]" />
                <ul className="flex-1 space-y-2 text-sm text-ink-muted">
                  <li className="flex gap-2">
                    <span className="text-gold-dark">♡</span>
                    <span>{pkg.guestLimit} tamu</span>
                  </li>
                  <li className="flex gap-2">
                    <span className={pkg.whatsappEnabled ? "text-gold-dark" : "text-ink-hint"}>
                      {pkg.whatsappEnabled ? "♡" : "—"}
                    </span>
                    <span className={pkg.whatsappEnabled ? "" : "text-ink-hint"}>
                      Broadcast WhatsApp
                    </span>
                  </li>
                  {pkg.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-gold-dark">♡</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-6 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                    isRecommended
                      ? "bg-coral text-white hover:bg-coral-dark"
                      : "border border-[color:var(--border-medium)] text-navy hover:bg-surface-muted"
                  }`}
                >
                  {pkg.priceIdr === 0 ? "Mulai Gratis" : `Pilih ${pkg.name}`}
                </Link>
              </article>
            );
          })}
        </div>

        <ScrollReveal>
          <section className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Keamanan & privasi",
                body:
                  "Semua data tamu dienkripsi. Tidak ada pihak ketiga yang bisa mengaksesnya.",
              },
              {
                title: "Uptime 99.9%",
                body:
                  "Undangan Anda tetap tayang di hari-H, bahkan ketika 500+ tamu membuka bersamaan.",
              },
              {
                title: "Tanpa langganan",
                body:
                  "Bayar sekali untuk satu acara pernikahan. Tidak ada recurring billing.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm"
              >
                <h3 className="font-display text-lg text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
              </div>
            ))}
          </section>
        </ScrollReveal>
      </div>
    </main>
  );
}

import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { PricingGrid } from "@/components/public/PricingGrid";

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

export default async function HargaPage() {
  const rows = await db.select().from(packages).orderBy(asc(packages.priceIdr));
  const sorted = rows.sort(
    (a, b) => (PACKAGE_ORDER[a.tier] ?? 99) - (PACKAGE_ORDER[b.tier] ?? 99),
  );

  return (
    <main className="px-6 pb-24 pt-14">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
              Harga
            </p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Bayar sekali. <span className="italic text-gradient">Tenang seumur hidup.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[color:var(--color-dark-text-secondary)] md:text-base">
              Semua paket sudah termasuk hosting, enkripsi TLS, dan update gratis.
              Tanpa biaya tersembunyi.
            </p>
          </div>
        </ScrollReveal>

        <PricingGrid packages={sorted} />

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
                className="rounded-2xl border border-[color:var(--dark-border)] bg-[color:var(--color-dark-surface)] p-6"
              >
                <h3 className="font-display text-lg text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--color-dark-text-secondary)]">
                  {item.body}
                </p>
              </div>
            ))}
          </section>
        </ScrollReveal>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { requireSessionUserFast } from "@/lib/auth-guard";
import {
  getMidtransClientKey,
  getSnapJsUrl,
  isMidtransConfigured,
} from "@/lib/providers/midtrans";
import { CheckoutClient } from "./client";

type Search = { tier?: string };

function formatIdr(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireSessionUserFast();
  const params = await searchParams;
  const tier = params.tier ?? "";

  if (!tier || !["lite", "pro", "premium", "ultimate"].includes(tier)) {
    redirect("/dashboard/packages");
  }

  const [pkg] = await db
    .select()
    .from(packages)
    .where(eq(packages.tier, tier as "lite" | "pro" | "premium" | "ultimate"))
    .limit(1);
  if (!pkg) redirect("/dashboard/packages");

  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-hint">
          Checkout
        </p>
        <h1 className="mt-1 font-display text-3xl text-navy">
          Upgrade ke Paket {pkg.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pembayaran diproses secara aman melalui Midtrans.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <CheckoutClient
            tier={pkg.tier}
            packageName={pkg.name}
            amount={pkg.priceIdr}
            formattedAmount={formatIdr(pkg.priceIdr)}
            snapJsUrl={getSnapJsUrl()}
            clientKey={getMidtransClientKey()}
            midtransConfigured={isMidtransConfigured()}
          />
        </section>

        <aside className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
          <h2 className="font-display text-lg text-ink">Yang Anda dapatkan</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {pkg.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-gold-dark">♡</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-surface-muted/70 p-4">
            <p className="text-xs uppercase tracking-wide text-ink-hint">Total</p>
            <p className="mt-1 font-display text-2xl text-ink">
              {formatIdr(pkg.priceIdr)}
            </p>
            <p className="text-xs text-ink-muted">
              Sekali bayar • berlaku untuk acara aktif Anda.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

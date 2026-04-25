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
    <main className="flex-1 px-5 py-8 lg:px-12 lg:py-12">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px w-10"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--d-coral) 100%)",
            }}
          />
          <p className="d-eyebrow">Checkout</p>
        </div>
        <h1 className="d-serif mt-3 text-[40px] font-extralight leading-[1.05] tracking-[-0.01em] text-[var(--d-ink)] md:text-[48px]">
          Upgrade ke{" "}
          <em className="d-serif italic text-[var(--d-coral)]">{pkg.name}</em>.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--d-ink-dim)]">
          Pembayaran diproses secara aman melalui Midtrans.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
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

        <aside className="rounded-2xl bg-[var(--d-bg-card)] p-6 shadow-ghost-sm">
          <h2 className="font-display text-lg text-[var(--d-ink)]">Yang Anda dapatkan</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--d-ink-dim)]">
            {pkg.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[var(--d-gold)]">♡</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-[var(--d-bg-2)]/70 p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--d-ink-faint)]">Total</p>
            <p className="mt-1 font-display text-2xl text-[var(--d-ink)]">
              {formatIdr(pkg.priceIdr)}
            </p>
            <p className="text-xs text-[var(--d-ink-dim)]">
              Sekali bayar • berlaku untuk acara aktif Anda.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

import Link from "next/link";
import type { Package } from "@/lib/db/schema";

function formatIdr(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function PricingGrid({ packages }: { packages: Package[] }) {
  return (
    <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {packages.map((pkg) => (
        <PricingCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}

function PricingCard({ pkg }: { pkg: Package }) {
  const isPro = pkg.tier === "pro";

  // M-09 fix: skip the literal "X tamu" string from features because the guest
  // count is already rendered in the dedicated row below.
  const featuresWithoutGuestCount = pkg.features.filter(
    (f) => !/^\s*\d+\s*tamu/i.test(f),
  );

  // Outer wrapper carries the gradient border for the PRO tier. Inner card sits
  // 1px inside to let the gradient show through.
  const wrapperBase =
    "relative flex h-full flex-col rounded-2xl transition-all";
  const wrapperClass = isPro
    ? `${wrapperBase} p-[1.5px]`
    : `${wrapperBase} border border-[color:var(--dark-border)] bg-[color:var(--color-dark-surface)] hover:border-[color:var(--dark-border-hover)]`;

  return (
    <article
      className={wrapperClass}
      style={isPro ? { background: "var(--brand-gradient)" } : undefined}
    >
      <div
        className={`flex flex-1 flex-col rounded-2xl p-6 ${
          isPro
            ? "bg-[color:var(--color-dark-surface)]"
            : ""
        }`}
      >
        {isPro && (
          <span className="mb-3 inline-flex w-max items-center gap-1 rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
            ⭐ Paling Populer
          </span>
        )}
        <h3 className="font-display text-2xl text-white">{pkg.name}</h3>
        <p className="mt-3 font-display text-3xl text-white">
          {pkg.priceIdr === 0 ? "Gratis" : formatIdr(pkg.priceIdr)}
        </p>
        <p className="text-xs text-[color:var(--color-dark-text-muted)]">
          {pkg.priceIdr === 0 ? "selamanya" : "sekali bayar"}
        </p>
        <hr className="my-5 border-[color:var(--dark-border)]" />
        <ul className="flex-1 space-y-2 text-sm text-[color:var(--color-dark-text-secondary)]">
          <li className="flex items-center gap-2">
            <CheckIcon /> {pkg.guestLimit} tamu
          </li>
          <li className="flex items-center gap-2">
            {pkg.whatsappEnabled ? (
              <>
                <CheckIcon />
                <span>Broadcast WhatsApp</span>
              </>
            ) : (
              <>
                <MinusIcon />
                <span className="text-[color:var(--color-dark-text-muted)]">
                  Tanpa WhatsApp
                </span>
              </>
            )}
          </li>
          {featuresWithoutGuestCount.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckIcon />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/register"
          className={`mt-6 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors ${
            isPro
              ? "bg-gradient-brand text-white hover:shadow-[0_8px_24px_-8px_rgba(232,160,160,0.6)]"
              : "border border-[color:var(--color-gold)] text-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/10"
          }`}
        >
          {pkg.priceIdr === 0 ? "Mulai Gratis" : `Pilih ${pkg.name}`}
        </Link>
      </div>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-success)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-dark-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

import Link from "next/link";
import { dashboardNav } from "@/lib/nav/dashboard-items";

export default function MoreMenuPage() {
  const extras = dashboardNav.filter((i) => !i.primary);
  return (
    <main className="flex-1 px-6 py-8 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-navy">Lainnya</h1>
        <p className="mt-1 text-sm text-ink-muted">Menu tambahan untuk dashboard Anda.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {extras.map((item) => {
          const inner = (
            <div className="flex items-center justify-between rounded-2xl bg-surface-card p-5 shadow-ghost-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  {item.badge && (
                    <span className="mt-1 inline-block rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-dark">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-ink-hint">›</span>
            </div>
          );
          if (item.disabled) {
            return (
              <div key={item.href} aria-disabled className="cursor-not-allowed opacity-70">
                {inner}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </main>
  );
}

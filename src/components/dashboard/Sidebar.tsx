"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

type SidebarProps = {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  previewHref?: string;
};

export function Sidebar({ coupleLabel, themeLabel, previewHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-[260px] flex-col px-5 py-6 lg:flex"
      style={{
        background: "linear-gradient(180deg, #1E3A5F 0%, #142840 100%)",
        color: "#F5F5F7",
      }}
    >
      <BrandLogo href="/dashboard" size="lg" />

      <div className="mt-1 text-xs text-white/60">
        {coupleLabel ?? "Belum ada acara"}
        {themeLabel && (
          <>
            {" "}• <span className="text-white/85">{themeLabel}</span>
          </>
        )}
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {dashboardNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const base =
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors";
          const stateClass = item.disabled
            ? "cursor-not-allowed text-white/35"
            : active
              ? "bg-[color:var(--color-brand-blue)]/25 text-white font-medium shadow-[inset_3px_0_0_0_var(--color-brand-blue)]"
              : "text-white/80 hover:bg-white/10 hover:text-white";

          const inner = (
            <>
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.badge && (
                <span className="rounded-full bg-[color:var(--color-gold)]/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--color-gold-light)]">
                  {item.badge}
                </span>
              )}
            </>
          );

          return item.disabled ? (
            <span key={item.href} className={`${base} ${stateClass}`} aria-disabled>
              {inner}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={`${base} ${stateClass}`}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-white/15 pt-4">
        <Link
          href={previewHref ?? "#"}
          target={previewHref ? "_blank" : undefined}
          rel={previewHref ? "noreferrer" : undefined}
          aria-disabled={!previewHref}
          className={`block w-full rounded-full border px-4 py-2 text-center text-sm font-medium transition-colors ${
            previewHref
              ? "border-white/30 text-white hover:bg-white/10"
              : "cursor-not-allowed border-white/10 text-white/40"
          }`}
        >
          👁 Pratinjau Situs
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-full px-4 py-2 text-center text-sm text-white/60 transition-colors hover:text-white"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";

export function BottomTab() {
  const pathname = usePathname();
  const primary = dashboardNav.filter((i) => i.primary).slice(0, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--d-line)] backdrop-blur lg:hidden"
      style={{ background: "rgba(12, 12, 21, 0.92)" }}
    >
      {primary.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-[0.18em] ${
              active
                ? "font-medium text-[var(--d-coral)]"
                : "text-[var(--d-ink-dim)]"
            }`}
          >
            <span className="text-[15px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link
        href="/dashboard/more"
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-[0.18em] ${
          pathname.startsWith("/dashboard/more")
            ? "font-medium text-[var(--d-coral)]"
            : "text-[var(--d-ink-dim)]"
        }`}
      >
        <span className="text-[15px]">⋯</span>
        <span>Lainnya</span>
      </Link>
    </nav>
  );
}

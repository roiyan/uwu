"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/nav/dashboard-items";
import { signOutAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/shared/BrandLogo";

type SidebarProps = {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  packageLabel?: string | null;
  previewHref?: string;
  /** Adds the responsive `lg:flex` toggle. When rendered as a mobile
   *  drawer (via SidebarMobileDrawer below), pass false. */
  responsive?: boolean;
  /** Optional close handler shown only when the sidebar is rendered
   *  as a mobile drawer. */
  onCloseMobile?: () => void;
};

const ACCOUNT_GROUP = new Set([
  "/dashboard/settings",
  "/dashboard/packages",
]);

const HARI_H_GROUP = new Set([
  "/dashboard/checkin",
  "/dashboard/gifts",
]);

export function Sidebar({
  coupleLabel,
  themeLabel,
  packageLabel,
  previewHref,
  responsive = true,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const sidebarClass = [
    "relative w-[280px] flex-col overflow-hidden",
    responsive ? "hidden lg:flex" : "flex",
  ].join(" ");

  return (
    <aside
      className={sidebarClass}
      style={{ background: "var(--d-bg-1)", color: "var(--d-ink)" }}
    >
      {/* Soft brand glow that sits behind the brand block. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 12%, rgba(184, 157, 212, 0.10), transparent 55%), radial-gradient(circle at 80% 92%, rgba(240, 160, 156, 0.08), transparent 55%)",
        }}
      />

      <div className="relative flex h-full flex-col px-5 py-6">
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="absolute right-4 top-4 rounded-full border border-[var(--d-line-strong)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:bg-[var(--d-bg-2)]"
          >
            ✕ Tutup
          </button>
        )}

        {/* Brand section */}
        <div className="mb-2 flex items-center gap-2">
          <BrandLogo href="/dashboard" size="md" />
        </div>
        <p className="d-serif mt-2 truncate text-[20px] font-light leading-tight text-[var(--d-ink)]">
          {coupleLabel ?? "Belum ada acara"}
        </p>
        {(themeLabel || packageLabel) && (
          <div className="mt-2 flex items-center gap-2">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--d-gold)" }}
            />
            <p className="d-mono truncate text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
              {[themeLabel, packageLabel].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="mt-8 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {dashboardNav.map((item, idx) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const prev = dashboardNav[idx - 1];
            const showHariSeparator =
              prev && !HARI_H_GROUP.has(prev.href) && HARI_H_GROUP.has(item.href);
            const showAccountSeparator =
              prev && !ACCOUNT_GROUP.has(prev.href) && ACCOUNT_GROUP.has(item.href);

            return (
              <div key={item.href}>
                {showHariSeparator && <NavSeparator label="Hari H" />}
                {showAccountSeparator && <NavSeparator label="Akun" />}
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  disabled={item.disabled}
                  active={active}
                  onClick={onCloseMobile}
                />
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-6 space-y-2 border-t border-[var(--d-line)] pt-4">
          <Link
            href={previewHref ?? "#"}
            target={previewHref ? "_blank" : undefined}
            rel={previewHref ? "noreferrer" : undefined}
            aria-disabled={!previewHref}
            onClick={onCloseMobile}
            className={`d-mono flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-[11px] uppercase tracking-[0.22em] transition-colors ${
              previewHref
                ? "border-[var(--d-line-strong)] text-[var(--d-ink)] hover:bg-[var(--d-bg-2)]"
                : "cursor-not-allowed border-[var(--d-line)] text-[var(--d-ink-faint)]"
            }`}
          >
            <span aria-hidden>👁</span> Pratinjau Situs
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="d-mono w-full rounded-full px-4 py-2 text-center text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)] transition-colors hover:text-[var(--d-coral)]"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavSeparator({ label }: { label: string }) {
  return (
    <p className="d-mono mt-4 mb-2 px-3 text-[9px] uppercase tracking-[0.32em] text-[var(--d-ink-faint)]">
      {label}
    </p>
  );
}

function NavItem({
  href,
  label,
  icon,
  badge,
  disabled,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  const base =
    "group relative flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13px] transition-colors";
  const stateClass = disabled
    ? "cursor-not-allowed text-[var(--d-ink-faint)]"
    : active
      ? "bg-[rgba(240,160,156,0.06)] text-[var(--d-ink)]"
      : "text-[var(--d-ink-dim)] hover:bg-[var(--d-bg-2)] hover:text-[var(--d-ink)]";

  const inner = (
    <>
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
          style={{
            background:
              "linear-gradient(180deg, var(--d-coral) 0%, var(--d-peach) 100%)",
            boxShadow: "0 0 12px rgba(240, 160, 156, 0.55)",
          }}
        />
      )}
      <span className="flex items-center gap-3">
        <span
          className="text-[15px]"
          style={{ color: active ? "var(--d-coral)" : undefined }}
        >
          {icon}
        </span>
        <span className={active ? "font-medium" : undefined}>{label}</span>
      </span>
      {badge && (
        <span className="d-mono rounded-full bg-[var(--d-bg-2)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          {badge}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <span className={`${base} ${stateClass}`} aria-disabled>
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={`${base} ${stateClass}`}>
      {inner}
    </Link>
  );
}

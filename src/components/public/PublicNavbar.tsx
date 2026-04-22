"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/portofolio", label: "Portofolio" },
  { href: "/harga", label: "Harga" },
  { href: "/tema", label: "Tema" },
  { href: "/blog", label: "Blog", disabled: true },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[color:var(--border-ghost)] bg-surface-base/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="font-logo text-2xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
          >
            uwu
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              const base = "text-sm transition-colors";
              if (link.disabled) {
                return (
                  <span key={link.href} className={`${base} text-ink-hint`}>
                    {link.label}
                  </span>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${base} ${
                    active ? "font-medium text-navy" : "text-ink-muted hover:text-navy"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-surface-muted"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-dark"
            >
              Daftar Gratis
            </Link>
          </div>

          {/* Mobile header */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>

        {open && (
          <div className="border-t border-[color:var(--border-ghost)] bg-surface-card px-6 py-4 lg:hidden">
            <nav className="space-y-2">
              {LINKS.map((link) =>
                link.disabled ? (
                  <span
                    key={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-ink-hint"
                  >
                    {link.label}
                  </span>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--border-medium)] px-5 py-2 text-center text-sm font-medium text-navy"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-full bg-coral px-5 py-2 text-center text-sm font-medium text-white"
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function PublicBottomTab() {
  const pathname = usePathname();
  const items = LINKS.slice(0, 4);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[color:var(--border-ghost)] bg-surface-card lg:hidden">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[11px] text-ink-hint"
            >
              <span className="text-base">•</span>
              <span>{item.label}</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
              active ? "text-navy font-medium" : "text-ink-muted"
            }`}
          >
            <span className="text-base">♡</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

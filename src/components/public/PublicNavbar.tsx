"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/portofolio", label: "Portofolio" },
  { href: "/harga", label: "Harga" },
  { href: "/tema", label: "Tema" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[color:var(--dark-border)] bg-[#0A0A0F]/75 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-logo text-2xl text-gradient">
          uwu
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  active
                    ? "font-medium text-white"
                    : "text-[color:var(--color-dark-text-secondary)] hover:text-white"
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
            className="text-sm text-[color:var(--color-dark-text-secondary)] transition-colors hover:text-white"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(139,157,195,0.6)] transition-transform hover:scale-105"
          >
            Mulai Gratis
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <span className="text-xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-[color:var(--dark-border)] bg-[#0A0A0F]/95 px-6 py-4 backdrop-blur-xl lg:hidden">
          <nav className="space-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-[color:var(--color-dark-text)] hover:bg-[color:var(--color-dark-surface)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[color:var(--dark-border-hover)] px-5 py-2 text-center text-sm font-medium text-[color:var(--color-dark-text)]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-full bg-gradient-brand px-5 py-2 text-center text-sm font-medium text-white"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicBottomTab() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[color:var(--dark-border)] bg-[#0A0A0F]/95 backdrop-blur-xl lg:hidden">
      {LINKS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
              active
                ? "font-medium text-white"
                : "text-[color:var(--color-dark-text-secondary)]"
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

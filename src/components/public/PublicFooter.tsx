import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--border-ghost)] bg-surface-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <Link
            href="/"
            className="font-logo text-2xl bg-gradient-to-r from-brand-blue via-brand-lavender to-brand-pink bg-clip-text text-transparent"
          >
            uwu
          </Link>
          <p className="mt-3 text-sm text-ink-muted">
            A Love Story, Beautifully Told.
          </p>
        </div>

        <FooterCol
          title="Produk"
          links={[
            { label: "Tema", href: "/tema" },
            { label: "Portofolio", href: "/portofolio" },
            { label: "Harga", href: "/harga" },
          ]}
        />
        <FooterCol
          title="Akun"
          links={[
            { label: "Masuk", href: "/login" },
            { label: "Daftar Gratis", href: "/register" },
          ]}
        />
        <FooterCol
          title="Bantuan"
          links={[
            { label: "FAQ", href: "#", disabled: true },
            { label: "Kontak", href: "#", disabled: true },
          ]}
        />
      </div>

      <div className="border-t border-[color:var(--border-ghost)] px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-ink-hint">
          <p>© 2026 uwu Wedding Platform</p>
          <div className="flex gap-2 text-gold">
            <span className="h-px w-10 bg-current" />
            <span>♡</span>
            <span className="h-px w-10 bg-current" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; disabled?: boolean }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-hint">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) =>
          l.disabled ? (
            <li key={l.label} className="text-ink-hint">
              {l.label}
            </li>
          ) : (
            <li key={l.label}>
              <Link href={l.href} className="text-ink-muted hover:text-navy">
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

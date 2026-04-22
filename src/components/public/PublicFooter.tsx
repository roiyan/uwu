import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--dark-border)] bg-[#0A0A0F] text-[color:var(--color-dark-text-secondary)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <BrandLogo href="/" size="md" />
          <p className="mt-3 text-sm">A Love Story, Beautifully Told.</p>
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
          title="Perusahaan"
          links={[
            { label: "Tentang", href: "#", disabled: true },
            { label: "Bantuan", href: "#", disabled: true },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: "Ketentuan Layanan", href: "/terms" },
            { label: "Privasi", href: "/terms" },
          ]}
        />
      </div>

      <div className="border-t border-[color:var(--dark-border)] px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs">
          <p>© 2026 uwu Wedding Platform · A Love Story, Beautifully Told.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
              aria-label="Instagram"
            >
              Instagram ↗
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-white"
              aria-label="YouTube"
            >
              YouTube ↗
            </a>
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
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-dark-text-muted)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) =>
          l.disabled ? (
            <li key={l.label} className="text-[color:var(--color-dark-text-muted)]">
              {l.label}
            </li>
          ) : (
            <li key={l.label}>
              <Link href={l.href} className="transition-colors hover:text-white">
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

import Link from "next/link";

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingSection() {
  return (
    <section className="pricing-section" id="investment">
      <div className="chapter-head">
        <div>
          <div className="chapter-label">Chapter 04 — Investment</div>
          <h2 className="chapter-title">
            Harga yang pantas
            <br />
            untuk <em>awal cerita.</em>
          </h2>
        </div>
        <p className="chapter-lead">
          Harga spesial peluncuran — hanya sampai 31 Desember. Tanpa biaya
          tersembunyi. Apa yang kalian lihat adalah apa yang kalian bayar.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Silk */}
        <article className="price-card">
          <h3 className="price-name">Silk</h3>
          <p className="price-tagline">
            Untuk intimate wedding hingga 100 tamu.
          </p>
          <div className="price-amt">
            <span className="price-currency">Rp</span>
            <span className="price-num">399K</span>
          </div>
          <div className="price-old">Normalnya Rp 599K</div>
          <ul className="price-features">
            <li>
              <Check />1 template signature
            </li>
            <li>
              <Check />
              Subdomain uwu.id/kalian
            </li>
            <li>
              <Check />
              Countdown &amp; Google Maps
            </li>
            <li>
              <Check />
              RSVP &amp; ucapan tamu
            </li>
            <li>
              <Check />
              Masa aktif 12 bulan
            </li>
          </ul>
          <Link href="/register?tier=silk" className="btn btn-outline btn-large">
            Pilih Silk
          </Link>
        </article>

        {/* Velvet Edition — featured */}
        <article className="price-card featured">
          <div className="price-badge">★ Paling Dipilih</div>
          <h3 className="price-name">
            Velvet <em>Edition</em>
          </h3>
          <p className="price-tagline">
            Pilihan 78% couple kami. Lengkap &amp; cinematic.
          </p>
          <div className="price-amt">
            <span className="price-currency">Rp</span>
            <span className="price-num">899K</span>
          </div>
          <div className="price-old">Normalnya Rp 1.299K</div>
          <ul className="price-features">
            <li>
              <Check />
              Semua fitur Silk
            </li>
            <li>
              <Check />
              Domain pribadi .com
            </li>
            <li>
              <Check />
              Galeri prewedding + musik
            </li>
            <li>
              <Check />
              Live streaming embed
            </li>
            <li>
              <Check />
              Digital amplop (QRIS)
            </li>
            <li>
              <Check />
              Hosting selamanya
            </li>
          </ul>
          <Link href="/register?tier=velvet" className="btn btn-primary btn-large">
            <span>Pilih Velvet</span>
          </Link>
        </article>

        {/* Couture */}
        <article className="price-card">
          <h3 className="price-name">
            <em>Couture</em>
          </h3>
          <p className="price-tagline">
            Custom dari nol, dengan art director pribadi.
          </p>
          <div className="price-amt">
            <span className="price-currency">Rp</span>
            <span className="price-num">
              3.5<span className="jt">Jt</span>
            </span>
          </div>
          <div className="price-old">Mulai dari · konsultasi gratis</div>
          <ul className="price-features">
            <li>
              <Check />
              Desain 100% custom
            </li>
            <li>
              <Check />
              Art director dedicated
            </li>
            <li>
              <Check />
              Animasi &amp; interaksi unik
            </li>
            <li>
              <Check />
              Fotografi &amp; videografi opsional
            </li>
            <li>
              <Check />
              Revisi unlimited
            </li>
            <li>
              <Check />
              Concierge 24/7
            </li>
          </ul>
          <Link href="/register?tier=couture" className="btn btn-outline btn-large">
            Konsultasi Privat
          </Link>
        </article>
      </div>
    </section>
  );
}

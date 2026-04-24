"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

function Newsletter() {
  const [label, setLabel] = useState("Berlangganan");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setLabel("✓ Terkirim");
    if (inputRef.current) inputRef.current.value = "";
    window.setTimeout(() => {
      setLabel("Berlangganan");
      setSubmitting(false);
    }, 2000);
  }

  return (
    <div className="newsletter">
      <div className="newsletter-bg" aria-hidden="true" />
      <div>
        <div className="chapter-label" style={{ color: "var(--coral)" }}>
          The Journal
        </div>
        <h3>
          Surat bulanan untuk
          <br />
          yang <em>sedang merencanakan.</em>
        </h3>
        <p>
          Sekali sebulan, kami kirim tips pernikahan, behind-the-scenes, dan
          diskon eksklusif. Tidak pernah spam.
        </p>
      </div>
      <div>
        <form className="newsletter-form" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="email"
            required
            placeholder="Email kalian…"
            aria-label="Email"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            <span>{label}</span>
          </button>
        </form>
        <div className="newsletter-meta">
          <span className="dot" />
          <span>2,340 couple sudah berlangganan</span>
        </div>
      </div>
    </div>
  );
}

export function HomepageFooter() {
  return (
    <footer className="home-footer">
      <Newsletter />

      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="nav-logo" aria-label="uwu">
            <Image
              src="/images/homepage/uwu-logo.svg"
              alt=""
              width={26}
              height={18}
            />
          </Link>
          <p>
            Couture digital invitations, diukir untuk cerita yang layak
            diabadikan. Didirikan di Jakarta, dicintai di seluruh Nusantara.
          </p>
        </div>

        <div className="footer-col">
          <h5>Atelier</h5>
          <a href="#investment">Koleksi Silk</a>
          <a href="#investment">Koleksi Velvet</a>
          <a href="#investment">Couture Custom</a>
          <Link href="/portofolio">Galeri Karya</Link>
        </div>

        <div className="footer-col">
          <h5>Perusahaan</h5>
          <a href="#">Tentang Kami</a>
          <a href="#">Jurnal</a>
          <a href="#">Press</a>
          <a href="#">Karir</a>
        </div>

        <div className="footer-col">
          <h5>Kontak</h5>
          <a href="mailto:hello@uwu.id">hello@uwu.id</a>
          <a href="#">WhatsApp</a>
          <a href="#">Instagram</a>
          <a href="#">TikTok</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 UWU.ID · Crafted in Jakarta</p>
        <p>
          <Link href="/terms">Privasi</Link> ·{" "}
          <Link href="/terms">Syarat</Link> · <a href="#">Cookies</a>
        </p>
      </div>
    </footer>
  );
}

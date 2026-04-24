"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`home-nav${scrolled ? " scrolled" : ""}`} id="homeNav">
      <Link href="/" className="nav-logo" aria-label="uwu">
        <Image
          src="/images/homepage/uwu-logo.svg"
          alt=""
          width={26}
          height={18}
        />
      </Link>
      <div className="nav-links" aria-label="Primary">
        <a href="#story">The Story</a>
        <a href="#experience">Experience</a>
        <a href="#atelier">Atelier</a>
        <a href="#investment">Investment</a>
      </div>
      <div className="nav-cta">
        <Link href="/login" className="btn btn-ghost">
          Masuk
        </Link>
        <Link href="/register" className="btn btn-primary">
          <span>Mulai Cerita</span>
        </Link>
      </div>
    </nav>
  );
}

export function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${p}%`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <div className="scroll-progress" id="scrollProgress" />;
}

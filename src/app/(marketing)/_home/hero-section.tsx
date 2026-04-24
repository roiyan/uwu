"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Star = {
  top: number;
  left: number;
  depth: number;
  big: boolean;
};

const STAR_COUNT = 110;
const PARALLAX_MUL = 2;

function buildStars(count: number): Star[] {
  // Deterministic values per mount so SSR and client markup match — we
  // generate on the client only (layer rendered after mount).
  return Array.from({ length: count }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    depth: 0.25 + Math.random() * 0.75,
    big: Math.random() < 0.12,
  }));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCounter(target: number, decimals = 0, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const duration = 1800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(target * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start]);
  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString("id-ID");
}

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const g1Ref = useRef<HTMLDivElement>(null);
  const g2Ref = useRef<HTMLDivElement>(null);
  const g3Ref = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [countersOn, setCountersOn] = useState(false);

  const stars = useMemo(() => (mounted ? buildStars(STAR_COUNT) : []), [mounted]);

  useEffect(() => {
    setMounted(true);
    // Counters fire either 400ms after mount (returning visitors — no
    // intro) or 3200ms (first visit — after intro cascade).
    const seen =
      typeof window !== "undefined" &&
      ((): boolean => {
        try {
          return sessionStorage.getItem("uwu_intro_seen_v3") === "1";
        } catch {
          return false;
        }
      })();
    const delay = seen ? 400 : 3200;
    const t = window.setTimeout(() => setCountersOn(true), delay);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    const root = rootRef.current;
    if (!root) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = Math.min(window.scrollY, window.innerHeight * 1.2);
      if (g1Ref.current)
        g1Ref.current.style.transform = `translateY(${y * 0.18 * PARALLAX_MUL}px)`;
      if (g2Ref.current)
        g2Ref.current.style.transform = `translateY(${y * -0.12 * PARALLAX_MUL}px)`;
      if (g3Ref.current)
        g3Ref.current.style.transform = `translateY(${y * 0.24 * PARALLAX_MUL}px)`;
      if (logoRef.current) {
        logoRef.current.style.transform = `translateY(${y * 0.32 * PARALLAX_MUL}px) scale(${1 - y * 0.0002})`;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(${y * 0.38 * PARALLAX_MUL}px)`;
        contentRef.current.style.opacity = `${Math.max(0, 1 - y / (window.innerHeight * 0.72))}`;
      }
      if (starsRef.current) {
        const starEls = starsRef.current.children;
        for (let i = 0; i < starEls.length; i++) {
          const el = starEls[i] as HTMLElement;
          const depth = Number(el.dataset.depth) || 0.5;
          el.style.transform = `translateY(${y * depth * 0.45 * PARALLAX_MUL}px)`;
        }
      }
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cerita = useCounter(12400, 0, countersOn);
  const rating = useCounter(4.97, 2, countersOn);
  const jam = useCounter(48, 0, countersOn);

  return (
    <section className="hero" ref={rootRef}>
      <div className="hero-bg">
        <div className="glow g-blue" ref={g1Ref} />
        <div className="glow g-coral" ref={g2Ref} />
        <div className="glow g-lilac" ref={g3Ref} />
      </div>

      <div className="hero-logo-ghost" ref={logoRef} aria-hidden="true">
        <Image
          src="/images/homepage/uwu-logo.svg"
          alt=""
          width={1500}
          height={560}
          priority
        />
      </div>

      <div className="layer-stars" ref={starsRef} aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className={`star${s.big ? " big" : ""}`}
            data-depth={s.depth}
            style={{ top: `${s.top}%`, left: `${s.left}%` }}
          />
        ))}
      </div>

      <div className="hero-frame" aria-hidden="true">
        <div className="hf-bl" />
        <div className="hf-br" />
      </div>
      <div className="hero-vignette" aria-hidden="true" />

      <div className="hero-content cascade" ref={contentRef}>
        <div className="eyebrow">
          <span className="dot" />
          <span>Couture Digital Invitations · Est. 2021</span>
        </div>

        <h1 className="hero-title">
          <span className="line">Setiap cinta</span>
          <span className="line">
            layak <em>diabadikan.</em>
          </span>
        </h1>

        <p className="hero-sub">
          Bukan sekadar undangan digital. Ini adalah ruang dimana cerita kalian
          dirangkai — dengan ketelitian seorang tukang jam, dan puisi seorang
          kekasih.
        </p>

        <div className="hero-actions">
          <a href="#experience" className="btn btn-primary btn-large">
            <span>Lihat Demo Langsung</span>
            <ArrowRight />
          </a>
          <a href="#atelier" className="btn btn-outline btn-large">
            Jelajahi Koleksi
          </a>
        </div>

        <div className="hero-meta" aria-label="Statistik UWU">
          <div className="meta-item">
            <div className="meta-num">
              {cerita}
              <em>+</em>
            </div>
            <div className="meta-label">Cerita Terukir</div>
          </div>
          <div className="meta-item">
            <div className="meta-num">{rating}</div>
            <div className="meta-label">Rating Bintang</div>
          </div>
          <div className="meta-item">
            <div className="meta-num">
              {jam}
              <em>h</em>
            </div>
            <div className="meta-label">Siap Tayang</div>
          </div>
          <div className="meta-item">
            <div className="meta-num">∞</div>
            <div className="meta-label">Masa Akses</div>
          </div>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll · Temukan</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 7h10M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Quote = {
  main: string;
  normal: string;
  name: string;
  meta: string;
};

const QUOTES: Quote[] = [
  {
    main:
      "Kami mengirim undangan kepada 840 tamu. 812 membuka — dan 14 diantaranya menangis.",
    normal: "Itu bukan statistik. Itu kesaksian.",
    name: "Dian & Arkan",
    meta: "Bali · November 2024",
  },
  {
    main:
      "Orang tua saya menelepon setelah buka undangan — “Nak, ini karya seni.”",
    normal: "Dari ayah saya yang tidak pernah memuji.",
    name: "Putri & Bima",
    meta: "Jakarta · Februari 2025",
  },
  {
    main: "Vendor lain minta 2 minggu. UWU menyelesaikan dalam 38 jam.",
    normal: "Dan hasilnya — jauh lebih indah dari yang kami bayangkan.",
    name: "Sekar & Adrian",
    meta: "Yogyakarta · Oktober 2024",
  },
  {
    main:
      "Lima tahun menikah, dan undangan kami masih bisa dibuka di URL yang sama.",
    normal: "Kami buka tiap ulang tahun pernikahan.",
    name: "Mira & Jovan",
    meta: "Surabaya · 2021 — sampai sekarang",
  },
];

const AUTOPLAY_MS = 6000;

export function TestimonialsSection() {
  const [i, setI] = useState(0);
  const pausedRef = useRef(false);

  const go = useCallback((next: number) => {
    setI(((next % QUOTES.length) + QUOTES.length) % QUOTES.length);
  }, []);

  useEffect(() => {
    if (pausedRef.current) return;
    const id = window.setInterval(() => {
      setI((cur) => (cur + 1) % QUOTES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [i]);

  return (
    <section
      className="quote-section"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="quote-wrap">
        <span className="quote-mark" aria-hidden="true">
          &ldquo;
        </span>

        {QUOTES.map((q, idx) => (
          <figure
            key={idx}
            className={`quote-slide${idx === i ? " active" : ""}`}
            aria-hidden={idx !== i}
          >
            <blockquote className="quote-text">
              {q.main}
              <br />
              <span className="normal">{q.normal}</span>
            </blockquote>
            <figcaption className="quote-cite">
              <div>
                <div className="quote-cite-name">{q.name}</div>
                <div className="quote-cite-meta">{q.meta}</div>
              </div>
            </figcaption>
          </figure>
        ))}

        <div className="quote-nav">
          <div className="quote-dots" role="tablist" aria-label="Testimoni">
            {QUOTES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={`Testimoni ${idx + 1}`}
                className={`quote-dot${idx === i ? " active" : ""}`}
                onClick={() => go(idx)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Sebelumnya"
            className="quote-arrow"
            onClick={() => go(i - 1)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M12 7H2M6 3L2 7l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Berikutnya"
            className="quote-arrow"
            onClick={() => go(i + 1)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

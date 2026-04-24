"use client";

import { useEffect, useState } from "react";

type ThemeId = "ivory" | "midnight" | "sakura" | "emerald";
type Section = "cover" | "countdown" | "venue";

const THEMES: { id: ThemeId; name: string; italic: string; tagline: string }[] =
  [
    {
      id: "ivory",
      name: "Ivory",
      italic: "Whisper",
      tagline: "Klasik · Hangat · Timeless",
    },
    {
      id: "midnight",
      name: "Midnight",
      italic: "Gold",
      tagline: "Cinematic · Mewah · Nocturnal",
    },
    {
      id: "sakura",
      name: "Sakura",
      italic: "Bloom",
      tagline: "Romantis · Lembut · Feminin",
    },
    {
      id: "emerald",
      name: "Emerald",
      italic: "Heritage",
      tagline: "Javanese · Royal · Heritage",
    },
  ];

const SECTIONS: { id: Section; label: string; offset: number }[] = [
  { id: "cover", label: "Sampul", offset: 0 },
  { id: "countdown", label: "Hitung Mundur", offset: -150 },
  { id: "venue", label: "Lokasi", offset: -300 },
];

// Target: 14 Juni 2026 15:00 WIB.
const TARGET = new Date("2026-06-14T15:00:00+07:00").getTime();

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function useCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return { d: 124, h: "08", m: "42", s: "16" };
  const diff = Math.max(0, TARGET - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff / 3_600_000) % 24);
  const m = Math.floor((diff / 60_000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { d, h: pad(h), m: pad(m), s: pad(s) };
}

export function DemoSection() {
  const [theme, setTheme] = useState<ThemeId>("ivory");
  const [section, setSection] = useState<Section>("cover");
  const [switching, setSwitching] = useState(false);
  const { d, h, m, s } = useCountdown();

  // Brief opacity dip when theme changes, matching the reference.
  useEffect(() => {
    setSwitching(true);
    const t = window.setTimeout(() => setSwitching(false), 180);
    return () => window.clearTimeout(t);
  }, [theme]);

  const currentOffset = SECTIONS.find((x) => x.id === section)?.offset ?? 0;

  return (
    <section className="demo-section" id="experience">
      <div className="demo-bg">
        <div className="glow g1" />
        <div className="glow g2" />
      </div>

      <div className="demo-wrap">
        <div className="demo-left">
          <div className="chapter-label">Chapter 02 — Live Preview</div>
          <h2>
            Rasakan sekarang.
            <br />
            Klik, <em>dan hidupkan.</em>
          </h2>
          <p>
            Pilih satu dari empat koleksi signature. Undangan di sebelah akan
            berubah secara real-time. Ini bukan screenshot — ini undangan yang
            bisa kalian dapatkan minggu depan.
          </p>

          <div className="theme-picker" role="tablist" aria-label="Tema">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={theme === t.id}
                onClick={() => setTheme(t.id)}
                className={`theme-opt${theme === t.id ? " active" : ""}`}
              >
                <span className={`theme-swatch ${t.id}`} aria-hidden="true" />
                <span className="theme-info">
                  <span className="theme-name">
                    {t.name} <em>{t.italic}</em>
                  </span>
                  <span className="theme-tagline">{t.tagline}</span>
                </span>
                <span className="theme-indicator" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="demo-controls" role="tablist" aria-label="Section">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={section === sec.id}
                className={`ctrl-pill${section === sec.id ? " active" : ""}`}
                onClick={() => setSection(sec.id)}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        <div className="phone-stage">
          <div className="phone-glow" aria-hidden="true" />
          <div className="phone">
            <div className="phone-notch" aria-hidden="true" />
            <div
              className={`phone-screen theme-${theme}`}
              style={{ opacity: switching ? 0.5 : 1 }}
            >
              <div
                className="inv"
                style={{
                  transform: `translateY(${currentOffset}px)`,
                }}
              >
                <div className="inv-mono">The Wedding Of</div>
                <div className="inv-ornament">✦ ⸻ ✦</div>
                <h4>Hawa</h4>
                <span className="amp">&amp;</span>
                <h4>
                  <em>Adam</em>
                </h4>
                <div className="inv-divider" />
                <div className="inv-sub">
                  Sebuah undangan untuk menyaksikan
                  <br />
                  bab baru kami, dimulai.
                </div>
                <div className="inv-countdown">
                  <div className="cd-box">
                    <div className="cd-num">{d}</div>
                    <div className="cd-lbl">Hari</div>
                  </div>
                  <div className="cd-box">
                    <div className="cd-num">{h}</div>
                    <div className="cd-lbl">Jam</div>
                  </div>
                  <div className="cd-box">
                    <div className="cd-num">{m}</div>
                    <div className="cd-lbl">Menit</div>
                  </div>
                  <div className="cd-box">
                    <div className="cd-num">{s}</div>
                    <div className="cd-lbl">Detik</div>
                  </div>
                </div>
                <div className="inv-date">
                  <div className="d1">Sabtu</div>
                  <div className="d2">14 · 06 · 2026</div>
                  <div className="d3">15:00 — 21:00 WIB</div>
                </div>
                <div className="inv-location">
                  <div className="inv-loc-label">Resepsi</div>
                  <div className="inv-loc-name">
                    The Ritz-Carlton, Mega Kuningan
                  </div>
                  <div className="inv-loc-addr">
                    Jl. DR. Ide Anak Agung Gde Agung, Jakarta
                  </div>
                  <div className="inv-rsvp">Buka Undangan</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

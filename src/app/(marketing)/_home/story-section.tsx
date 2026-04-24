"use client";

import { useEffect, useRef } from "react";

function useRevealOnScroll(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const targets = root.querySelectorAll<HTMLElement>(".reveal");
    if (reduce) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

// Cursor spotlight on .story-visual: updates --mx / --my CSS vars so
// the ::after gradient follows the mouse. Matches the reference's
// `story-visual` hover treatment.
function spotlight(el: HTMLElement, e: React.MouseEvent) {
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function ArrowLink({
  href = "#experience",
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <a className="story-link" href={href}>
      {children}
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
    </a>
  );
}

export function StorySection() {
  const rootRef = useRef<HTMLElement>(null);
  useRevealOnScroll(rootRef);

  return (
    <section className="chapter" id="story" ref={rootRef}>
      <div className="chapter-head reveal">
        <div>
          <div className="chapter-label">Chapter 01 — Platform</div>
          <h2 className="chapter-title">
            Empat hal. Satu <em>platform.</em>
          </h2>
        </div>
        <p className="chapter-lead">
          Bukan sekadar template. uwu adalah ruang kreatif Anda — dari desain,
          manajemen tamu, hingga analytics — diciptakan berdua dari layar
          masing-masing.
        </p>
      </div>

      <div className="story-wrap">
        {/* Scene 1 — DESAIN — visual LEFT, copy RIGHT */}
        <article className="story-scene reveal">
          <div
            className="story-visual sv-design"
            onMouseMove={(e) => spotlight(e.currentTarget, e)}
          >
            <div className="sv-glow" />
            <DesignMockup />
          </div>
          <div className="story-copy">
            <div className="mono">N° 01 — Desain</div>
            <h3>
              Cerminan sempurna
              <br />
              <em>dari Anda berdua.</em>
            </h3>
            <p>
              Pilih dari koleksi tema profesional. Sesuaikan warna dan tipografi
              hingga terasa personal — tanpa menulis satu baris kode.
            </p>
            <p className="highlight">
              Ubah warna, ganti font — hasilnya langsung terlihat.
            </p>
            <ArrowLink>Jelajahi Koleksi Tema →</ArrowLink>
          </div>
        </article>

        {/* Scene 2 — TAMU — visual RIGHT, copy LEFT */}
        <article className="story-scene reversed reveal">
          <div
            className="story-visual sv-guests"
            onMouseMove={(e) => spotlight(e.currentTarget, e)}
          >
            <div className="sv-glow" />
            <GuestsMockup />
          </div>
          <div className="story-copy">
            <div className="mono">N° 02 — Tamu</div>
            <h3>
              Tidak ada tamu
              <br />
              yang <em>terlewat.</em>
            </h3>
            <p>
              Import sekali, pantau selamanya. Setiap tamu mendapat undangan
              personal dengan nama mereka — dan Anda tahu persis siapa yang
              sudah merespons.
            </p>
            <p className="highlight">
              Link unik per tamu. Nama mereka muncul di sampul, RSVP langsung
              tercatat.
            </p>
            <ArrowLink>Cara Import Tamu →</ArrowLink>
          </div>
        </article>

        {/* Scene 3 — ANALYTICS — visual LEFT, copy RIGHT */}
        <article className="story-scene reveal">
          <div
            className="story-visual sv-analytics"
            onMouseMove={(e) => spotlight(e.currentTarget, e)}
          >
            <div className="sv-glow" />
            <AnalyticsMockup />
          </div>
          <div className="story-copy">
            <div className="mono">N° 03 — Analytics</div>
            <h3>
              Tenang, semuanya
              <br />
              <em>terpantau.</em>
            </h3>
            <p>
              Satu dashboard yang menunjukkan segalanya — berapa yang membuka,
              siapa yang merespons, dan siapa yang perlu diingatkan.
            </p>
            <p className="highlight">
              Real-time · Privacy-first · Export anytime.
            </p>
            <ArrowLink>Lihat Demo Dashboard →</ArrowLink>
          </div>
        </article>

        {/* Scene 4 — KOLABORASI — visual RIGHT, copy LEFT */}
        <article className="story-scene reversed reveal">
          <div
            className="story-visual sv-collab"
            onMouseMove={(e) => spotlight(e.currentTarget, e)}
          >
            <div className="sv-glow" />
            <CollabMockup />
          </div>
          <div className="story-copy">
            <div className="mono">N° 04 — Kolaborasi</div>
            <h3>
              Satu undangan,
              <br />
              <em>dua kreator.</em>
            </h3>
            <p>
              Desain berdua dari layar masing-masing. Setiap perubahan langsung
              terlihat — beri komentar, sesuaikan bersama, dan ciptakan undangan
              yang benar-benar milik berdua.
            </p>
            <p className="highlight">
              Real-time sync. Unlimited revisions. Tanpa perlu meeting.
            </p>
            <ArrowLink>Cara Kerja Kolaborasi →</ArrowLink>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ========= Mockups ========= */

function DesignMockup() {
  const swatches = ["#F5E6D3", "#1F4235", "#F0A09C", "#B89DD4", "#1A2341", "#D4B896"];
  return (
    <div className="mk-card mk-design">
      <div className="mk-tabs">
        <span>Tema</span>
        <span className="on">Warna</span>
        <span>Tipografi</span>
      </div>
      <div className="mk-swatches">
        {swatches.map((c, i) => (
          <span
            key={c}
            className={`mk-sw${i === 2 ? " on" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="mk-preview">
        <div className="mk-preview-mono">Preview Live</div>
        <div className="mk-preview-name">Hawa</div>
        <div className="mk-preview-amp">&amp;</div>
        <div className="mk-preview-name italic-em">Adam</div>
      </div>
      <div className="mk-slider">
        <span className="mk-slider-label">Radius Sudut</span>
        <div className="mk-slider-track">
          <div className="mk-slider-fill" style={{ width: "62%" }} />
        </div>
      </div>
    </div>
  );
}

function GuestsMockup() {
  const guests: Array<{
    initial: string;
    color: string;
    name: string;
    status: "ok" | "wait" | "no";
    statusLabel: string;
  }> = [
    {
      initial: "R",
      color: "#8FA3D9",
      name: "Rizki Pratama + 1",
      status: "ok",
      statusLabel: "Hadir",
    },
    {
      initial: "D",
      color: "#F0A09C",
      name: "Dian Kusuma + 2",
      status: "ok",
      statusLabel: "Hadir",
    },
    {
      initial: "S",
      color: "#B89DD4",
      name: "Sari Wijaya",
      status: "wait",
      statusLabel: "Menunggu",
    },
    {
      initial: "A",
      color: "#D4B896",
      name: "Ayu Lestari + 1",
      status: "ok",
      statusLabel: "Hadir",
    },
    {
      initial: "M",
      color: "#F4B8A3",
      name: "Made Putra",
      status: "no",
      statusLabel: "Tidak",
    },
  ];
  return (
    <div className="mk-card mk-guests">
      <div className="mk-guests-head">
        <div>
          <div className="mk-guests-title">Daftar Tamu</div>
          <div className="mk-guests-chip">248 tamu</div>
        </div>
        <div className="mk-guests-btn">↑ Import CSV</div>
      </div>
      <ul className="mk-guests-list">
        {guests.map((g) => (
          <li key={g.name}>
            <span className="mk-avatar" style={{ background: g.color }}>
              {g.initial}
            </span>
            <span className="mk-guests-name">{g.name}</span>
            <span className={`mk-badge mk-badge-${g.status}`}>
              ● {g.statusLabel}
            </span>
          </li>
        ))}
      </ul>
      <div className="mk-guests-foot">
        Link personal · <span>uwu.id/h&amp;a?u=rizki</span>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="mk-card mk-analytics">
      <div className="mk-stat-grid">
        <div>
          <div className="mk-stat-big">
            812<span className="mk-stat-denom">/840</span>
          </div>
          <div className="mk-stat-label">Dibuka</div>
        </div>
        <div>
          <div className="mk-stat-big">634</div>
          <div className="mk-stat-label">Hadir</div>
        </div>
        <div>
          <div className="mk-stat-big">28</div>
          <div className="mk-stat-label">Perlu Ingat</div>
        </div>
      </div>
      <div className="mk-chart">
        <svg viewBox="0 0 280 110" width="100%" height="110" aria-hidden="true">
          <defs>
            <linearGradient id="mkAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#F0A09C" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F0A09C" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 90 C 40 88, 70 80, 100 68 C 135 55, 170 42, 210 26 C 240 16, 260 10, 280 8 L 280 110 L 0 110 Z"
            fill="url(#mkAreaGrad)"
          />
          <path
            d="M0 90 C 40 88, 70 80, 100 68 C 135 55, 170 42, 210 26 C 240 16, 260 10, 280 8"
            stroke="#F0A09C"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        <div className="mk-chart-axis">
          <span>7 hari sebelum</span>
          <span>Hari H</span>
        </div>
      </div>
      <div className="mk-activity">
        <span className="mk-activity-dot" aria-hidden="true" />
        <span className="mk-activity-label">Terakhir dibuka</span>
        <span className="mk-activity-val">2 menit lalu · Jakarta</span>
      </div>
    </div>
  );
}

function CollabMockup() {
  return (
    <div className="mk-card mk-collab">
      <div className="mk-canvas">
        <div className="mk-inv-mono">The Wedding Of</div>
        <div className="mk-inv-name">Hawa</div>
        <div className="mk-inv-amp">&amp;</div>
        <div className="mk-inv-name italic-em">Adam</div>
        <span className="mk-cursor mk-cursor-1" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M2 2 L 14 8 L 8 10 L 6 16 Z"
              fill="#8FA3D9"
              stroke="#fff"
              strokeWidth="1"
            />
          </svg>
          <span>Hawa</span>
        </span>
        <span className="mk-cursor mk-cursor-2" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M2 2 L 14 8 L 8 10 L 6 16 Z"
              fill="#F0A09C"
              stroke="#fff"
              strokeWidth="1"
            />
          </svg>
          <span>Adam</span>
        </span>
      </div>
      <div className="mk-chat">
        <div className="mk-chat-row">
          <span className="mk-avatar" style={{ background: "#F0A09C" }}>
            A
          </span>
          <div>
            <div className="mk-chat-name">Adam</div>
            <div className="mk-chat-bubble">Warna coral lebih cocok ✨</div>
          </div>
        </div>
        <div className="mk-chat-row">
          <span className="mk-avatar" style={{ background: "#8FA3D9" }}>
            H
          </span>
          <div>
            <div className="mk-chat-name">Hawa</div>
            <div className="mk-chat-bubble">Setuju! Aku ubah ya.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

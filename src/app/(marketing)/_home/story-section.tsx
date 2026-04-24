"use client";

import { useEffect, useRef } from "react";

// Shared reveal behavior — attach an IntersectionObserver to every
// `.reveal` element inside this section and toggle `.in` when ≥15% is
// visible. Matches the original site's behavior.
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

function ArrowLink({ children }: { children: React.ReactNode }) {
  return (
    <a className="story-link" href="#">
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
          <div className="chapter-label">Chapter 01 — The Why</div>
          <h2 className="chapter-title">
            Tiga puluh detik.
            <br />
            Kesan <em>seumur</em> hidup.
          </h2>
        </div>
        <p className="chapter-lead">
          Tamu kalian hanya membuka undangan sekali, selama tiga puluh detik —
          tapi kesan itu menempel seumur hidup. Kami memperlakukan tiga puluh
          detik itu seperti sebuah short film.
        </p>
      </div>

      <div className="story-wrap">
        {/* Scene 1 — visual LEFT, copy RIGHT */}
        <article className="story-scene reveal">
          <div className="story-visual sv-1">
            <div className="sv-glow" />
            <div className="envelope-card">
              <div className="mono-dark">The Wedding Of</div>
              <h5>Anaya</h5>
              <span className="amp">&amp;</span>
              <h5 style={{ fontStyle: "italic" }}>Raka</h5>
              <div className="date">14 · 06 · 2026</div>
              <div className="seal">U</div>
            </div>
          </div>
          <div className="story-copy">
            <div className="mono">N° 01 — Kurasi</div>
            <h3>
              Diukir, bukan
              <br />
              <em>sekadar dibuat.</em>
            </h3>
            <p>
              Setiap undangan melewati tangan art director senior — bukan
              template generik yang dipakai ribuan couple lain. Komposisi,
              tipografi, palet warna, dan ritme visual kami sesuaikan dengan
              kepribadian kalian berdua.
            </p>
            <p className="highlight">
              &ldquo;Kami tidak membuat undangan. Kami merangkai perkenalan
              pertama untuk cerita kalian.&rdquo;
            </p>
            <ArrowLink>Proses Kurasi</ArrowLink>
          </div>
        </article>

        {/* Scene 2 — reversed */}
        <article className="story-scene reversed reveal">
          <div className="story-visual sv-2">
            <div className="sv-glow" />
            <div className="timeline">
              <div className="t-mono">Average turnaround</div>
              <div className="t-num">
                48<em>h</em>
              </div>
              <div className="t-unit">dari brief ke tayang</div>
              <div className="t-bar" />
              <div className="t-labels">
                <span>Brief</span>
                <span>Desain</span>
                <span>Revisi</span>
                <span>Live</span>
              </div>
            </div>
          </div>
          <div className="story-copy">
            <div className="mono">N° 02 — Kecepatan</div>
            <h3>
              Siap tayang
              <br />
              <em>dalam 48 jam.</em>
            </h3>
            <p>
              Cukup isi brief sekali. Kami urus sisanya — dari desain, animasi
              pembuka, countdown, integrasi Google Maps, QRIS amplop digital,
              hingga streaming live. Kalian tinggal share link, cerita pun
              dimulai.
            </p>
            <p className="highlight">
              Tidak ada couple yang menunggu lebih dari dua hari kerja. Tidak
              pernah.
            </p>
            <ArrowLink>Lihat Timeline Kerja</ArrowLink>
          </div>
        </article>

        {/* Scene 3 — visual LEFT */}
        <article className="story-scene reveal">
          <div className="story-visual sv-3">
            <div className="sv-glow" />
            <div className="browser">
              <div className="browser-bar">
                <div className="browser-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="browser-url">
                  uwu.id/<span className="hl">anaya-raka</span>
                </div>
              </div>
              <div className="browser-body">
                <h5>
                  Anaya <em>&amp; Raka</em>
                </h5>
                <div className="browser-mono">14 · 06 · 2026</div>
                <div className="infinity">∞</div>
              </div>
            </div>
          </div>
          <div className="story-copy">
            <div className="mono">N° 03 — Keabadian</div>
            <h3>
              Abadi, <em>selamanya</em>
              <br />
              bisa dibuka.
            </h3>
            <p>
              Tidak ada tanggal kadaluarsa. Undangan kalian — lengkap dengan
              galeri prewedding, ucapan tamu, live streaming ceremony, dan
              seluruh kenangan — tetap hidup di domain pribadi kalian, seumur
              cerita.
            </p>
            <p className="highlight">
              Lima, sepuluh, dua puluh tahun dari sekarang — buka URL yang
              sama, semuanya masih di sana.
            </p>
            <ArrowLink>Detail Hosting</ArrowLink>
          </div>
        </article>
      </div>
    </section>
  );
}

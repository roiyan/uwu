"use client";

import { useEffect, useRef, useState } from "react";

type Step = {
  num: string;
  head: React.ReactNode;
  body: string;
  meta: string;
  progressLabel: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    head: (
      <>
        <em>Brief</em> singkat. 15 menit.
      </>
    ),
    body:
      "Ceritakan kisah kalian — nama, tanggal, lokasi, foto favorit, mood yang kalian inginkan. Semua yang kami butuhkan untuk mulai merangkai.",
    meta: "Hari 1 · 15 menit",
    progressLabel: "Step 01 · Brief",
  },
  {
    num: "02",
    head: (
      <>
        Desainer <em>merangkai.</em>
      </>
    ),
    body:
      "Art director kami menyusun layout, tipografi, palet warna, dan animasi pembuka — disesuaikan dengan energi cerita kalian. Draft pertama siap dalam 24 jam.",
    meta: "Hari 1 — 2 · 24 jam",
    progressLabel: "Step 02 · Desain",
  },
  {
    num: "03",
    head: (
      <>
        Tinjau, <em>poles</em>, setujui.
      </>
    ),
    body:
      "Revisi tanpa batas. Dari tone warna sampai kata sambutan, dari urutan section sampai font — hingga terasa benar-benar milik kalian.",
    meta: "Hari 2 — 3 · 4 jam turnaround",
    progressLabel: "Step 03 · Revisi",
  },
  {
    num: "04",
    head: (
      <>
        <em>Tayang</em> di domain kalian.
      </>
    ),
    body:
      "Undangan live di URL pribadi — uwu.id/nama-kalian atau domain .com kalian sendiri. Siap dibagikan via WhatsApp, IG, email, atau QR code di amplop fisik.",
    meta: "Hari 3 · selamanya online",
    progressLabel: "Step 04 · Live",
  },
];

export function ProcessSection() {
  const stepsRef = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx ?? "0");
            setActive((cur) => (idx > cur ? idx : cur));
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    stepsRef.current.forEach((el) => {
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <section className="chapter" id="atelier">
      <div className="process-wrap">
        <div className="process-sticky">
          <div className="chapter-label">Chapter 03 — The Atelier</div>
          <h2>
            Empat langkah.
            <br />
            Nol <em>drama.</em>
          </h2>
          <p>
            Prosesnya setenang sesi foto pre-wedding. Kami merangkai — kalian
            menantikan.
          </p>
          <ul className="pp" id="pp">
            {STEPS.map((s, idx) => (
              <li
                key={s.num}
                className={`pp-item${idx <= active ? " active" : ""}`}
              >
                <i />
                {s.progressLabel}
              </li>
            ))}
          </ul>
        </div>

        <div className="process-steps">
          {STEPS.map((s, idx) => (
            <article
              key={s.num}
              className="step"
              data-idx={idx}
              ref={(el) => {
                stepsRef.current[idx] = el;
              }}
            >
              <span className="step-num">{s.num}</span>
              <h4>{s.head}</h4>
              <p>{s.body}</p>
              <div className="step-meta">{s.meta}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

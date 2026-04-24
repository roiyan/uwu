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
        Pilih yang <em>terasa</em> seperti kalian.
      </>
    ),
    body:
      "Jelajahi koleksi tema — dari yang klasik sampai cinematic. Satu klik, dan fondasi undangan kalian sudah terbentuk.",
    meta: "Langkah 1 · 2 menit",
    progressLabel: "Step 01 · Pilih",
  },
  {
    num: "02",
    head: (
      <>
        Isi <em>cerita</em>, bukan formulir.
      </>
    ),
    body:
      "Nama, tanggal, lokasi, kata sambutan — isi sekali, muncul di seluruh undangan. Seperti menulis surat cinta yang otomatis terformat indah.",
    meta: "Langkah 2 · 5 menit",
    progressLabel: "Step 02 · Isi",
  },
  {
    num: "03",
    head: (
      <>
        Sentuhan <em>terakhir.</em> Milik kalian.
      </>
    ),
    body:
      "Ganti warna, ubah font, tambah foto — setiap perubahan langsung terlihat di preview. Tidak ada yang tahu selera kalian lebih baik dari kalian sendiri.",
    meta: "Langkah 3 · sebebas kalian",
    progressLabel: "Step 03 · Poles",
  },
  {
    num: "04",
    head: (
      <>
        <em>Kirim</em> ke dunia.
      </>
    ),
    body:
      "Satu tombol — undangan kalian tayang di uwu.id/nama-kalian. Bagikan via WhatsApp, Instagram, email, atau QR code di amplop fisik. Aktif selamanya.",
    meta: "Langkah 4 · selamanya online",
    progressLabel: "Step 04 · Kirim",
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
            Satu <em>malam.</em>
          </h2>
          <p>
            Tidak perlu desainer. Tidak perlu berminggu-minggu. Cukup kalian
            berdua dan satu malam yang tenang.
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

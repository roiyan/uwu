import Link from "next/link";

type Card = {
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  meta: string;
  first: string;
  second: string;
  date: string;
};

const CARDS: Card[] = [
  {
    slot: 1,
    meta: "Ivory Whisper · N° 142",
    first: "Anaya",
    second: "Raka",
    date: "14 · 06 · 2026",
  },
  {
    slot: 2,
    meta: "Midnight Gold · N° 088",
    first: "Dian",
    second: "Arkan",
    date: "Bali · Nov 2024",
  },
  {
    slot: 3,
    meta: "Emerald Heritage",
    first: "Sekar",
    second: "Adrian",
    date: "Yogya · Jun 2025",
  },
  {
    slot: 4,
    meta: "Sakura Bloom",
    first: "Putri",
    second: "Bima",
    date: "Jakarta · Feb 2025",
  },
  {
    slot: 5,
    meta: "Couture · Custom",
    first: "Kirana",
    second: "Arsa",
    date: "Bandung · Aug 2025",
  },
  {
    slot: 6,
    meta: "Velvet Edition · N° 217",
    first: "Naya",
    second: "Reza",
    date: "Surabaya · Okt 2025",
  },
];

export function GallerySection() {
  return (
    <section className="chapter" id="gallery">
      <div className="chapter-head" style={{ textAlign: "center", gridTemplateColumns: "1fr", justifyItems: "center" }}>
        <div>
          <div className="chapter-label" style={{ color: "#B89DD4", justifyContent: "center" }}>
            Interlude — The Gallery
          </div>
          <h2 className="chapter-title">
            Enam ratus cerita.
            <br />
            <em>Tidak ada</em> yang sama.
          </h2>
          <p
            className="chapter-lead"
            style={{ margin: "24px auto 0", maxWidth: 580 }}
          >
            Setiap undangan di bawah ini milik pasangan sungguhan. Klik untuk
            melihat versi lengkapnya — mungkin salah satunya akan
            menginspirasi cerita kalian.
          </p>
        </div>
      </div>

      <div className="gallery-grid">
        {CARDS.map((c) => (
          <a
            key={c.slot}
            href={`#gallery-${c.slot}`}
            className={`g-card g-c${c.slot}`}
          >
            <div className="g-meta">{c.meta}</div>
            <div className="g-card-inner">
              <h6>{c.first}</h6>
              <div className="amp">&amp;</div>
              <h6>
                <em>{c.second}</em>
              </h6>
              <div className="g-date">{c.date}</div>
            </div>
            <span className="g-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        ))}
      </div>

      <div className="gallery-cta">
        <Link href="/portofolio" className="btn btn-outline btn-large">
          Lihat 600+ Karya Lengkap →
        </Link>
      </div>
    </section>
  );
}

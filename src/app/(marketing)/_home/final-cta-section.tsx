import Image from "next/image";
import Link from "next/link";

export function FinalCtaSection() {
  return (
    <section className="final-cta">
      <div className="final-cta-bg" aria-hidden="true">
        <div className="glow" />
      </div>
      <div className="final-cta-inner">
        <Image
          src="/images/homepage/uwu-logo.svg"
          alt=""
          width={280}
          height={100}
          className="final-cta-logo"
          aria-hidden="true"
        />
        <div className="chapter-label">Epilogue</div>
        <h2>
          Hari itu datang <em>sekali.</em>
          <br />
          Pastikan tak <em>terlupakan.</em>
        </h2>
        <p>
          Setiap hari yang berlalu adalah undangan yang belum sampai ke orang
          terkasih. Mulai cerita kalian — malam ini.
        </p>
        <div className="hero-actions">
          <Link href="/register" className="btn btn-primary btn-large">
            <span>Mulai Cerita Kami</span>
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
          </Link>
          <a href="#investment" className="btn btn-outline btn-large">
            Jadwalkan Konsultasi
          </a>
        </div>
        <div className="final-cta-signature">— Tim UWU, Jakarta</div>
      </div>
    </section>
  );
}

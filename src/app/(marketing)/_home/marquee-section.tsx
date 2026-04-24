import type { ReactNode } from "react";

type Item = { text: ReactNode; bullet: boolean };

const ITEMS: Item[] = [
  { text: <em>Currently celebrating</em>, bullet: true },
  {
    text: (
      <>
        Dian <em>&amp;</em> Arkan
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Putri <em>&amp;</em> Bima
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Naya <em>&amp;</em> Reza
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Sekar <em>&amp;</em> Adrian
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Alya <em>&amp;</em> Fadhil
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Mira <em>&amp;</em> Jovan
      </>
    ),
    bullet: true,
  },
  {
    text: (
      <>
        Kirana <em>&amp;</em> Arsa
      </>
    ),
    bullet: true,
  },
];

export function MarqueeSection() {
  // Duplicate the track for the translateX(-50%) seamless loop.
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {loop.map((item, i) => (
          <div className="marquee-item" key={i}>
            <span className="marquee-text">{item.text}</span>
            {item.bullet && <span />}
          </div>
        ))}
      </div>
    </div>
  );
}

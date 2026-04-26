"use client";

import { useState } from "react";

type Palette = { primary: string; secondary: string; accent: string };

export type PublicGalleryImage = {
  id: string;
  imageUrl: string;
  caption: string | null;
};

export function GallerySection({
  images,
  palette,
}: {
  images: PublicGalleryImage[];
  palette: Palette;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  const active = activeIndex !== null ? images[activeIndex] : null;

  return (
    <section id="galeri" className="px-6 py-14" style={{ color: palette.primary }}>
      <div className="mx-auto max-w-[440px] text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em]"
          style={{ color: palette.primary, opacity: 0.75 }}>
          Galeri Foto
        </p>
        <h2 className="mt-3 font-serif text-[28px] font-light leading-[1.2]"
          style={{ color: palette.primary }}>
          Momen <em>terindah</em> kami.
        </h2>
      </div>
      <div className="mx-auto mt-6 grid max-w-[440px] grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((img, i) => (
          <button key={img.id} type="button" onClick={() => setActiveIndex(i)}
            className="aspect-square overflow-hidden rounded-[12px] border"
            style={{ borderColor: palette.accent + "44" }}
            aria-label={img.caption ?? `Foto ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.imageUrl} alt={img.caption ?? `Foto ${i + 1}`}
              loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {active && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Tutup" onClick={() => setActiveIndex(null)}
            className="absolute inset-0 cursor-default bg-black/85" />
          <div className="relative max-h-[85vh] w-full max-w-[720px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.imageUrl} alt={active.caption ?? ""}
              className="mx-auto max-h-[85vh] max-w-full rounded-xl object-contain" />
            <button type="button" onClick={() => setActiveIndex(null)} aria-label="Tutup"
              className="absolute right-2 top-2 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur">
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

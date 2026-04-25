"use client";

import { useEffect, useState } from "react";

const CONFETTI_COLORS = [
  "#F0A09C", // coral
  "#B89DD4", // lilac
  "#8FA3D9", // blue
  "#F4B8A3", // peach
  "#D4B896", // gold
];

const PIECES = 40;

type Piece = {
  id: number;
  left: number;
  delay: number;
  drift: number;
  color: string;
  rotate: number;
};

/**
 * One-shot confetti burst rendered behind the Selesai card. Pure CSS
 * animation (defined as @keyframes ob-conf in globals.css) — no canvas,
 * no JS animation loop. Disabled automatically via prefers-reduced-motion
 * in the same stylesheet.
 */
export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    const next: Piece[] = Array.from({ length: PIECES }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 60,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
    }));
    setPieces(next);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="ob-confetti-piece"
          style={
            {
              left: `${p.left}%`,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              "--cx": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

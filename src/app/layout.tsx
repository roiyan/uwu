import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import { ToastProvider } from "@/components/shared/Toast";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "uwu — A Love Story, Beautifully Told.",
  description:
    "Platform undangan pernikahan digital untuk pasangan Indonesia. Kelola tamu, kirim via WhatsApp, terima RSVP — semua di satu tempat.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${playfair.variable} ${jakarta.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-base text-ink font-body">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

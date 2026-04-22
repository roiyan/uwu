import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const metadata = {
  title: "Ketentuan Layanan — uwu Wedding Platform",
  description:
    "Ketentuan Layanan dan Kebijakan Privasi uwu Wedding Platform.",
};

export default function TermsPage() {
  return (
    <main className="px-6 pb-24 pt-14">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-brand-blue)]">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
            Ketentuan Layanan
          </h1>
          <p className="mt-4 text-sm text-[color:var(--color-dark-text-secondary)]">
            Berlaku mulai 1 Januari 2026. Dokumen ini sedang disempurnakan oleh
            tim hukum kami. Versi lengkap akan tersedia sebelum peluncuran
            komersial.
          </p>
        </ScrollReveal>

        <div className="mt-10 space-y-8 text-[color:var(--color-dark-text)]">
          <Clause
            title="1. Penggunaan Layanan"
            body="Anda setuju menggunakan uwu Wedding Platform hanya untuk keperluan pembuatan undangan pernikahan digital dan pengelolaan tamu terkait. Dilarang menggunakan platform untuk pesan massal komersial di luar konteks acara Anda."
          />
          <Clause
            title="2. Pembayaran"
            body="Pembayaran paket berbayar diproses melalui Midtrans. Harga tercantum dalam Rupiah (IDR) dan bersifat sekali bayar per acara. Tidak ada biaya berulang."
          />
          <Clause
            title="3. Data & Privasi"
            body="Data tamu Anda dienkripsi dan disimpan di server Supabase region Singapura. Kami tidak menjual atau membagikan data tamu ke pihak ketiga. Anda dapat mengekspor atau menghapus data kapan saja melalui dashboard."
          />
          <Clause
            title="4. Ketersediaan Layanan"
            body="Kami menargetkan uptime 99.9% untuk halaman undangan publik. Gangguan infrastruktur pihak ketiga (Supabase, Vercel, Cloudflare) di luar kendali langsung kami, namun kami memantau dan merespons setiap insiden."
          />
          <Clause
            title="5. Konten Pengguna"
            body="Anda tetap memegang hak penuh atas konten (foto, teks, daftar tamu) yang Anda unggah. Anda memberikan uwu lisensi terbatas untuk menampilkan konten tersebut di halaman undangan Anda selama akun aktif."
          />
          <Clause
            title="6. Pembatalan & Pengembalian"
            body="Paket berbayar dapat direfund dalam 7 hari pertama jika layanan belum dipakai (undangan belum dipublikasikan dan broadcast belum dikirim). Hubungi kami untuk proses pengembalian."
          />
          <Clause
            title="7. Perubahan Ketentuan"
            body="Ketentuan ini dapat diperbarui sewaktu-waktu. Perubahan material akan kami beri tahu via email minimal 14 hari sebelum berlaku."
          />
          <Clause
            title="8. Kontak"
            body="Pertanyaan terkait ketentuan ini dapat dikirim ke legal@uwu.id. Kami berusaha merespons dalam 2 hari kerja."
          />
        </div>
      </div>
    </main>
  );
}

function Clause({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="font-display text-xl text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-dark-text-secondary)]">
        {body}
      </p>
    </section>
  );
}

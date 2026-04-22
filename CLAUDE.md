# CLAUDE.md — UWU Wedding Platform
## v4 — planning locked (2026-04-22)

> **Apa ini**: Single source of truth untuk Claude Code.
> **Baca urutan**: CLAUDE.md → docs/design-tokens.ts → docs/UWU-FULL-CONTEXT.md
> **Mockup visual**: docs/mockups/*.png (48 screens)
> **HTML reference**: docs/stitch-html/*.html (Stitch-generated code)

> **Status (2026-04-22)**: Planning phase. No code scaffolded yet — only `CLAUDE.md` and `docs/`
> are in this directory. Sprint 0 step 1 (`pnpm create next-app@latest uwu …`) has not been run.
> The file structure in §6 and the commands in §16 describe the target state, not the current layout.
> Until Sprint 0 lands, `pnpm dev` and friends will not work.

> **Package manager**: pnpm (not npm / yarn). Lockfile is `pnpm-lock.yaml`. Do not run
> `npm install` — it will create a conflicting `package-lock.json`.

> **Scope boundary**: This directory has no relationship to the ABAP/SAP work under
> `~/Projects/SAP BRIM/` or the `sap-abap-fiberstar` skill. That skill should not fire here.
> The parent `~/CLAUDE.md` describes a different project and does not apply to UWU.

---

## 1. APA YANG KITA BANGUN

UWU adalah SaaS multi-tenant wedding invitation platform untuk pasangan Indonesia.
User buat undangan digital, kelola tamu, kirim via WhatsApp, terima RSVP, dan terima gift digital.

**Competitor**: Wedew.id
**3 Differentiator**: AI Copywriter (multi-bahasa), True Responsive Dashboard, Smart Analytics

**Target user MVP**: Pasangan yang menikah (Layer 1 only)
**Bukan MVP**: Admin dashboard UI (Layer 2), Partner/Vendor marketplace (Layer 3)

---

## 2. TECH STACK (FINAL — JANGAN GANTI)

```
FRONTEND
├── Next.js 15 (App Router, RSC, Server Actions, Turbopack)
├── React 19
├── TypeScript 5.5+ (strict mode)
├── Tailwind CSS 4 (CSS-first config)
├── shadcn/ui (JANGAN buat custom base components)
├── Zustand (client UI state only: sidebar, active tab)
├── TanStack Query (server state: guest list, event data)
├── TanStack Table (guest management table desktop)
├── React Hook Form + Zod (semua forms)
├── Framer Motion (scroll animations + invitation page animations)
├── Recharts (analytics charts only)
└── QRCode.js (generate QR per tamu)

BACKEND
├── Supabase PostgreSQL 16 + Auth + Storage + Realtime
├── Supabase Auth (SATU-SATUNYA auth — bukan NextAuth/Better Auth)
├── @supabase/ssr (session cookies)
├── Drizzle ORM (BUKAN Prisma)
└── Zod (server-side validation)

EXTERNAL
├── Midtrans Snap (payment — VA, QRIS, e-wallet, CC)
├── WhatsApp Cloud API (kirim undangan)
├── SendGrid (email undangan)
├── Claude API / claude-sonnet-4-20250514 (AI copywriting)
├── Google Maps Embed (lokasi venue)
└── Google Fonts API (font picker)

HOSTING
├── Vercel (Next.js hosting, auto-deploy dari GitHub)
├── Supabase Cloud (database, region Singapore)
├── Cloudflare (DNS + CDN + DDoS)
└── GitHub (source code + CI/CD)
```

---

## 3. BRAND & DESIGN

### Brand Identity
- **Nama**: uwu (SELALU lowercase, BUKAN "UWU")
- **Logo**: wordmark serif "uwu" dengan heart di atas "w", gradient blue→purple→pink
- **Tagline**: "A Love Story, Beautifully Told."
- **Footer**: © 2026 uwu Wedding Platform
- **Voice**: Romantic editorial — seperti majalah wedding high-end, bukan tech startup

### Color Palette — Opsi A (FINAL)
```
Navy:         #1E3A5F  → Sidebar, nav, headings, trust elements
Deep Rose:    #C06070  → Romantic accents, tags, highlights
Coral:        #E8917E  → CTA buttons SELALU (Mulai Gratis, Daftar, Bayar, Kirim)
Warm Gold:    #D4A574  → Decorative lines, separators, luxury accents
Warm Ivory:   #FAF6F1  → Page background (NEVER cool gray atau pure white)
Card White:   #FFFFFF  → Card/input backgrounds
Dark Navy:    #1A1A2E  → Primary text (NEVER pure black #000000)
Muted Slate:  #5A5A72  → Secondary text, labels
```

Logo gradient colors (tetap untuk logo saja):
```
Brand Blue:     #8B9DC3  → Logo "u" kiri
Brand Lavender: #B8A0D0  → Logo "w" tengah
Brand Pink:     #E8A0A0  → Logo "u" kanan
```

### Typography
```
Display/Headlines:  Playfair Display (serif, tight tracking)
Accent/Invitation:  Playfair Display Italic ("The Wedding of", quotes)
Body/UI Labels:     Plus Jakarta Sans (sans-serif, legible)
Logo Wordmark:      Cormorant Garamond atau Playfair Display
```

### Design Rules (WAJIB diikuti)
1. **NO 1px borders** untuk sectioning — gunakan background color shifts (tonal layering)
2. **Buttons**: CTA = Coral pill, Secondary = Navy pill, Outline = Gold border, Ghost = text only
3. **Background**: Warm Ivory #FAF6F1 untuk pages (BUKAN cool gray/pure white)
4. **Cards**: White bg, radius 1.5rem (24px), NO visible borders (ghost border jika perlu)
5. **Text**: Dark Navy #1A1A2E (NEVER #000000)
6. **Shadows**: Hampir tidak ada — gunakan tonal layering. Jika harus float: blur 40px, opacity 4-6%
7. **Ghost border**: rgba(26,26,46, 0.08) — hampir invisible
8. **Decorative**: Thin gold lines (#D4A574) dengan ♡ sebagai separator

### Scroll Animation Guidelines

Framework: Framer Motion (sudah di tech stack).
Prinsip: Content HARUS readable TANPA animasi. Animasi = progressive enhancement yang menambah kesan premium.

**Di mana pakai scroll effects:**

| Halaman | Scroll Effects | Catatan |
|---------|---------------|---------|
| Homepage (public) | ✅ Full | Marketing — impress & convert |
| Invitation page (guest) | ✅ Subtle | "Produk" UWU — harus WOW tapi ringan (HP murah) |
| Fitur / Portofolio | ✅ Medium | Showcase quality |
| Harga | ⚠️ Minimal | User mau baca harga, bukan nunggu animasi |
| Dashboard (semua) | ❌ Tidak | Work tool — user butuh cepat |
| Forms (RSVP, register, login) | ❌ Tidak | Friction. User mau submit. |
| Tables (guest list, data) | ❌ Tidak | Data harus instant visible |

**Homepage + Public Marketing Pages:**
- Hero section: fade-in + slight upward slide (y: 30 → 0) saat page load
- Feature sections: staggered fade-in saat masuk viewport (IntersectionObserver via Framer)
- Phone mockup: parallax ringan (scrollYProgress → translateY)
- Trust strip / value props: fade-in staggered per item
- Transition duration: 600-800ms, ease-out

**Invitation Page (guest-facing):**
- "Buka Undangan" → envelope reveal animation (scale + opacity)
- Sections: fade-in + slide-up saat scroll ke viewport
- Couple photos: subtle zoom-in (scale 1.05 → 1) on scroll
- Jadwal acara: staggered card entrance (delay 100ms per card)
- Background: subtle parallax pada floral/decorative elements
- Musik button: pulse animation saat pertama muncul
- WAJIB: `prefers-reduced-motion` → SKIP semua animasi

**Reusable ScrollReveal Component:**
```tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**Performance Rules untuk Animasi:**
- HANYA animasi `opacity` + `transform` (GPU-accelerated)
- JANGAN animasi width, height, margin, padding (trigger layout reflow)
- `will-change: transform` pada elemen yang di-animate
- `once: true` — animasi hanya trigger sekali, tidak setiap scroll
- `prefers-reduced-motion`: WAJIB respect accessibility setting
- Invitation page: total animation JS < 15KB gzipped

### Full Design Tokens
Lihat `docs/design-tokens.ts` untuk semua colors, spacing, radius, shadows, transitions, z-index.

---

## 4. ARSITEKTUR DECISIONS (SUDAH FINAL)

| Keputusan | Jawaban | Alasan |
|-----------|---------|--------|
| Auth | Supabase Auth | RLS `auth.uid()` native, Google SSO built-in |
| ORM | Drizzle (bukan Prisma) | Lebih ringan, SQL-first, better TS inference |
| CSS | Tailwind 4 + shadcn/ui | Industry standard, accessible by default |
| Architecture | Next.js monolith | Wedew scale (~50K users) tidak butuh microservices |
| Database | Supabase PostgreSQL | Auth + Storage + Realtime satu platform |
| Invitation page | ISR (5 min) + client hydration | Static HTML cepat, personalisasi nama tamu client-side |
| Payment | Midtrans Snap | Standard Indonesia, VA + QRIS + e-wallet |
| Tema arsitektur | **JSON config di DB** + generic renderer | Scalable untuk theme marketplace nanti. BUKAN hardcoded React components per tema |
| User-event model | **1 user = 1 event** untuk MVP | Data model sudah support multiple via event_members |
| Cultural preference | **Default "Umum"**, user ubah di Settings | Kurangi friction onboarding. JANGAN tanya agama saat register |
| Menu post-MVP | **Tampilkan disabled** + badge "Segera Hadir" | Check-in, Amplop & Hadiah = visible tapi non-functional di MVP |
| Connection | **Pooler URL port 6543** | Wajib untuk handle concurrent connections |
| Email verification | **OFF untuk MVP** | Kurangi friction. ON setelah ada abuse. |
| E2E testing | **Playwright** | Sesuai Next.js ecosystem. Sprint 4. |

---

## 5. NAVIGATION (KONSISTEN — JANGAN UBAH)

### Public Navbar (semua halaman marketing)
```
uwu (wordmark)  |  Home  |  Portofolio  |  Harga  |  Tema  |  Blog  |  [Masuk]  [Daftar Gratis]
```

### Mobile Public Header + Bottom Tab
```
Header: ☰  |  uwu (center)  |  ∞♡ icon
Bottom: Home  |  Portofolio  |  Harga  |  Tema
```

### Dashboard Sidebar (SEMUA halaman dashboard — TIDAK BOLEH BEDA)
```
uwu (wordmark)
Anisa & Rizky • Sakura Dreams

🏠 Beranda
📝 Website Editor
👥 Tamu
📨 Kirim Undangan
📊 Analytics
✅ Check-in            ← disabled + badge "Segera Hadir"
🎁 Amplop & Hadiah     ← disabled + badge "Segera Hadir"
⚙️ Pengaturan
📦 Paket

[👁 Pratinjau Situs]
[Logout]
```

### Mobile Dashboard Bottom Tab
```
Beranda  |  Editor  |  Tamu  |  Kirim  |  ⋯ Lainnya
```
"Lainnya" membuka bottom sheet: Analytics, Check-in (disabled), Amplop (disabled), Pengaturan, Paket

---

## 6. FILE STRUCTURE

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx        ← MUST: lupa password flow
│   ├── (public)/
│   │   ├── page.tsx                       # Homepage (with scroll animations)
│   │   ├── harga/page.tsx                 # Pricing
│   │   ├── tema/page.tsx                  # Theme catalog
│   │   ├── tema/[slug]/page.tsx           # Theme detail
│   │   ├── portofolio/page.tsx            # Portfolio (with scroll animations)
│   │   └── layout.tsx                     # Public layout
│   ├── (invitation)/
│   │   └── [slug]/
│   │       ├── page.tsx                   # ISR, revalidate 300, force-static
│   │       └── client.tsx                 # Personalisasi + RSVP + scroll animations
│   ├── dashboard/
│   │   ├── layout.tsx                     # Sidebar desktop + bottom tab mobile
│   │   ├── page.tsx                       # Beranda + progress setup card (first-time)
│   │   ├── website/                       # Website editor
│   │   ├── guests/                        # Guest management
│   │   ├── messages/                      # Kirim Undangan (WA + Email + Cetak)
│   │   ├── analytics/                     # RSVP funnel + engagement
│   │   ├── settings/                      # Tab: Akun | Acara | Cultural Preference
│   │   └── packages/                      # Paket saat ini + upgrade
│   ├── admin/                             # KOSONG untuk MVP — hanya middleware guard
│   │   └── layout.tsx                     # Auth check: role === 'admin'
│   └── api/webhooks/
│       ├── midtrans/route.ts              # Payment webhook
│       └── whatsapp/route.ts              # WA delivery status
├── components/
│   ├── ui/                                # shadcn/ui — JANGAN modify
│   ├── dashboard/                         # Dashboard-specific components
│   ├── invitation/                        # Invitation section components
│   ├── forms/                             # Reusable form components
│   ├── motion/                            # ScrollReveal, FadeIn, Parallax, EnvelopeReveal
│   └── shared/                            # EmptyState, LoadingState, ConfirmDialog
├── lib/
│   ├── supabase/                          # Browser, server, admin clients
│   ├── db/
│   │   ├── schema.ts                      # Drizzle schema
│   │   ├── queries/                       # Query functions per domain
│   │   ├── migrations/                    # SQL migrations
│   │   └── seed.ts                        # 3 themes, 5 packages, test user, admin user
│   ├── schemas/                           # Zod validation schemas
│   ├── actions/                           # Server Actions (SEMUA pakai withAuth)
│   ├── auth-guard.ts                      # withAuth() wrapper
│   ├── midtrans.ts
│   ├── whatsapp.ts
│   ├── ai.ts                              # Claude API wrapper
│   └── constants.ts                       # Package limits, status enums
├── hooks/                                 # Custom React hooks
├── stores/                                # Zustand (UI state only)
└── types/                                 # Shared TypeScript types
```

---

## 7. PRICING (BENAR — JANGAN UBAH)

| Paket | Harga | Tamu | WA | Tema | Fitur Kunci |
|-------|-------|------|----|------|-------------|
| Starter | Rp 0 | 25 | ✕ | Basic (3) | — |
| Lite | Rp 49.000 | 100 | ✓ | Standard (10) | Amplop Digital |
| **PRO** ⭐ | **Rp 149.000** | **300** | **✓** | **Premium (semua)** | **WA + Email + Analytics** |
| Premium | Rp 349.000 | 500 | ✓ | Premium | AI RSVP Assistant |
| Ultimate | Rp 599.000 | 1000 | ✓ | Custom Eksklusif | Custom Domain + Dedicated Manager |

---

## 8. CULTURAL SENSITIVITY GATE

Platform UWU melayani SEMUA pasangan Indonesia.
Pilihan tone ditentukan USER di Settings, bukan auto-detect.

```
DEFAULT (sebelum user pilih): Formal & Puitis (netral)
├── Music: ON + mute button visible
├── Kutipan: kosong (user pilih sendiri)
├── Template broadcast: "Formal Umum" (Dengan hormat...)
└── AI tone: Formal & Puitis

JIKA user pilih "Islami":
├── Music: mute default
├── Kutipan: Ayat Al-Quran + Hadits library
├── Template: "Formal Islami" (Assalamu'alaikum...)
├── AI tone: Islami
└── Label acara: "Akad Nikah"

JIKA user pilih "Umum":
├── Music: ON default
├── Kutipan: puisi, quotes romantis, ayat Alkitab (opsional)
├── Template: "Formal Umum" (Dengan hormat...)
├── AI tone: Formal & Puitis
└── Label acara: "Pemberkatan" / "Ceremony"

UNIVERSAL:
├── No BNPL (Akulaku, Kredivo, dll) — business decision
├── "biaya"/"harga" — BUKAN "bunga"/"interest"
├── Mute control SELALU visible
└── JANGAN auto-detect agama dari nama
```

Field di database: `events.cultural_preference: 'islami' | 'umum' | 'custom'` default `'umum'`

---

## 9. CRITICAL PATTERNS

### Auth Guard — SETIAP Server Action WAJIB
```typescript
export async function withAuth<T>(
  eventId: string,
  requiredRole: 'viewer' | 'editor' | 'admin',
  action: (userId: string) => Promise<T>
): Promise<ActionResult<T>>
```

### Invitation Page — HARUS paling robust
```
CDN (Cloudflare cache) → Vercel Edge (ISR 5 min) → Supabase → Client fetch ?to=token
Jika Supabase down → invitation TETAP tampil dari cache
Jika JS gagal → undangan readable, nama tamu fallback "Bpk/Ibu/Saudara/i"
Scroll animations = client-side enhancement only, BUKAN blocking content render
```

### RSVP — Zero data loss
```
1. Client submit → optimistic success (tampilkan langsung)
2. Server Action proses di background
3. Jika gagal → retry 3x exponential backoff
4. Jika tetap gagal → localStorage + sync later
5. UPSERT (bukan INSERT) — safe untuk retry + edit RSVP
```

### WA Broadcast — Graceful queue
```
1. User klik "Kirim" → masuk QUEUE
2. Process 1 pesan/1.5 detik (rate limit safe)
3. Status tracking real-time (pending/sent/delivered/read/failed)
4. Failed → auto-retry 3x
5. Still failed → mark "Gagal" + user retry individual
```

### Payment — Idempotent
```
1. JANGAN percaya client-side status
2. Webhook → verify Midtrans signature WAJIB
3. order_id unique, webhook idempotent (UPSERT)
4. Cron job backup: cek pending orders setiap 5 menit
```

---

## 10. RELIABILITY REQUIREMENTS

| Metrik | Target |
|--------|--------|
| Invitation page LCP | < 1.5s di 4G |
| RSVP submit response | < 500ms |
| Dashboard page load | < 2s |
| Concurrent guests | 500+ simultaneous |
| Uptime | 99.9% |

### Database
- Connection pooling WAJIB (port 6543)
- Setiap query timeout 5 detik max
- N+1 query DILARANG
- Read-heavy pages → cache di edge

### Error Messages — Bahasa Indonesia, BUKAN teknis
```
Network gagal    → "Koneksi terputus. Periksa internet Anda dan coba lagi."
Server error     → "Maaf, terjadi kendala. Silakan coba beberapa saat lagi."
RSVP gagal       → "Konfirmasi Anda tersimpan. Kami akan memproses segera."
WA gagal kirim   → "Beberapa undangan gagal terkirim. Anda bisa kirim ulang."
Payment gagal    → "Pembayaran belum berhasil. Coba metode lain."
Upload gagal     → "Foto gagal diupload. Pastikan ukuran di bawah 5MB."
```

### Security Baseline
- RLS ON di SEMUA tabel
- CORS: hanya domain UWU
- Rate limit: 100 req/min per IP
- File upload: max 5MB, image only
- Invitation slugs: UUID tokens, bukan sequential
- SEMUA secrets di env vars, TIDAK ADA hardcoded
- service_role key JANGAN PERNAH expose ke client

---

## 11. SCREENS INVENTORY (48 screens)

### Public (14)
homepage_desktop, homepage_mobile, harga_desktop, harga_mobile, fitur_desktop, fitur_mobile, portofolio_desktop, portofolio_mobile, showcase_desktop, showcase_mobile, theme_catalog_desktop, theme_catalog_mobile, theme_detail_desktop, theme_detail_mobile

### Auth (4)
login_desktop, login_mobile, register_desktop, register_mobile
+ **M1: reset-password** (build tanpa mockup — shadcn form)

### Onboarding (4)
onboarding_step1 (mempelai), onboarding_step2 (jadwal), onboarding_step3 (tema), onboarding_step4 (selesai)

### Dashboard (16)
dashboard_desktop, dashboard_mobile, editor_desktop, editor_mobile, theme_editor_desktop, theme_editor_mobile, tamu_desktop, tamu_mobile, broadcast_desktop, broadcast_mobile, analytics_desktop, analytics_mobile, ai_assistant_desktop, ai_assistant_mobile, settings_desktop, settings_mobile
+ **M2: profil akun tab** (build tanpa mockup — tab di settings)
+ **M3: progress setup card** (build tanpa mockup — di dashboard beranda, first-time user)

### Empty States (3)
empty_tamu, empty_broadcast, empty_analytics

### Guest-Facing (3+)
invitation_guest_view, rsvp_form_desktop, rsvp_form_mobile, rsvp_success_mobile
+ **M4: RSVP edit** (same form, pre-filled, button "Perbarui")
+ **M5: invitation skeleton/loading**
+ **M7: reveal animation "Buka Undangan"**
+ **M8: Google Maps deep link + .ics calendar**

### Payment (2)
checkout, payment_success

### Reference (1)
design_system_reference

---

## 12. EDGE CASES (handle di Sprint terkait)

| # | Case | Solusi |
|---|------|--------|
| E1 | Browser lama | Invitation SSG works tanpa JS. Progressive enhancement. |
| E2 | Google login lalu coba email/password | Supabase Auth link ke email yang sama |
| E3 | Kedua mempelai register terpisah | event_members: owner invite partner sebagai admin |
| E4 | Upload foto 20MB | Client validate max 5MB + compress (browser-image-compression) |
| E5 | 300 tamu buka bersamaan | ISR + CDN cache. DB tidak terkena. |
| E6 | WA nomor salah | Mark "Failed" + error spesifik + user edit & retry |
| E7 | Webhook Midtrans gagal | Cron cek pending setiap 5 menit via GET status |
| E8 | RSVP over capacity | Soft limit: warning tapi tetap terima. Couple kelola sendiri. |
| E9 | Ganti tema setelah customize | Simpan config per-theme. Switch = load default. Lama tersimpan. |
| E10 | Domain down | Fallback: uwu.vercel.app selalu aktif |

---

## 13. UX REQUIREMENTS (dari audit 6 persona)

### Untuk user tech-illiterate (Ibu Sarah persona):
- **Semua delete action**: confirmation dialog + soft delete 30 hari
- **Dashboard first-time**: progress setup card ("Langkah selanjutnya: tambah tamu")
- **Form tambah tamu minimal**: Nama (required) + No WA (required) + Grup (dropdown). Sisanya opsional.
- **Tap target minimum**: 48x48px (WCAG)
- **Status visual**: warna + icon + teks (bukan hanya warna)
- **Bahasa sehari-hari**: hindari "slug", "broadcast", "ISR". Tooltip untuk istilah asing.

### Untuk tamu (Pak Budi persona):
- **Font scaling**: gunakan rem/em, hormati user font preferences
- **RSVP bisa edit**: link sama, form pre-filled, button "Perbarui Konfirmasi"
- **Invitation navigation**: floating section indicator untuk page panjang
- **Google Maps**: tombol "Buka di Google Maps/Waze" dengan koordinat
- **Save to Calendar**: .ics file + Google Calendar deep link
- **Loading**: skeleton shimmer + "Memuat undangan..."
- **Musik**: default MUTED, tombol unmute prominent floating bottom-right

### Untuk couple (Rina persona):
- **Lupa password**: email → link reset → set new password
- **Profil akun**: tab terpisah di Settings (beda dari event settings)
- **Preview undangan**: "Pratinjau Situs" buka tab baru dengan full preview
- **Share link**: "Salin Link" button prominent + share ke WA/social
- **Edit post-publish warning**: "Anda mengubah lokasi. 100 tamu sudah diundang. Kirim update?"
- **Upgrade paket**: dari menu "Paket" di sidebar

---

## 14. SPRINT PLAN

### Sprint 0: Foundation (Day 1-2)
```
1. pnpm create next-app@latest uwu --typescript --tailwind --app --turbopack
2. Tailwind config dengan Opsi A palette dari design-tokens.ts
3. Setup Supabase client (@supabase/ssr)
4. Drizzle schema Phase 1 + migrate
   - profiles (+ role: 'user' | 'admin')
   - events (+ cultural_preference: 'islami' | 'umum' | 'custom')
   - event_members, couples, event_schedules
   - themes (JSON config architecture)
   - event_theme_configs, packages
   - guests, guest_groups
5. RLS policies di SEMUA tabel
6. Auth middleware (protect /dashboard/*)
7. Login + Register + Reset Password pages
8. Dashboard layout (sidebar desktop + bottom tab mobile)
   - Disabled menu items (Check-in, Amplop) dengan badge "Segera Hadir"
9. Seed: 3 themes (JSON config), 5 packages, test user, admin user
10. Setup Framer Motion + ScrollReveal component di components/motion/
11. Deploy ke Vercel
```

### Sprint 1: Event + Theme + Editor (Day 3-7)
### Sprint 2: Guests + Invitation + RSVP (Day 8-12)
### Sprint 3: Messaging + Payment (Day 13-17)
### Sprint 4: Polish + MVP Launch (Day 18-20)

Detail per sprint → lihat docs/UWU-FULL-CONTEXT.md Part 8

---

## 15. OUT OF SCOPE (JANGAN BUILD)

- ❌ Admin dashboard UI (pakai Supabase Dashboard langsung)
- ❌ Vendor/partner marketplace
- ❌ Mobile native app
- ❌ Live streaming
- ❌ Wedding planning tools
- ❌ CMS / blog (hardcode pages dulu)
- ❌ Multi-event per user (data model ready, logic nanti)
- ❌ Theme marketplace creator upload
- ❌ Check-in feature (menu visible tapi disabled)
- ❌ Amplop Digital feature (menu visible tapi disabled)

---

## 16. COMMANDS

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed test data (3 themes, 5 packages, admin user)
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check
```

---

## 17. BAHASA

- **Semua UI labels**: Bahasa Indonesia
- **Kecuali**: Tagline "A Love Story, Beautifully Told." (English)
- **RSVP**: tetap pakai istilah "RSVP" (sudah umum)
- **Navbar**: Home, Portofolio, Harga, Tema, Blog (BUKAN Portfolio/Pricing/Theme)
- **Dashboard**: Beranda, Website Editor, Tamu, Kirim Undangan, Analytics, Pengaturan, Paket
- **Error messages**: Bahasa Indonesia, ramah, BUKAN teknis

---

*Final v4 — Generated from full design + audit session, 21-22 April 2026*
*48 screens | 17 sections | 14 architecture decisions | 10 edge cases | 6 persona audit | scroll animation guidelines*

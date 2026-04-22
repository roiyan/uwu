# PROJECT UWU — Complete Context Document
## Upload ini ke chat baru agar Claude punya full context

> **Dokumen ini**: Single source of truth untuk Project UWU.
> **Tujuan**: Agar chat baru bisa langsung bantu step-by-step tanpa kehilangan konteks.
> **Versi**: v2 (meta-audited, 21 April 2026)
> **Owner**: Roiyan

---

# PART 0: SIAPA SAYA & APA YANG SAYA BUTUHKAN

Saya **Roiyan**, owner software house. Saya sedang membangun produk SaaS pertama bernama **UWU** — platform undangan digital pernikahan (competitor Wedew.id). 

**Skill saya**: SAP Developer (ABAP/HANA), NLP practitioner, investor saham. Saya BUKAN web developer — saya mengandalkan **Claude Code** sebagai developer utama.

**Apa yang sudah selesai**: Full business analysis, competitive analysis Wedew.id (dari screenshot), data model, API design, UI/UX prompts, sprint plan. Semua sudah di-audit 2x (audit + meta-audit).

**Apa yang saya butuhkan di chat ini**: Step-by-step bantuan untuk EKSEKUSI — mulai dari setup hosting sampai deploy. Saya akan banyak bertanya hal-hal basic web dev karena background saya SAP, bukan web.

---

# PART 1: PROJECT OVERVIEW

## Apa itu UWU?
SaaS multi-tenant wedding invitation platform. User buat undangan digital, kelola tamu, kirim via WhatsApp, terima RSVP, dan terima amplop digital. Mirip Wedew.id tapi dengan 3 keunggulan:

1. **AI Copywriter** — generate sambutan/doa dalam Bahasa Indonesia, Jawa, Sunda, Arab via Claude API
2. **True Responsive** — dashboard yang enak di desktop DAN mobile (Wedew hanya mobile)
3. **Smart Analytics** — RSVP funnel, engagement heatmap (Wedew tidak punya)

## Target Market
- Indonesia (primary)
- Pasangan menikah (primary user)
- Wedding Organizer (secondary, power user)

## Business Model
- Freemium: Starter (Rp 0, 25 tamu) → Lite (Rp 49K) → Pro (Rp 149K) → Premium (Rp 349K) → Ultimate (Rp 599K)
- Revenue: package upgrade + add-on (extra quota tamu/WA)
- Future: theme marketplace (creator 70% / platform 30%)

## Scope MVP (Sprint 0-4)
MUST build:
- Auth (Supabase Auth + Google SSO)
- Event CRUD (1 user = 1 event)
- Couple profile (bride + groom data)
- Theme selection (3 built-in themes)
- Website section editor (toggle on/off, reorder, customize colors/fonts)
- Guest management (CRUD, CSV import, groups, VIP)
- Public invitation page (static + client personalization)
- RSVP form (public, guest-facing)
- WhatsApp broadcast (WA Cloud API)
- Payment (Midtrans: VA + QRIS)

SHOULD build (post-MVP):
- AI copywriting, analytics dashboard, email broadcast, comments, digital envelope, QR check-in

OUT OF SCOPE:
- Mobile native app, live streaming, vendor marketplace, wedding planning tools

---

# PART 2: TECH STACK (FINAL — SUDAH DI-AUDIT)

```
FRONTEND
├── Next.js 15 (App Router, RSC, Server Actions, Turbopack)
├── React 19
├── TypeScript 5.5+ (strict mode)
├── Tailwind CSS 4 (CSS-first config, BUKAN tailwind.config.js)
├── shadcn/ui (component library — JANGAN buat komponen base sendiri)
├── Zustand (client-only state: sidebar open, active tab)
├── TanStack Query (server state: guest list, event data)
├── TanStack Table (guest management table di desktop)
├── React Hook Form + Zod (semua forms + validasi)
├── Framer Motion (animasi invitation page only)
├── Recharts (charts di analytics only)
└── QRCode.js (generate QR per tamu)

BACKEND
├── Supabase (PostgreSQL 16 + Auth + Storage + Realtime)
├── Supabase Auth (SATU-SATUNYA auth — bukan Better Auth / NextAuth)
├── @supabase/ssr (session cookies di Next.js)
├── Drizzle ORM (type-safe SQL — BUKAN Prisma)
└── Zod (server-side validation)

EXTERNAL SERVICES
├── Midtrans (payment gateway — VA, QRIS, e-wallet, CC)
├── WhatsApp Cloud API (kirim undangan via WA)
├── SendGrid (kirim undangan via email)
├── Claude API / Anthropic SDK (AI copywriting)
├── Google Maps Embed (lokasi venue)
└── Google Fonts API (font picker untuk tema)

HOSTING & INFRA
├── Vercel (hosting Next.js — auto deploy dari GitHub)
├── Supabase Cloud (database hosting — region Singapore)
├── Cloudflare (DNS + CDN + DDoS protection)
└── GitHub (source code + CI/CD)
```

### Keputusan Arsitektur yang SUDAH FINAL

| Keputusan | Dipilih | Alasan |
|-----------|---------|--------|
| Auth | Supabase Auth | RLS `auth.uid()` works natively. Google SSO built-in. |
| ORM | Drizzle (bukan Prisma) | Lebih ringan, SQL-first, better TypeScript inference |
| CSS | Tailwind 4 + shadcn/ui | Standard industry, cepat develop, accessible by default |
| Architecture | Next.js monolith | Wedew scale (~50K users) tidak butuh microservices |
| Database | Supabase PostgreSQL | Auth + Storage + Realtime dalam 1 platform |
| Invitation page | ISR (event-level) + client hydration | Static HTML cepat, personalisasi nama tamu via client fetch |
| Payment | Midtrans | Standard Indonesia, support VA + QRIS + e-wallet |

---

# PART 3: EXTERNAL SERVICES — SETUP GUIDE

## 3.1 Supabase (Database + Auth + Storage)

**Apa itu**: Backend-as-a-Service. PostgreSQL database + authentication + file storage + realtime subscriptions. Semua dalam 1 dashboard.

**Setup**:
1. Buka https://supabase.com → Sign up (free)
2. Create New Project:
   - Name: `uwu-wedding`
   - Database Password: (simpan di password manager!)
   - Region: **Singapore (ap-southeast-1)** — closest to Indonesia
3. Setelah project jadi, ambil credentials dari Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (RAHASIA, jangan expose ke client)
4. Setup Auth:
   - Dashboard → Authentication → Providers → Enable Email
   - Dashboard → Authentication → Providers → Enable Google
   - Untuk Google: buat OAuth credentials di Google Cloud Console, masukkan Client ID + Secret
5. Setup Storage:
   - Dashboard → Storage → Create Bucket: `covers` (public), `gallery` (public), `avatars` (public)
   - Set policy: public read, authenticated write

**Free tier limits**: 500MB database, 1GB storage, 50K auth users, 2GB bandwidth — CUKUP untuk MVP.

**Kapan upgrade ke Pro ($25/mo)**: Jika storage > 1GB atau butuh daily backups.

## 3.2 Vercel (Hosting)

**Apa itu**: Platform hosting khusus Next.js. Auto-deploy setiap push ke GitHub. Ada preview URL per pull request.

**Setup**:
1. Buka https://vercel.com → Sign up with GitHub
2. Import repository dari GitHub
3. Framework Preset: Next.js (otomatis terdeteksi)
4. Environment Variables: masukkan semua dari `.env.local` (lihat Part 5)
5. Deploy → dapat URL: `uwu-xxx.vercel.app`
6. Custom domain: Settings → Domains → tambah `uwu.id`
   - Vercel akan kasih DNS records (A record / CNAME)
   - Masukkan di Cloudflare DNS

**Free tier**: Hobby plan — 100GB bandwidth, serverless functions, auto-deploy. CUKUP untuk MVP.

**Kapan upgrade ke Pro ($20/mo)**: Jika team > 1 orang atau butuh password protection preview.

## 3.3 Cloudflare (DNS + CDN)

**Apa itu**: DNS management + CDN + DDoS protection. Gratis.

**Setup**:
1. Buka https://cloudflare.com → Sign up (free)
2. Add Site → masukkan domain `uwu.id`
3. Cloudflare scan DNS records yang ada
4. Update nameservers di registrar domain ke Cloudflare nameservers
5. Tambahkan DNS records dari Vercel (A record / CNAME)
6. SSL: Full (strict) — Vercel sudah handle SSL

**Catatan domain .id**: Propagasi DNS domain `.id` butuh 24-48 jam. Plan launch buffer.

## 3.4 Domain

**Opsi**: 
- `uwu.id` — pendek, memorable. Cek ketersediaan di registrar Indonesia (Niagahoster, Rumahweb, etc.)
- `uwu-wedding.id` — lebih descriptive
- `uwuwedding.com` — alternatif global

**Registrar Indonesia recommended**: Niagahoster, Domainesia, atau Rumahweb. Harga .id: ~Rp 150K-250K/tahun.

**Setelah beli domain**:
1. Arahkan nameservers ke Cloudflare
2. Di Cloudflare, tambah DNS record yang dikasih Vercel
3. Di Vercel, tambahkan custom domain
4. Tunggu propagasi (1-48 jam)

## 3.5 WhatsApp Cloud API

**Apa itu**: API resmi dari Meta untuk mengirim pesan WhatsApp secara programmatic. Beda dari WA Web / WA Business biasa.

**Setup** (MULAI SEKARANG — butuh 1-2 minggu approval):
1. Buat Meta Business Account di https://business.facebook.com
2. Buka https://developers.facebook.com → Create App → Business type
3. Tambahkan product "WhatsApp" ke app
4. Setup: 
   - Dapatkan temporary access token (untuk testing)
   - Register phone number (nomor khusus bisnis, BUKAN nomor pribadi)
   - Buat Message Template → submit untuk review Meta (1-7 hari per template)
5. Setelah approved:
   - `WHATSAPP_ACCESS_TOKEN` = permanent token (buat via System User di Business Settings)
   - `WHATSAPP_PHONE_NUMBER_ID` = ID nomor yang terdaftar

**Template yang perlu dibuat** (submit SEMUA ke Meta — user pilih sesuai cultural_preference):
```
Template 1a: "undangan_formal_islami"
Body: "Assalamu'alaikum Warahmatullahi Wabarakatuh. Yth. {{1}}, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami. Lihat undangan: {{2}}"
Variables: {{1}} = nama tamu, {{2}} = link undangan

Template 1b: "undangan_formal_umum"
Body: "Dengan hormat, Yth. {{1}}, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami. Lihat undangan: {{2}}"
Variables: {{1}} = nama tamu, {{2}} = link undangan

Template 2: "reminder_rsvp"  
Body: "Halo {{1}}, kami belum menerima konfirmasi kehadiran Anda. Mohon konfirmasi di: {{2}}"
```
Catatan: Template dipilih otomatis berdasarkan `events.cultural_preference`. User bisa override di Kirim Undangan → Edit template.

**Pricing**: 1000 conversations/bulan GRATIS. Setelah itu ~$0.004-0.08 per conversation (tergantung kategori).

**Fallback**: Jika belum approved saat Sprint 3, implement email-only dulu. WA ditambahkan setelah approved.

## 3.6 Midtrans (Payment Gateway)

**Apa itu**: Payment gateway Indonesia. Support Virtual Account (BCA, Mandiri, BNI, BRI), QRIS, e-wallet (GoPay, ShopeePay), dan kartu kredit.

**Setup**:
1. Daftar sandbox: https://dashboard.sandbox.midtrans.com → Sign up
2. Dapatkan API keys dari Settings → Access Keys:
   - `MIDTRANS_SERVER_KEY` = Server Key (RAHASIA)
   - `MIDTRANS_CLIENT_KEY` = Client Key (bisa expose ke client)
3. Untuk production nanti:
   - Daftar di https://dashboard.midtrans.com
   - Butuh dokumen bisnis: NIB/SIUP, KTP pemilik, rekening bisnis
   - Review 3-5 hari kerja

**Integration method**: Midtrans **Snap** — popup payment UI yang di-host Midtrans. Kita cukup generate `snap_token` dari server, lalu redirect user ke Snap URL. Paling simple.

**Webhook**: Midtrans kirim notifikasi ke `/api/webhooks/midtrans` saat pembayaran berhasil/gagal. WAJIB verify signature.

**Pricing**: 
- VA: Rp 4.000 per transaksi
- QRIS: 0.7% 
- E-wallet: 1.5-2%
- CC: 2.9% + Rp 2.000

## 3.7 SendGrid (Email)

**Setup**:
1. Daftar di https://sendgrid.com (free: 100 email/hari)
2. Verify sender identity (domain verification via DNS)
3. Dapatkan `SENDGRID_API_KEY`
4. Upgrade ke Essentials ($20/mo) jika butuh > 100/hari

## 3.8 Claude API (AI Copywriting)

**Setup**:
1. Buka https://console.anthropic.com
2. Create API key: `ANTHROPIC_API_KEY`
3. Add payment method (pay-per-use)
4. Estimasi cost: $50-200/bulan tergantung usage

**Catatan**: Model yang dipakai = `claude-sonnet-4-20250514` (cost-effective). Bukan Opus (terlalu mahal untuk copywriting).

---

# PART 4: PROJECT STRUCTURE

```
src/
├── app/
│   ├── (auth)/                    # Login, register, reset password
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (public)/                  # Marketing pages (public)
│   │   ├── page.tsx               # Homepage
│   │   ├── harga/page.tsx         # Pricing
│   │   ├── tema/page.tsx          # Theme catalog
│   │   ├── tema/[slug]/page.tsx   # Theme detail
│   │   ├── portofolio/page.tsx    # Portfolio
│   │   └── layout.tsx             # Public layout (bottom tab mobile, navbar desktop)
│   ├── (invitation)/              # Public invitation (guest-facing)
│   │   └── [slug]/
│   │       ├── page.tsx           # Static event page (ISR 5 min)
│   │       └── client.tsx         # Client: personalization + RSVP
│   ├── dashboard/                 # Authenticated dashboard
│   │   ├── layout.tsx             # Sidebar desktop + hamburger mobile
│   │   ├── page.tsx               # Beranda
│   │   ├── website/               # Website editor
│   │   ├── guests/                # Guest management
│   │   ├── messages/              # Send invitations
│   │   ├── analytics/             # RSVP funnel
│   │   ├── checkin/               # QR check-in
│   │   ├── settings/              # Event settings + Cultural Preference (Islami/Umum/Custom)
│   │   └── packages/              # Billing
│   └── api/webhooks/              # Midtrans + WA webhooks
├── components/
│   ├── ui/                        # shadcn/ui (DO NOT modify)
│   ├── dashboard/                 # Dashboard components
│   ├── invitation/                # Invitation section components
│   ├── forms/                     # Form components
│   └── shared/                    # Breadcrumb, EmptyState, LoadingState
├── lib/
│   ├── supabase/                  # Supabase clients (browser, server, admin)
│   ├── db/                        # Drizzle schema + migrations + queries + seed
│   ├── schemas/                   # Zod validation schemas
│   ├── actions/                   # Server Actions (ALL wrapped with withAuth)
│   ├── auth-guard.ts              # withAuth() — SETIAP action HARUS pakai ini
│   ├── midtrans.ts                # Payment utils
│   ├── whatsapp.ts                # WA Cloud API utils
│   ├── ai.ts                      # Claude API wrapper
│   └── constants.ts               # Package limits, status enums
├── hooks/                         # Custom React hooks
├── stores/                        # Zustand stores (UI state only)
└── types/                         # Shared TypeScript types
```

---

# PART 5: ENVIRONMENT VARIABLES

Buat file `.env.local` di root project:

```bash
# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres

# ===== MIDTRANS =====
MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
MIDTRANS_IS_PRODUCTION=false

# ===== WHATSAPP =====
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=uwu-webhook-verify-secret-random-string

# ===== AI =====
ANTHROPIC_API_KEY=sk-ant-...

# ===== EMAIL =====
SENDGRID_API_KEY=SG.xxx

# ===== APP =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=UWU
```

**PENTING**: 
- `NEXT_PUBLIC_*` = aman di-expose ke browser (public)
- Tanpa `NEXT_PUBLIC_` = RAHASIA, hanya di server
- JANGAN commit `.env.local` ke GitHub (sudah di .gitignore by default)
- Di Vercel: masukkan semua env vars di Settings → Environment Variables

---

# PART 6: DATABASE SCHEMA (DRIZZLE — COPY-PASTE READY)

Lihat file terpisah `06-data.md` untuk full Drizzle schema. Key points:

**Tables utama (Phase 1 — Sprint 0)**:
- `profiles` — extension dari Supabase auth.users
- `events` — tenant utama (1 event = 1 pernikahan)
  - field `cultural_preference`: 'islami' | 'umum' | 'custom' (default: 'umum') — lihat 7.3 Cultural Sensitivity Gate
- `event_members` — siapa yang punya akses ke event (UNIQUE per user per event)
- `couples` — data mempelai (JSONB for bride/groom — validated with Zod)
- `event_schedules` — rangkaian acara (Akad, Resepsi, etc.)
- `themes` — catalog tema (seeded)
- `event_theme_configs` — customization per event
- `packages` — paket harga (seeded)
- `guests` — daftar tamu
- `guest_groups` — grup tamu

**Status fields PENTING**:
```
Guest punya 2 status TERPISAH:
- invitation_status: 'new' | 'invited' | 'delivered' | 'opened'
- rsvp_status: 'pending' | 'going' | 'not_going' | 'maybe'

Ini INDEPENDEN. Contoh:
- invited + pending = sudah kirim undangan, belum RSVP
- opened + going = sudah buka undangan dan RSVP hadir
```

---

# PART 7: CRITICAL PATTERNS

## 7.1 Auth Guard (WAJIB di setiap Server Action)

```typescript
// lib/auth-guard.ts
type Role = 'admin' | 'editor' | 'viewer';
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function withAuth<T>(
  eventId: string,
  requiredRole: Role,
  action: (userId: string) => Promise<T>
): Promise<ActionResult<T>> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const member = await db.query.eventMembers.findFirst({
    where: and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, user.id))
  });
  if (!member) return { success: false, error: 'Not authorized' };

  const hierarchy: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };
  if (hierarchy[member.role as Role] < hierarchy[requiredRole])
    return { success: false, error: 'Insufficient permissions' };

  try {
    return { success: true, data: await action(user.id) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Internal error' };
  }
}
```

## 7.2 Invitation Page Architecture

```
Alur:
1. Tamu klik link dari WA: https://uwu.id/anisa-rizky?to=abc123
2. Next.js serve static HTML (ISR, revalidate 5 menit) — FAST
3. Client component baca ?to=abc123 dari URL
4. Client fetch GET /api/invitation/abc123 → dapat nama tamu
5. Render: "Kepada Bpk/Ibu [nama]" — personalized
6. Tamu isi RSVP form → Server Action submitRSVP()
```

## 7.3 Cultural Sensitivity Gate
Platform UWU melayani SEMUA pasangan Indonesia, tidak hanya Muslim.
Pilihan tone/style ditentukan USER di Settings, bukan auto-detect.

### Default Behavior (sebelum user pilih):
- Tone: "Formal & Puitis" (netral, bukan Islami)
- Music: ON (dengan mute control visible)
- Kutipan: kosong (user pilih sendiri)
- Template broadcast: "Formal Umum"

### Jika user pilih "Islami" di Settings:
- Tone AI default: Islami
- Music: mute default
- Kutipan library: Ayat Al-Quran + Hadits
- Template broadcast: "Formal Islami" (Assalamu'alaikum)
- Label "Akad Nikah" di jadwal acara

### Jika user pilih "Umum/Non-Muslim" di Settings:
- Tone AI default: Formal & Puitis
- Music: ON default
- Kutipan library: puisi, quotes romantis, ayat Alkitab (opsional)
- Template broadcast: "Formal Umum" (Dengan hormat)
- Label "Pemberkatan" atau "Ceremony" di jadwal acara

### Semua user (universal):
- No BNPL payment (no Akulaku, Kredivo, Atome) — business decision, bukan syariah
- No "bunga"/"interest" di UI — pakai "biaya" atau "harga"
- Mute control SELALU visible di invitation page
- JANGAN auto-detect agama dari nama user

---

# PART 8: SPRINT PLAN (CLAUDE CODE)

## Sprint 0: Foundation (Day 1-2)
1. `pnpm create next-app@latest uwu --typescript --tailwind --app --turbopack`
2. Setup Supabase client (`@supabase/ssr`)
3. Drizzle schema Phase 1 + migrate
4. Auth middleware (protect /dashboard/*)
5. Login + Register pages
6. Dashboard layout (sidebar desktop, hamburger mobile)
7. Seed data (3 themes, 5 packages, test user)
8. Deploy ke Vercel

**Roiyan**: Create Supabase project, Vercel account, connect GitHub

## Sprint 1: Event + Theme + Editor (Day 3-7)
1. Event create/update/delete + slug check
2. Couple form (bride + groom data)
3. Event schedule CRUD
4. Theme selection page (3 themes)
5. Theme customizer (colors, fonts)
6. Website section editor (toggle, reorder)
7. Media upload to Supabase Storage
8. Dashboard beranda (hero card, countdown, stats)

**Roiyan**: Visual QA setiap page di mobile + desktop

## Sprint 2: Guests + Invitation + RSVP (Day 8-12)
1. Guest CRUD + TanStack Table (desktop)
2. Guest card view (mobile)
3. Groups + CSV import/export
4. QR code generation
5. Public invitation page (3 themed templates)
6. Client personalization (?to=token)
7. RSVP form + stats

**Roiyan**: Test invitation page di HP Android + share ke teman untuk test

## Sprint 3: Messaging + Payment (Day 13-17)
1. Message templates CRUD
2. WhatsApp Cloud API integration
3. Broadcast + queue + status tracking
4. Pricing page
5. Checkout flow (Midtrans Snap)
6. Invoice management
7. Payment webhook + auto-upgrade

**Roiyan**: WA API harus sudah approved. Test payment di sandbox Midtrans.

## Sprint 4: Polish + MVP Launch (Day 18-20)
1. Public homepage
2. SEO (meta, sitemap, JSON-LD)
3. Security headers
4. E2E tests (5 critical flows)
5. Bug fixes

**🎉 MVP LAUNCH**

## Sprint 5-6: Post-MVP (Day 21-30)
AI copywriting, analytics, email, comments, amplop, check-in, gift wishlist

---

# PART 9: SEED DATA

## 3 Themes
```
1. "Minimalist White" — putih, clean, dark text, serif heading, free tier
2. "Sage Garden" — soft green palette, botanical feel, free tier
3. "Royal Navy" — deep navy + gold accents, elegant, pro tier
```

## 5 Packages
```
Starter: Rp 0 — 25 guests, 5 WA, basic themes, lifetime
Lite: Rp 49.000 — 100 guests, 50 WA, all themes, 365 days
Pro: Rp 149.000 — 300 guests, 200 WA, AI, analytics, amplop, 365 days
Premium: Rp 349.000 — 500 guests, 500 WA, custom domain, check-in, 365 days
Ultimate: Rp 599.000 — 1000 guests, unlimited WA, priority support, 365 days
```

## Test Data
```
User: test@uwu.id / password123
Event: slug="demo-wedding", title="The Wedding of Anisa & Rizky"
5 guests: status mix (new, invited, opened, going, not_going)
```

---

# PART 10: PERFORMANCE & SECURITY REQUIREMENTS

## Performance Budget (Invitation Page)
- Total JS: < 50KB gzipped
- Total CSS: < 20KB gzipped  
- LCP: < 2s on Moto G Power, 4G
- Page weight: < 500KB first load

## Security
- Auth: Supabase Auth (httpOnly cookies)
- Every Server Action: withAuth() wrapper
- Webhooks: signature verification
- Public RSVP: rate limited (5/hour per token) + honeypot
- Headers: CSP, HSTS, X-Frame-Options: DENY
- Secrets: NEVER in NEXT_PUBLIC_*

## UU PDP (Privacy Indonesia)
- Consent banner saat first visit
- Privacy policy bilingual (ID/EN)
- Data stored in Singapore → disclose in privacy policy
- User bisa request data deletion

---

# PART 11: OPEN QUESTIONS (ROIYAN HARUS JAWAB)

## BLOCKERS (resolve SEBELUM coding)

| # | Question | Action |
|---|----------|--------|
| Q1 | Domain apa? uwu.id? | Register domain sekarang |
| Q2 | Supabase project sudah? | Create di supabase.com (Singapore region) |
| Q3 | Vercel account sudah? | Sign up with GitHub |
| Q4 | WA Cloud API sudah apply? | Daftar Meta Business Account SEKARANG (1-2 minggu) |
| Q5 | Midtrans sandbox sudah? | Daftar di sandbox.midtrans.com (instant) |
| Q6 | Siapa design 3 themes? | Option: Claude generate dari deskripsi, Roiyan polish |
| Q7 | Anthropic API key sudah? | Setup di console.anthropic.com (Sprint 5) |

## ASSUMPTIONS (valid sampai di-challenge)
1. Supabase Auth (bukan Better Auth / NextAuth)
2. 3 themes for MVP (bukan 10)
3. 1 event per user di MVP
4. Midtrans (bukan Xendit)
5. Dashboard bahasa Indonesia only
6. Music = user upload (bukan Spotify embed)
7. Claude Code = primary developer, Roiyan = reviewer

---

# PART 12: KNOWN PITFALLS

1. **Tailwind v4**: Pakai CSS-first config, BUKAN `tailwind.config.js`. Syntax beda dari v3.
2. **Supabase RLS + Drizzle**: Drizzle bypass RLS (direct connection). Pakai withAuth() sebagai primary guard. RLS = defense-in-depth.
3. **WA Cloud API rate limit**: Tier 1 = 80 msg/sec. Harus queue + backoff.
4. **Midtrans webhook**: Bisa double-hit. Pakai idempotency (`WHERE status = 'pending'`).
5. **ISR + personalization**: JANGAN SSG per-guest. Static per-event + client fetch per-guest.
6. **Image upload**: Max 5MB, compress dengan sharp, convert ke WebP.
7. **Mobile Safari**: Test 100dvh (bukan 100vh), position:fixed, overscroll-behavior.
8. **Arabic text**: Pakai `dir="rtl"` di container Arabic. Test dengan konten Arab asli.
9. **Domain .id propagasi**: 24-48 jam. Buffer saat launch.

---

# PART 13: FILE REFERENCE

Dokumen pendukung detail ada di project files (upload terpisah jika perlu):

| File | Isi |
|------|-----|
| `02-user-stories.yaml` | 16 user stories + Gherkin acceptance criteria |
| `03-flows.md` | 6 Mermaid flowcharts (registration → payment → broadcast) |
| `04-design-stitch-prompts.md` | 16 Google Stitch prompts untuk UI prototyping |
| `05-api.md` | Server Actions + auth guard + webhooks + Zod schemas |
| `06-data.md` | Full Drizzle schema (copy-paste ready) |
| `07-nfrs.md` | Performance, security, accessibility, monitoring, UU PDP |
| `AUDIT-REPORT.md` | First audit: 31 findings |
| `META-AUDIT.md` | Meta-audit: 3 corrections + 10 additions |

---

# PART 14: CARA PAKAI DOKUMEN INI

## Di Chat Baru:
1. Upload file ini
2. Bilang: "Saya mau mulai eksekusi Project UWU. Saya di Sprint [X]. Bantu saya step by step."
3. Claude akan punya full context dan bisa bantu dari mana saja

## Contoh Pertanyaan yang Bisa Ditanyakan:
- "Bantu saya setup Supabase project dari awal"
- "Cara connect Vercel ke GitHub repo gimana?"
- "Tolong buatkan schema Drizzle untuk Sprint 0"
- "Cara setup Google OAuth di Supabase?"
- "Gimana cara test Midtrans di sandbox?"
- "Cara kirim WhatsApp via Cloud API?"
- "Bantu debug error X di Next.js"
- "Review code ini sudah sesuai pattern belum?"

## Update Dokumen Ini:
Jika ada keputusan baru di chat lain, update bagian yang relevan di dokumen ini dan re-upload ke chat berikutnya. Ini LIVING DOCUMENT.

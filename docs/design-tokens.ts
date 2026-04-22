/**
 * UWU Wedding Platform — Design Tokens
 * Palette: Opsi A (Warm Ivory + Deep Rose + Navy)
 * 
 * Usage:
 * - Import these tokens in tailwind.config.ts
 * - Reference by semantic name, NOT by hex value
 * - CTA buttons = colors.coral (always)
 * - Trust/nav elements = colors.navy
 * - Romantic accents = colors.rose
 * - Luxury accents = colors.gold
 */

// ============================================================
// COLORS
// ============================================================

export const colors = {
  // --- Brand Core (from logo gradient) ---
  brand: {
    blue: '#8B9DC3',      // Logo left "u"
    lavender: '#B8A0D0',  // Logo center "w" 
    pink: '#E8A0A0',      // Logo right "u"
  },

  // --- Primary Palette (Opsi A) ---
  navy: {
    DEFAULT: '#1E3A5F',   // Primary trust color — sidebar, nav, headings
    light: '#2A4F7A',     // Hover state
    dark: '#142840',      // Active/pressed state
    50: '#E8EEF5',        // Light tint for backgrounds
    100: '#C5D4E8',       // Light tint for badges
  },

  rose: {
    DEFAULT: '#C06070',   // Romantic accent — tags, highlights, active states
    light: '#D4808E',     // Hover
    dark: '#9A4858',      // Active
    50: '#F9EDEF',        // Light tint backgrounds
    100: '#F0CDD4',       // Light tint badges
  },

  coral: {
    DEFAULT: '#E8917E',   // CTA buttons — JANGAN GANTI, sudah familiar user
    light: '#F0A898',     // Hover
    dark: '#D47A66',      // Active/pressed
    50: '#FDF0ED',        // Light tint
  },

  gold: {
    DEFAULT: '#D4A574',   // Luxury accents — decorative lines, separators
    light: '#E0BB92',     // Hover
    dark: '#B8926A',      // Matte/antique gold — rose gold replacement
    50: '#FBF4EC',        // Light tint
  },

  // --- Surfaces ---
  surface: {
    base: '#FAF6F1',      // Page background (warm ivory)
    card: '#FFFFFF',       // Card/input backgrounds
    elevated: '#FFF8F2',   // Elevated sections (subtle warmth)
    muted: '#F2EDE7',      // Disabled/inactive backgrounds
    overlay: 'rgba(26, 26, 46, 0.5)', // Modal overlay
  },

  // --- Text ---
  text: {
    primary: '#1A1A2E',   // Dark navy — main body text (NEVER pure #000)
    secondary: '#5A5A72',  // Muted — labels, captions, secondary info
    tertiary: '#8A8A9A',   // Hints, placeholders
    inverse: '#FFFFFF',    // Text on dark/colored backgrounds
    link: '#1E3A5F',       // Links = navy
  },

  // --- Borders ---
  border: {
    DEFAULT: 'rgba(26, 26, 46, 0.08)',  // Ghost border — almost invisible
    subtle: 'rgba(26, 26, 46, 0.12)',   // Slightly visible
    medium: 'rgba(26, 26, 46, 0.20)',   // Input borders, dividers
    strong: 'rgba(26, 26, 46, 0.35)',   // Focus states
    gold: 'rgba(212, 165, 116, 0.25)',  // Rose-gold decorative borders
  },

  // --- Semantic ---
  semantic: {
    success: '#3B7A57',    // Green — "Hadir", success states
    warning: '#C4841D',    // Amber — "Belum Pasti", warnings
    error: '#C0392B',      // Red — "Tidak Hadir", errors, destructive
    info: '#1E3A5F',       // Navy — same as primary (intentional)
  },

  // --- RSVP Status (specific) ---
  rsvp: {
    baru: '#8A8A9A',       // Gray — new/unprocessed
    diundang: '#1E3A5F',   // Navy — invited
    dibuka: '#8B9DC3',     // Brand blue — opened
    hadir: '#3B7A57',      // Green — confirmed
    tidakHadir: '#C0392B', // Red — declined
  },
} as const;


// ============================================================
// TYPOGRAPHY
// ============================================================

export const typography = {
  fonts: {
    display: ['Playfair Display', 'Georgia', 'serif'],     // Headlines, hero text
    accent: ['Playfair Display', 'Georgia', 'serif'],      // Italic accents, "The Wedding of"
    body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'], // Body text, UI labels, forms
    logo: ['Cormorant Garamond', 'Playfair Display', 'serif'], // Logo wordmark only
  },

  // Font sizes follow a modular scale (1.25 ratio)
  sizes: {
    'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],   // Hero headlines
    'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],  // Page titles
    'display-sm': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],     // Section titles
    'headline-lg': ['1.5rem', { lineHeight: '1.3' }],  // Card titles
    'headline-md': ['1.25rem', { lineHeight: '1.4' }],  // Subsection titles
    'body-lg': ['1rem', { lineHeight: '1.7' }],         // Primary body text
    'body-md': ['0.875rem', { lineHeight: '1.6' }],     // Secondary body, table cells
    'body-sm': ['0.8125rem', { lineHeight: '1.5' }],    // Captions, helper text
    'label-lg': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
    'label-md': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '500' }],
    'label-sm': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '500' }],
  },
} as const;


// ============================================================
// SPACING & LAYOUT
// ============================================================

export const spacing = {
  // Page-level
  pageMaxWidth: '1280px',
  pagePadding: {
    desktop: '2rem',
    mobile: '1rem',
  },

  // Component spacing
  sectionGap: '4rem',       // Between major sections
  cardGap: '1.5rem',        // Between cards in a grid
  cardPadding: '1.5rem',    // Inside cards
  inputGap: '1rem',         // Between form fields
  
  // Sidebar
  sidebarWidth: '260px',
  sidebarCollapsed: '64px',
} as const;


// ============================================================
// BORDER RADIUS
// ============================================================

export const radius = {
  none: '0',
  sm: '0.375rem',     // 6px — small chips, tags
  md: '0.5rem',       // 8px — inputs, small buttons
  lg: '1rem',         // 16px — cards, containers
  xl: '1.5rem',       // 24px — large cards, hero sections
  full: '9999px',     // Pill buttons, avatars
} as const;


// ============================================================
// SHADOWS (tonal layering preferred — shadows are rare)
// ============================================================

export const shadows = {
  // "Ghost shadow" — almost invisible, for floating elements only
  sm: '0 1px 3px rgba(26, 26, 46, 0.04)',
  md: '0 4px 12px rgba(26, 26, 46, 0.06)',
  lg: '0 12px 40px rgba(26, 26, 46, 0.06)',
  // Focus ring
  focus: '0 0 0 3px rgba(30, 58, 95, 0.15)',   // Navy-tinted
  focusCoral: '0 0 0 3px rgba(232, 145, 126, 0.2)', // Coral-tinted for CTAs
} as const;


// ============================================================
// TRANSITIONS
// ============================================================

export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '400ms ease',
  spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy — for modals, toasts
} as const;


// ============================================================
// Z-INDEX SCALE
// ============================================================

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;


// ============================================================
// DESIGN RULES (for AI reference — not consumed by code)
// ============================================================

export const designRules = {
  // "No-Line Rule" — NO 1px borders for sectioning
  // Use surface color shifts (surface.base → surface.card → surface.elevated)
  
  // "Ghost Border" — if border absolutely needed, use border.DEFAULT at 8% opacity
  
  // "Tonal Layering" — depth via stacking surfaces, not shadows
  // base → card → elevated (each slightly warmer/brighter)
  
  // Buttons:
  // - Primary CTA: coral.DEFAULT, text white, pill-shaped (radius.full)
  // - Secondary: navy.DEFAULT, text white, pill-shaped
  // - Outline: border gold, bg transparent, text navy
  // - Ghost: no border, text navy, hover bg surface.muted
  
  // Cards:
  // - bg surface.card, radius.xl (1.5rem), NO borders by default
  // - If border needed: border.gold (decorative) or border.DEFAULT (functional)
  
  // Decorative elements:
  // - Thin gold lines with ♡ center for section separators
  // - Logo gradient (brand.blue → brand.lavender → brand.pink) for brand moments
  // - ∞♡ icon for loading states
} as const;

---
name: GastoIA
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb0cd'
  on-tertiary: '#640039'
  tertiary-container: '#f751a1'
  on-tertiary-container: '#570032'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-currency:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-currency-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-precision, AI-augmented personal finance experience. It bridges consumer fintech accessibility (approachable, transparent, fluid) with developer-grade product rigor (linear density, precise typographic tracking, purposeful motion).

### Brand Personality & Emotional Impact
- **Autonomous & Trustworthy:** Financial figures and automated predictions carry immediate authority without visual clutter.
- **Intelligent & Fluid:** AI interactions feel ambient rather than intrusive—summaries, category tagging, and budget anomalies surface contextually.
- **Refined Premium:** Clean surfaces, deep indigo undertones, subtle luminous borders, and micro-glass elements convey modern luxury and high performance.

### Visual Style
A hybrid of **Modern Fintech Precision** and **Soft Luminescent Glassmorphism**. Layouts prioritize high contrast for data readability, structured grid alignments inspired by modern productivity suites, and rich, generous corner radii that soften complex mathematical information.

## Colors

The palette leverages a deep, optical slate-black canvas with saturated spectral accents. The default presentation is dark mode, engineered for luminous data visualization and OLED efficiency on mobile devices, with full bidirectional fidelity in light mode.

### Semantic Tones
- **Primary / Brand Identity:** `#6366F1` (Electric Indigo) with state variations `#4F46E5` (Hover/Active) and `#4338CA` (Pressed/Deep Accent).
- **Positive / Inflow & Savings:** `#10B981` (Emerald). Used for income, surplus, and positive budget deltas.
- **Warning / Budget Threshold:** `#F59E0B` (Amber). Denotes accounts approaching dynamic budget limits.
- **Negative / Outflow & Anomalies:** `#F43F5E` (Carmine Rose) to `#E11D48`. Applied to deficit warnings, high-velocity spending, and transaction deletions.

### Category Color System
- **Food & Dining:** `#F97316` (Warm Orange)
- **Transportation:** `#3B82F6` (Electric Azure)
- **Education:** `#8B5CF6` (Vivid Violet)
- **Leisure & Entertainment:** `#EC4899` (Hot Pink)
- **General / Other:** `#64748B` (Slate Neutral)

### Theme Tokens & Surface Roles
- **Dark Mode (Default):** Canvas `#0B0F19`, Surface-1 `#111827`, Surface-2 `#1E293B`, Surface-Border `rgba(255, 255, 255, 0.08)`, Text-Primary `#F8FAFC`, Text-Muted `#94A3B8`.
- **Light Mode:** Canvas `#F8FAFC`, Surface-1 `#FFFFFF`, Surface-2 `#F1F5F9`, Surface-Border `rgba(15, 23, 42, 0.08)`, Text-Primary `#0F172A`, Text-Muted `#64748B`.

## Typography

The type system pairs **Plus Jakarta Sans** for expressive, high-impact titles and financial telemetry with **Inter** for dense transactional records and interface controls.

### Numerical & Financial Rendering
- All currency balances and timestamps enforce tabular lining figures (`font-feature-settings: 'tnum' 1, 'cv05' 1`) to eliminate horizontal jitter during live balance updates.
- Balance amounts use a split-scale hierarchy: the currency symbol (`R$`) is rendered at 60% relative size and intermediate weight (`font-weight: 500`), while the numerical string uses `display-currency` (`font-weight: 700`).

### Responsive Adaptation
- On displays under 640px, headlines scale down via dedicated mobile variants to prevent awkward line breaks in Portuguese financial terminology (e.g., "Transferências agendadas").

## Layout & Spacing

The layout architecture shifts dynamically between a tactile single-column mobile web/PWA interface (base viewport: 390px) and a multi-panel command center on desktop (1440px max viewport container).

### Breakpoints & Reflow Models
- **Mobile (390px - 639px):** Single-column layout. Total horizontal canvas padding is locked at `1.25rem`. Navigation utilizes a persistent bottom tab bar with elevated center trigger for quick receipt capture / AI prompt entry.
- **Tablet (640px - 1023px):** 8-column fluid grid. Overview charts and transaction feeds convert into a 2-column balanced flow.
- **Desktop (1024px - 1440px+):** 12-column structured grid. Layout anchors to a fixed 260px left sidebar, a primary analytical flow spanning 8 columns, and an AI conversational / contextual insights rail spanning 4 columns.

### Vertical Rhythm
A rigid 4px spatial baseline dictates all component margins, internal card paddings, and data cell separation.

## Elevation & Depth

Visual hierarchy uses tonal surface nesting coupled with directional specular highlights and frosted glass backdrops. 

### Glassmorphism & Translucency
- **Modal Sheets & Overlays:** Applied with `backdrop-filter: blur(16px)` and background tint `rgba(17, 24, 39, 0.75)` in dark mode, `rgba(255, 255, 255, 0.8)` in light mode.
- **Floating AI Chat Input:** Utilizes an inner glow border (`inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`) and background tint `rgba(30, 41, 59, 0.6)`.

### Elevation Tiers
- **Tier 0 (Base Canvas):** Pure background canvas (`#0B0F19` dark / `#F8FAFC` light). No elevation.
- **Tier 1 (Cards, Ledger Items):** 1px boundary line (`rgba(255, 255, 255, 0.06)` dark, `rgba(15, 23, 42, 0.06)` light). Soft shadow: `0 4px 20px -2px rgba(0, 0, 0, 0.3)`.
- **Tier 2 (Popovers, Active Card Lift, AI Insights):** Accent-tinted ambient shadow: `0 12px 32px -4px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(0, 0, 0, 0.4)`.
- **Tier 3 (Floating Action Controls & Dynamic Island Toasts):** `0 20px 40px -6px rgba(0, 0, 0, 0.5)`.

## Shapes

The design uses generous, organic radii that offset financial density with consumer-grade softness.

### Corner Radius Mapping
- **Input Fields & Small Buttons:** `0.5rem` (8px via `roundedness: 2`).
- **Cards, Panels & Modal Containers:** `1rem` to `1.25rem` (16px to 20px via `rounded-lg`).
- **Dynamic AI Insight Cards & Bottom Sheet Drawers:** `1.5rem` (24px via `rounded-xl`).
- **Pills, Transaction Tags & Quick Filters:** Fully rounded (`9999px`).

## Components

### Buttons & Interactive Controls
- **Primary AI Action:** Solid `#6366F1` background, white text, subtle top border highlight (`rgba(255, 255, 255, 0.2)`). Height is 48px on mobile, 40px on desktop. Scale transforms on active tap: `transform: scale(0.98)`.
- **Secondary / Ghost:** Transparent background with 1px border (`rgba(255, 255, 255, 0.1)` in dark mode). Hover yields `rgba(99, 102, 241, 0.08)`.

### Financial Metric Cards
- Surface background matches Tier 1 elevation. Contains category badge (top left), localized expense name (body-md), and tabular numeric balance (display-currency or headline-md).
- AI delta indicators show upward or downward percentage shifts alongside emerald or carmine micro-trend icons.

### Category Chips & Expense Tags
- 28px height, pill-shaped. Background uses 12% opacity of the category color token (e.g., `#F97316` at 12%), paired with full-strength text and icon rendering to maintain strict WCAG AAA legibility.

### Transaction Ledger List Items
- Height: 64px. Two-line structure: Title (headline-sm) and category metadata/timestamp (body-sm) on the left; formatted value with prefix (`+` or `-`) on the right.
- Left-edge visual anchor: 40px circular container with a 2-tone category icon. Hover reveals inline micro-actions (re-categorize, AI explain).

### AI Dynamic Assistant Bar (Floating Input)
- Fixed at the bottom of the viewport on mobile (above the tab bar) and dockable on desktop.
- Houses a contextual text input for natural language expenses (e.g., *"Gastei 45 no almoço"*), voice input button, and camera icon for automatic receipt OCR. Border glows with indigo gradient on focus.

### Form Inputs & Selectors
- Background: Surface-2. Height: 44px. Text is left-aligned with a floating micro-label for numerical inputs. Focus state transitions border color to `#6366F1` accompanied by an exterior 3px focus ring with `rgba(99, 102, 241, 0.25)`.
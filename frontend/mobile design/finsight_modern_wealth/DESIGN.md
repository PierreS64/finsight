---
name: FinSight Modern Wealth
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#0053db'
  on-tertiary: '#ffffff'
  tertiary-container: '#7f9fff'
  on-tertiary-container: '#00328b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-currency:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-currency-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
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
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses modern wealth intelligence: authoritative, crystalline, and effortless. Tailored for high-growth personal finance and wealth management, the visual direction merges crisp Swiss modernism with tactility borrowed from high-end consumer banking.

The tone balances disciplined financial precision with optimistic growth. It avoids visual clutter, relying instead on high typographic contrast, structural whitespace, and tactile feedback. Surfaces look solid, pristine, and engineered, instilling immediate trust when reviewing investment balances, budgeting metrics, and transaction ledgers.

## Colors

The palette establishes an immediate relationship between prosperity and institutional stability.

- **Primary (`#10B981`) & Primary Dark (`#059669`)**: Conveys monetary momentum, portfolio gains, and confirmed operations. Used for affirmative actions, primary buttons, positive deltas, and progress milestones.
- **Deep Navy (`#0F172A`)**: Acts as the secondary anchor and primary text color. It provides structural weight and replaces pure black to prevent harsh contrast while preserving visual authority.
- **Accent Blue (`#2563EB`)**: Applied selectively to actionable links, active navigational tabs, and automated insights/analytics callouts.
- **Canvas (`#F8FAFC`) & Card Surface (`#FFFFFF`)**: Establishes a subtle layered foundation. Cards and modular sheets lift gently from the cool neutral backdrop.
- **Semantic Feedback**:
  - Success: `#16A34A` (Positive cash flows, budget surplus)
  - Warning: `#F59E0B` (Budget thresholds near limit, impending bills)
  - Error: `#EF4444` (Deficits, overdrafts, failed syncing)
  - Secondary Text: `#64748B` (Metadata, timestamps, currency codes)
  - Borders: `#E2E8F0` (Delicate perimeter definition)

Always maintain a 4.5:1 minimum contrast ratio against `#FFFFFF` and `#F8FAFC` for all informational text and critical glyphs.

## Typography

The typography uses Inter across all levels to optimize dense financial data readability and native diacritic rendering for Vietnamese characters ("Hiểu tài chính, làm chủ tương lai").

- **Tabular Figures**: Always enable OpenType tabular numbers (`tnum`) for monetary values, transaction records, and portfolio metrics to guarantee vertical alignment of numeric columns.
- **Vietnamese Accent Handling**: Line heights remain strictly at 1.3x - 1.5x font size to prevent overlapping diacritics on uppercase characters (such as Â, Ê, Ô, Ư, Đ).
- **Scale Contrast**: Balances leverage heavy-weight numeric display styles paired with compact uppercase descriptors (`label-sm` in `#64748B`) to establish immediate hierarchical anchors.

## Layout & Spacing

The layout is built upon an 8px base rhythm optimized for a 390x844 mobile viewport (iPhone standard base frame).

- **Screen Safe Zones**: Top margins respect dynamic island/notch boundaries with a minimum 48px offset; bottom action areas provide 34px home indicator clearance.
- **Canvas Margins**: Horizontal margins are pinned to `1rem` (16px) to maximize horizontal data bandwidth while keeping touch targets safe from bezel clipping.
- **Vertical Hierarchy**: Modular card sections stack with `1rem` (16px) margins. Related child metadata within cards utilizes `0.5rem` (8px) and `0.25rem` (4px) gaps to reinforce visual chunking.

## Elevation & Depth

Visual hierarchy uses ambient low-opacity shadow diffusion over structural borderlines. Depth relies on tonal contrast rather than heavy simulated drop shadows.

- **Level 0 (Canvas)**: Background base `#F8FAFC`.
- **Level 1 (Cards, Modules, Input Fields)**: Surface `#FFFFFF`, reinforced with a structural `1px` solid border in `#E2E8F0`, accompanied by an ambient shadow: `0px 4px 12px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Dropdowns, Floating Summaries)**: Surface `#FFFFFF`, `1px` solid `#E2E8F0`, shadow: `0px 8px 24px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modals, Bottom Sheets, Persistent Navigation)**: Surface `#FFFFFF`, backdrop overlay `rgba(15, 23, 42, 0.45)`, sheet elevation shadow: `0px -8px 32px rgba(15, 23, 42, 0.12)`.

## Shapes

The geometric framework applies consistent corner curvature across every component class:

- **Primary Cards & Containers**: Bound to `16px` to `20px` (`rounded-lg` to `rounded-xl`). This curvature softens financial data modules, making the interface welcoming.
- **Form Fields & Buttons**: Standardized at `12px` to `16px` to match internal container proportions.
- **Pill Elements (Chips, Tags, Segmented Controls)**: Set to `9999px` full roundness to denote interactivity and clear state segregation.

## Components

### Buttons
- **Primary CTA**: `#10B981` background, `#FFFFFF` text (`label-lg`), height 52px, radius 14px. Pressed state dims to `#059669`.
- **Secondary Action**: `#FFFFFF` background, `1px` solid `#E2E8F0`, `#0F172A` text. Pressed state shifts to `#F8FAFC`.
- **Destructive**: `#EF4444` background with white text, or transparent background with `#EF4444` text for inline confirmations.

### Cards & Metric Modules
- Bound to white `#FFFFFF` surface with `1px` border `#E2E8F0` and `16px` border-radius.
- Cards host a padded interior (16px). Secondary metric labels sit above primary monetary values with `4px` vertical spacing.

### Transaction Lists
- Row heights pegged at 64px to satisfy touch standards.
- Leading circular badge (40px, `#F1F5F9`) housing an outline icon, followed by transaction metadata (Title in `body-md` bold, timestamp/category in `body-sm` secondary), terminated with trailing tabular amount (`label-lg`, green for credits, dark navy for debits). Separators use `1px` border `#E2E8F0` inset by 56px.

### Inputs & Selectors
- Container height 48px, background `#FFFFFF`, border `1px` solid `#E2E8F0`, corner radius 12px, horizontal padding 14px.
- Focus state switches border to `1.5px` solid `#10B981` with an ambient green focus ring.

### Chips & Badges
- Category chips feature height 32px, `roundedness: 3` (pill), light surface `#F1F5F9`, text `#64748B`.
- Active state transitions chip to `#10B981` tint (`rgba(16, 185, 129, 0.1)`) with `#059669` label color.

### Financial Health Bar (Specialized Component)
- Segmented linear tracker with height 8px, track `#E2E8F0`, rounded caps, filled with `#10B981` (safe), `#F59E0B` (approaching threshold), and `#EF4444` (exceeded).
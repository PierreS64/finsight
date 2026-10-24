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
  display-hero:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  currency-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  currency-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  currency-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
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
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-desktop: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-trust, editorial-grade financial management platform tailored for affluent and rising-middle-class Vietnamese professionals. The brand ethos pairs institutional financial precision with modern SaaS clarity.

### Visual Style
The aesthetic sits at the intersection of **Contemporary Corporate and Precision Minimalist**:
- **Pristine Canvas:** A crisp, low-fatigue slate backdrop (`#F8FAFC`) framed by clinical white operational surfaces (`#FFFFFF`).
- **Tactile Trust:** Deep navy foundations anchor the structure, balanced by a vibrant emerald primary tone signifying growth, stability, and wealth preservation.
- **Data Clarity:** Uncluttered financial hierarchy where numbers and monetary valuations (₫) command immediate comprehension through disciplined scale, tabular numerals, and deliberate micro-copy.
- **Restrained Elevation:** Visual weight is communicated primarily via subtle hairline borders and ultra-diffused atmospheric shadows rather than thick fills or intense gradients.

## Colors

The palette is engineered for cognitive ease across dense data views, balance sheets, and cash flow charts.

### Palette Architecture
- **Primary Emerald (`#10B981` / Hover `#059669`):** Represents prosperity, positive cash flow, and primary brand actions (e.g., "Thêm giao dịch", "Đầu tư").
- **Deep Navy Base (`#0F172A`):** The structural anchor used for high-emphasis typography, critical navigation bars, and primary dark contrast elements.
- **Neutral Stack:**
  - **Surface Canvas (`#F8FAFC`):** Application-wide shell background.
  - **Surface Card (`#FFFFFF`):** Work surfaces, modal sheets, and KPI metric containers.
  - **Border / Divider (`#E2E8F0`):** Single-pixel perimeter rules.
  - **Text Primary (`#0F172A`):** Balances, header values, active table rows.
  - **Text Secondary (`#64748B`):** Captions, timestamps, subheaders, category labels.
- **Accents & Semantics:**
  - **Accent Blue (`#2563EB`):** Secondary analytics, portfolio benchmarks, link text.
  - **Success / Thu nhập (`#16A34A`):** Inflow streams, positive balance shifts.
  - **Warning (`#F59E0B`):** Budget limits, pending transaction warnings.
  - **Destructive / Chi tiêu (`#EF4444`):** Outflow transactions, overdraft, loss flags.

## Typography

The design system exclusively uses **Inter** for its neutral grotesk clarity, extensive diacritics support for Vietnamese tonality, and robust OpenType features for numbers.

### Currency & Numerical Formatting
- **OpenType Tabular Figures:** Enable `font-feature-settings: "tnum" 1` for all transaction lists, tables, and KPI metric cards to ensure vertical alignment of digits.
- **Vietnamese Currency Standards:**
  - Standard grouping with periods: `25.450.000 ₫`.
  - The currency symbol (`₫`) follows a non-breaking space after the numeric digits.
  - In compact mobile displays or charts, abbreviate using `Tr` (Triệu) or `Tỷ` (e.g., `1,25 Tỷ ₫`).

## Layout & Spacing

A disciplined **8px base grid** organizes structural alignment across the platform.

### Grid & Viewports
- **Target Desktop Canvas:** 1440 × 900px default baseline, max-width bounded container at `1400px`.
- **Desktop Grid:** 12-column layout with fixed `24px` (`1.5rem`) gutters and dynamic outer margins scaling down to `40px` (`2.5rem`).
- **Sidebar Integration:** A fixed 260px desktop navigation rail with fluid horizontal growth in the primary dashboard area.
- **Reflow Rules:**
  - **Desktop (1024px+):** 12 columns. Side-by-side KPI metric cards (4 per row or 3 per row depending on scope).
  - **Tablet (768px - 1023px):** 6 columns. Collapsible icon rail for navigation; KPI cards collapse to 2 columns.
  - **Mobile (<768px):** 4 columns. Bottom navigation bar; KPI cards stack vertically or scroll along an edge-to-edge carousel.

## Elevation & Depth

Visual depth is achieved through layered whites, surgical hairline borders, and subtle tinted ambient light. Heavy dropped drop-shadows are strictly avoided.

### Elevation Hierarchy
- **Level 0 (Flat Canvas):** `#F8FAFC`. Background layer across all pages.
- **Level 1 (Card & Content Blocks):** `#FFFFFF` fill with a `1px solid #E2E8F0` border and an ambient shadow:
  `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Dropdowns, Popovers, & Hovered Cards):** `#FFFFFF` fill with `1px solid #E2E8F0` and an elevated shadow:
  `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Level 3 (Modal Sheets & Drawer Navs):** `#FFFFFF` framed by `1px solid #CBD5E1` and high-diffusion anchor shadow:
  `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`.
- **Scrim Backdrop:** `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`.

## Shapes

The design system adopts a balanced **Rounded (`2`)** silhouette system, projecting approachable software reliability without child-like bubble shapes.

### Shape Scale Rules
- **Base Components (Inputs, Buttons, Badges):** `rounded-md` (`8px`) to `rounded-lg` (`12px`).
- **Dashboard Containers & Metric Cards:** `rounded-lg` (`12px`) to `rounded-xl` (`16px`).
- **Financial Status Badges & Avatars:** Fully rounded pill curves (`9999px`).

## Components

### Buttons
- **Primary:** Background `#10B981`, text `#FFFFFF`, font-weight 600, height 40px, padding 0 16px, border radius 10px. Hover: `#059669`. Focus: ring 2px `#10B981` offset 2px.
- **Secondary (Navy):** Background `#0F172A`, text `#FFFFFF`. Hover: `#1E293B`.
- **Outline / Ghost:** Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: `#F8FAFC`.

### Transaction Status Badges
- **Thu nhập (Inflow):** Pill badge (`rounded-full`), padding 4px 10px. Background `#DCFCE7`, text `#16A34A`, label weight 600 (`label-sm`).
- **Chi tiêu (Outflow):** Pill badge, background `#FEE2E2`, text `#EF4444`, label weight 600 (`label-sm`).
- **Đang xử lý (Pending):** Pill badge, background `#FEF3C7`, text `#D97706`.

### Cards & Metric Containers
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, border-radius 16px, padding 20px or 24px.
- Metric Layout:
  - Top: Label (`label-md`, `#64748B`) paired with a micro-outline icon in a 36x36px tinted circle container.
  - Middle: Primary currency value (`currency-display`, `#0F172A`).
  - Bottom: Indicator pill showing percentage change vs. previous month (e.g. `+12,4% so với tháng trước` in `#16A34A`).

### Data Tables
- Row height: 56px.
- Header: Text `#64748B`, font-size 12px, uppercase, tracking 0.05em, border-bottom `1px solid #E2E8F0`, background `#F8FAFC`.
- Body: Text `#0F172A`, font-size 14px, border-bottom `1px solid #F1F5F9`.
- Row interaction: Hover state applies `#F8FAFC` transition (150ms ease).
- Alignment: Text columns left-aligned; financial numbers strictly right-aligned with tabular numerals.

### Form Inputs
- Height 42px, padding 0 12px, border `1px solid #E2E8F0`, border-radius 10px, background `#FFFFFF`, typography `body-md`.
- Focus state: border `#10B981`, box-shadow `0 0 0 3px rgba(16, 185, 129, 0.15)`.
- Input affix: Numeric inputs include right-aligned static suffix text `₫` in `#64748B`.
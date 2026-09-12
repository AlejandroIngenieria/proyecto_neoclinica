---
name: SaludYa Modern Clinical
version: 1.0.0
description: Design system for SaludYa / NeoClínica healthcare platform, patient dashboard, and queue management.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-light: "#dbeafe"
  secondary: "#1e40af"
  accent-indigo: "#4f46e5"
  accent-sky: "#0ea5e9"
  accent-violet: "#8b5cf6"
  background: "#f8fafc"
  background-dark: "#0b1120"
  surface: "#ffffff"
  surface-dark: "#1e293b"
  surface-alt: "#f1f5f9"
  surface-alt-dark: "#0f172a"
  on-surface: "#0f172a"
  on-surface-muted: "#64748b"
  on-surface-dark: "#f8fafc"
  on-surface-dark-muted: "#94a3b8"
  border: "#e2e8f0"
  border-dark: "#334155"
  border-subtle: "rgba(226, 232, 240, 0.7)"
  border-subtle-dark: "rgba(30, 41, 59, 0.8)"
  status:
    programada:
      text: "#0369a1"
      bg: "#f0f9ff"
      border: "#bae6fd"
      dot: "#0ea5e9"
    confirmada:
      text: "#047857"
      bg: "#ecfdf5"
      border: "#a7f3d0"
      dot: "#10b981"
    pospuesta:
      text: "#b45309"
      bg: "#fffbeb"
      border: "#fde68a"
      dot: "#f59e0b"
    en_proceso:
      text: "#1d4ed8"
      bg: "rgba(59, 130, 246, 0.12)"
      border: "rgba(59, 130, 246, 0.25)"
      dot: "#2563eb"
    completada:
      text: "#334155"
      bg: "#f1f5f9"
      border: "#cbd5e1"
      dot: "#64748b"
    cancelada:
      text: "#be123c"
      bg: "#fff1f2"
      border: "#fecdd3"
      dot: "#f43f5e"
    no_asistio:
      text: "#b91c1c"
      bg: "#fef2f2"
      border: "#fecaca"
      dot: "#ef4444"
  modalities:
    presencial:
      text: "#047857"
      bg: "#ecfdf5"
      border: "#a7f3d0"
      icon: "#059669"
    virtual:
      text: "#0369a1"
      bg: "#f0f9ff"
      border: "#bae6fd"
      icon: "#0ea5e9"
    domicilio:
      text: "#b45309"
      bg: "#fffbeb"
      border: "#fde68a"
      icon: "#d97706"
typography:
  fontFamily:
    sans: "Inter, var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    heading: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    mono: "var(--font-geist-mono), 'SF Mono', Menlo, monospace"
  scale:
    display-lg:
      fontSize: "32px"
      lineHeight: "40px"
      fontWeight: 900
      letterSpacing: "-0.03em"
    display-md:
      fontSize: "24px"
      lineHeight: "32px"
      fontWeight: 800
      letterSpacing: "-0.02em"
    headline-lg:
      fontSize: "20px"
      lineHeight: "28px"
      fontWeight: 800
      letterSpacing: "-0.015em"
    headline-md:
      fontSize: "18px"
      lineHeight: "26px"
      fontWeight: 700
      letterSpacing: "-0.01em"
    body-lg:
      fontSize: "16px"
      lineHeight: "24px"
      fontWeight: 500
    body-md:
      fontSize: "14px"
      lineHeight: "20px"
      fontWeight: 500
    body-sm:
      fontSize: "12px"
      lineHeight: "16px"
      fontWeight: 600
    caption:
      fontSize: "11px"
      lineHeight: "14px"
      fontWeight: 700
      letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  full: "9999px"
shadows:
  2xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)"
  xs: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)"
  sm: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)"
  md: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)"
  glow-primary: "0 10px 25px -5px rgba(37, 99, 235, 0.25)"
---

# SaludYa Design System

## 1. Overview & Philosophy
**SaludYa (NeoClínica)** is a modern healthcare experience designed to bring clarity, trust, and human warmth to clinical interactions. The design bridges clean institutional medical reliability with fluid consumer convenience.

- **High Information Density with Visual Breath**: Clinical records require rich details, but clean card segregation and generous spatial hierarchy prevent cognitive overload.
- **Trust & Empathy**: Friendly neo-grotesque typography (`Inter`), rich rounded corners (`16px`–`24px`), reassuring medical blues, and vibrant semantic chips.
- **Motion with Purpose**: Active micro-interactions (`active:scale-95`, subtle hover elevations, and pulsating live status dots) communicate vitality and real-time responsiveness.

---

## 2. Color System

### Primary & Brand Palette
- **Primary Blue (`#2563EB`)**: Main CTAs, highlighted active links, selected appointment dates, and brand focal points.
- **Primary Hover (`#1D4ED8`)**: Hover and press states for primary interactive elements.
- **Secondary / Contrast Blue (`#1E40AF`)**: Headers, strong accents, and depth elements.
- **Gradient Accent (`from-blue-600 to-indigo-600`)**: Specialty doctor avatar shields, primary loyalty progress bars, and high-impact headers.

### Surfaces & Backgrounds
- **Light Theme**:
  - Page Background: `#F8FAFC` (Slate-50)
  - Card & Container Surface: `#FFFFFF` (Pure white)
  - Secondary Inset: `#F1F5F9` (Slate-100)
- **Dark Theme**:
  - Page Background: `#0B1120` (Deep midnight navy)
  - Card & Container Surface: `#1E293B` (Slate-800)
  - Header & Inset Surface: `#0F172A` (Slate-900)

### Clinical Status Colors
Every status in the patient journey has dedicated semantic coding:
- **Programada**: Sky `#0284C7` (Light: `#F0F9FF` background, `#BAE6FD` border).
- **Confirmada**: Emerald `#047857` (Light: `#ECFDF5` background, `#A7F3D0` border).
- **Pospuesta**: Amber `#B45309` (Light: `#FFFBEB` background, `#FDE68A` border).
- **En Consulta / En Proceso**: Animated Royal Blue pulse `#2563EB` with live dot indicator.
- **Completada / Atendido**: Slate `#334155` (Clean neutral completion).
- **No Asistió / Cancelada / Rechazada**: Rose/Red `#B91C1C` / `#BE123C` (Clear destructive warning).

### Medical Consultation Modalities
- **Presencial (In-person)**: Emerald badge with `Building2` icon. Represents clinic presence.
- **Virtual (Telemedicine)**: Sky badge with `Video` icon. Highlights remote video consultations.
- **A Domicilio (Home Visit)**: Warm Amber badge with `Home` icon. Highlights doorstep medical visits.

---

## 3. Typography System

The application relies on **Inter** paired with **Geist** for crisp medical readability across desktop, tablet, and mobile.

- **Display & Section Titles**: `Inter`, 24px–32px, weights `800` (ExtraBold) or `900` (Black). Letter spacing `-0.02em` to `-0.03em`.
- **Card Titles / Doctor Names**: `Inter`, 16px–20px, weight `800` (ExtraBold).
- **Body & Clinical Descriptions**: `Inter`, 14px–16px, weight `500` (Medium). High contrast for readability.
- **Metadata, Timestamps & Labels**: `Inter`, 11px–12px, weight `700` (Bold) or `800` (ExtraBold), often uppercase for section subheaders.
- **Numeric Counters & Timers**: Monospaced or tabular numbers for queue positions (`#1`, `#2`) and live clocks.

---

## 4. Components & Patterns

### Sticky Headers (Sala de Espera / Queue Rooms)
- **Zero Borders (`border-none`)**: Avoid dividing lines across sticky viewports. Rely on subtle backdrop blurs (`backdrop-blur-md bg-white/95 dark:bg-[#0F172A]/95`) and gentle elevation (`shadow-xs`).
- **Generous Vertical Spacing**: `py-4 sm:py-5 lg:py-6` to let clinical title, doctor photo, specialty chip, and location breathe.
- **Action Buttons (Voice / Refresh)**: Pure icon-only buttons (`border-0`, transparent background, `h-6 w-6` icons, subtle hover highlights, and `active:scale-90` tactile feedback).

### Appointment & Turn Cards (`TurnoCard`, `CitaCard`)
- **Corner Radius**: `rounded-2xl` (16px) or `rounded-3xl` (24px).
- **Modality & Status Hierarchy**:
  - Modality chips are prominently visible inside card bodies (`Presencial`, `Virtual`, `A Domicilio`).
  - Status indicators use a dot + bold label.
- **Patient Attempt Safeguards**:
  - If a patient has used their single reschedule swap attempt for a queue or appointment, swap CTA is cleanly replaced with an informative pill badge (`"Intento ya utilizado"`).
  - Past expired appointments automatically resolve to `"No asistió"` and suppress modification/cancellation actions.

### Buttons & Interactive Controls
- **Primary CTA**: Blue `#2563EB`, text `#FFFFFF`, radius `rounded-xl` or `rounded-2xl`, subtle shadow (`shadow-glow-primary`).
- **Secondary / Outline CTA**: Border `#E2E8F0` dark `#334155`, text slate-700 dark text slate-200.
- **Ghost / Icon-only Buttons**: `border-0`, transparent background, soft hover fill, radius `rounded-2xl` or `rounded-full`.
- **Destructive CTA**: Rose tint `#FFF1F2`, text `#BE123C`, border `#FECDD3`.

### Navigation & Layout Density
- **Main Dashboard**: Top of screen opens immediately with **Próximas Citas**, without redundant welcome banners or duplicate profile photos that already exist in the sticky navbar.
- **Master-Detail Flow**: Smooth accordion sections for standalone appointments versus treatment series.

---

## 5. Do's and Don'ts

### Do's
- **Do** prioritize immediate actionability: Patients and doctors want to know their next appointment, time, clinic, and turn number in under 2 seconds.
- **Do** keep sticky headers borderless, spacious, and transparent-blur.
- **Do** use semantic modality badges on all appointment items to avoid patient confusion between in-person and telemedicine visits.
- **Do** ensure dark mode maintains comfortable contrast (slate-800 surfaces over midnight slate-900/950 backgrounds).

### Don'ts
- **Don't** add boxy borders or solid colored square containers to minimal header icon buttons (voice, refresh).
- **Don't** duplicate user profile greetings and photos when the navigation bar already renders them.
- **Don't** mix inconsistent corner radii on the same view (use `rounded-2xl` as standard card radius).
- **Don't** allow actions like "Modificar" or "Cancelar" on past expired appointments.

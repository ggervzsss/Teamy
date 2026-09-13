---
name: Teamy Monolith
colors:
  surface: "#131317"
  surface-dim: "#131317"
  surface-bright: "#39393d"
  surface-container-lowest: "#0e0e12"
  surface-container-low: "#1b1b1f"
  surface-container: "#1f1f23"
  surface-container-high: "#2a2a2e"
  surface-container-highest: "#353439"
  on-surface: "#e4e1e7"
  on-surface-variant: "#c4c7c8"
  inverse-surface: "#e4e1e7"
  inverse-on-surface: "#303034"
  outline: "#8e9192"
  outline-variant: "#444748"
  surface-tint: "#c6c6c7"
  primary: "#ffffff"
  on-primary: "#2f3131"
  primary-container: "#e2e2e2"
  on-primary-container: "#636565"
  inverse-primary: "#5d5f5f"
  secondary: "#c6c6c6"
  on-secondary: "#303030"
  secondary-container: "#474747"
  on-secondary-container: "#b5b5b5"
  tertiary: "#ffffff"
  on-tertiary: "#2f3131"
  tertiary-container: "#e2e2e2"
  on-tertiary-container: "#636565"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#e2e2e2"
  primary-fixed-dim: "#c6c6c7"
  on-primary-fixed: "#1a1c1c"
  on-primary-fixed-variant: "#454747"
  secondary-fixed: "#e2e2e2"
  secondary-fixed-dim: "#c6c6c6"
  on-secondary-fixed: "#1b1b1b"
  on-secondary-fixed-variant: "#474747"
  tertiary-fixed: "#e2e2e2"
  tertiary-fixed-dim: "#c6c6c7"
  on-tertiary-fixed: "#1a1c1c"
  on-tertiary-fixed-variant: "#454747"
  background: "#131317"
  on-background: "#e4e1e7"
  surface-variant: "#353439"
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: "800"
    lineHeight: "1.1"
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: -0.01em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0"
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin: 32px
  max-width: 1440px
---

## Brand & Style

The design system is rooted in a "Monolith Minimalist" aesthetic, prioritizing extreme clarity and architectural structure for high-performance team collaboration. It targets modern professionals who value focus and executive-level sophistication over decorative noise.

The visual narrative combines the stark authority of high-contrast black-and-white photography with the ethereal depth of glassmorphism. This juxtaposition creates a UI that feels both grounded and futuristic. The atmosphere is quiet, intentional, and premium, evoking a sense of calm efficiency within a fast-paced work environment.

## Colors

This design system utilizes a strict monochromatic palette to eliminate cognitive load and emphasize content. The default mode is a deep "Obsidian" dark mode.

- **Primary:** Crisp White (#FFFFFF) is reserved for primary actions, critical text, and thin borders.
- **Background:** Pure Black (#000000) serves as the infinite canvas, providing maximum contrast for glass elements.
- **Grays:** Cool-toned grays are used sparingly to define secondary surfaces and inactive states without breaking the high-contrast rhythm.
- **Glass:** Translucency is achieved through low-opacity white overlays combined with high-radius background blurs (30px+), creating a layered "floating" effect.

## Typography

The design system employs **Hanken Grotesk** for its sharp, contemporary geometry and exceptional legibility in professional contexts. Headings feature heavy weights and tight letter spacing to create a distinctive, "editorial" impact.

**Geist** is used for utility labels, metadata, and monospaced data points to provide a technical, precise counterpoint to the bold headings. On mobile devices, display sizes scale down by 25% to maintain readability within the viewport, while body text remains constant to ensure accessibility.

## Layout & Spacing

The layout philosophy is built on a 12-column fluid grid for desktop and a single-column flow for mobile. The system uses a strict 4px baseline grid to maintain vertical rhythm.

- **Desktop:** 12 columns with 24px gutters. Content is often centered with generous outside margins to focus the user’s eye.
- **Mobile:** 16px side margins with stacked components.
- **Rhythm:** Spacing between sections is aggressive (48px+) to allow the glassmorphic cards to "breathe" against the black background. Containers use internal padding of 24px or 32px to ensure content never feels cramped.

## Elevation & Depth

Depth in this design system is conveyed through optical refraction rather than traditional drop shadows.

1.  **Level 0 (Base):** Pure #000000 background.
2.  **Level 1 (Navigation/Sidebar):** 2% White overlay, 40px Backdrop Blur, 1px solid border (rgba 255, 255, 255, 0.08).
3.  **Level 2 (Cards/Modals):** 5% White overlay, 60px Backdrop Blur, 1px solid border (rgba 255, 255, 255, 0.15).
4.  **Level 3 (Popovers/Tooltips):** 10% White overlay, no blur, crisp 1px White border.

A very subtle, diffused black shadow (0px 20px 40px rgba(0,0,0,0.5)) is applied to Level 2 and 3 elements to separate them from the Level 1 surfaces they overlap.

## Shapes

The design system utilizes a "Large Radius" language to soften the high-contrast aesthetic and make the glass surfaces feel like polished smooth stones.

Main containers and cards use a 1.5rem (24px) radius. Interactive elements like buttons and input fields use a 1rem (16px) radius. This consistent curvature reinforces the sophisticated, friendly-yet-professional tone of the app.

## Components

- **Buttons:** Primary buttons are solid White (#FFFFFF) with Black (#000000) text. Secondary buttons are ghost-style with a 1px White border and 5% white hover state. All transitions are 200ms ease-out.
- **Cards:** Glassmorphic surfaces with a fine 1px white border. Content inside cards follows the 24px internal padding rule.
- **Input Fields:** Dark gray (#1A1A1E) background with 1px border that glows white on focus. Labels sit above the field in Geist Mono, uppercase.
- **Chips/Badges:** Small, high-radius (pill) shapes. Active states use solid white; inactive states use translucent gray with white text.
- **Navigation:** Vertical sidebars use a persistent glass layer with active states indicated by a thick (4px) vertical white bar on the left edge.
- **Collaboration Cursors:** Minimalist white outlines with user names in small Geist labels, maintaining the monochrome theme while indicating presence.

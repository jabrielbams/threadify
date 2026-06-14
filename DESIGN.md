---
name: Threadify
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
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  title-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  max-width-feed: 600px
---

## Brand & Style
The design system for this platform is built on a philosophy of **Hyper-Minimalism**. It prioritizes content over container, removing unnecessary visual noise to allow conversations to take center stage. The aesthetic is inspired by the clarity of modern micro-blogging platforms, utilizing significant whitespace (or "darkspace"), precise geometric alignments, and a sophisticated typographic hierarchy. 

The emotional response should be one of "Focused Calm"—a professional yet social environment that feels lightweight, fast, and intentional. The style utilizes a **Modern-Corporate** framework with subtle **Glassmorphism** for navigational overlays, ensuring the UI feels deep and layered without being heavy.

## Colors
The palette is rooted in a high-contrast grayscale foundation to ensure maximum readability. 

- **Primary Indigo (#6366f1):** Used for primary actions, active states, and verified badges. It provides a technical, energetic spark.
- **Secondary Violet (#8b5cf6):** Reserved for interactive highlights, gradients in media states, or secondary brand moments.
- **Neutrals:** A range of slate grays is used for secondary text and borders. In Dark Mode, the background is near-black (#0a0a0a) to allow the Indigo accent to pop without causing eye strain.
- **Surface Logic:** Use pure white or near-black for the main canvas, with subtle 5% opacity shifts for nested containers or hover states.

## Typography
This design system utilizes **Geist** for its technical precision and developer-centric clarity. The typographic scale is aggressive to create a clear information hierarchy in dense feeds.

- **Headlines:** Use tight letter-spacing and bold weights to ground the page.
- **Body Text:** Generous line-height (1.6) is applied to `body-lg` to ensure long-form threads remain legible.
- **Labels:** Used for metadata (timestamps, view counts). These should utilize a slightly lighter color token (Neutral 500) to recede visually.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main content feed is constrained to a maximum width (600px) to optimize readability, while sidebars and navigation adapt to the screen width.

- **The Grid:** A 12-column grid is used for desktop layouts, but the center "Feed" column typically spans 6-7 columns for focus.
- **Vertical Rhythm:** A strict 4px baseline grid ensures consistent spacing between headers, text blocks, and media.
- **Mobile:** Margins shrink to 16px. Sidebars collapse into a bottom navigation bar or a hidden drawer.
- **Desktop:** Left-hand navigation is persistent; right-hand "Trends/Discovery" modules are fixed-width cards.

## Elevation & Depth
This design system avoids traditional shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** The base canvas.
- **Level 1 (Cards/Feed):** Defined by a 1px solid border (#e2e8f0 in light, #262626 in dark). No shadow.
- **Level 2 (Dropdowns/Modals):** These use a soft "Ambient Shadow"—10% opacity black with a 20px blur—combined with a backdrop-blur (12px) to create a glass-like separation.
- **Interactions:** Hover states are indicated by a subtle background color shift (e.g., White to Gray-50) rather than an elevation increase.

## Shapes
The shape language is "Modern-Organic." We use a consistent 0.5rem (8px) radius for standard UI elements to feel approachable but structured.

- **Standard (8px):** Input fields, cards, and media thumbnails.
- **Large (16px):** Dialogs and main container modules.
- **Pill (Full):** Buttons and search bars to distinguish them as high-priority interactive elements.
- **Avatars:** Strictly circular to contrast against the geometric grid of the feed.

## Components
- **Buttons:** Primary buttons are Indigo-filled with white text, using a Pill shape. Secondary buttons are outlined with a 1px border. 
- **Cards (Threads):** Cards have no background fill on the main feed; they are separated by a 1px bottom border. "Featured" cards or sidebar modules use a Level 1 surface with a subtle 0.5rem radius.
- **Inputs:** Search bars use a Pill shape with a subtle gray fill and no border until focused. On focus, the border transitions to Primary Indigo.
- **Interactive Elements:** Iconography should be "Linear" (2px stroke) and scale to 20px. Hovering over a "Like" or "Retread" icon triggers a soft circular background highlight.
- **Feed:** The thread line—the vertical line connecting related posts—is a 2px solid neutral-200/800 line, providing a structural anchor for conversations.

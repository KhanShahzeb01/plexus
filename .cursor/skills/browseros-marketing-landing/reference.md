# BrowserOS Landing — Technical Reference

Canonical source: `plexus repo root (this project)` @ `main` (as of Plexus landing page build).

## File map

| File | Lines (approx) | Responsibility |
|------|----------------|----------------|
| `index.html` | 380 | Structure, copy, `#card-zoom-portal` |
| `css/landing.css` | 1160 | Tokens, layout, all component styles |
| `js/landing.js` | 520 | IIFE: reveal, nav, hero, zoom, stickers, carousel |

## CSS custom properties

```css
:root {
  --cream: #f3efe6;
  --cream-deep: #e8e2d6;
  --paper: #faf8f3;
  --ink: #121212;
  --ink-muted: #5c5c5c;
  --ink-soft: #8a8a8a;
  --dark: #0c0c0c;
  --dark-elevated: #161616;
  --white: #ffffff;
  --accent: #1a1a1a;
  --clay: #c4714a;
  --lavender: #b8a9c9;
  --mint: #a8cfc0;
  --terminal-green: #3dd68c;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
  --shadow-soft: 0 8px 32px rgba(0, 0, 0, 0.08);
  --radius: 14px;
  --radius-lg: 22px;
  --font-serif: "Instrument Serif", Georgia, serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --nav-height: 72px;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.45, 0.64, 1);
}
```

## Section backgrounds

| Class | Background |
|-------|------------|
| `section-light` | `--cream` |
| `section-paper` | `--paper` + subtle grid lines |
| `section-dark` | `--dark` |
| `section-faq` | `--dark` |

## Sticker card colors

| Class | Background |
|-------|------------|
| `sticker-cream` | `#fff9e5` |
| `sticker-clay` | `#f2e0d4` |
| `sticker-mint` | `#dff5ec` |
| `sticker-lavender` | `#ede8f4` |
| `sticker-sky` | `#dceef8` |
| `sticker-blush` | `#f8e4ec` |

Decorate front face with `tape` (top tape pseudo) or `pin pin-gold|teal|coral`.

## Carousel card colors

| Class | Background |
|-------|------------|
| (default) | `#2a2a2a` + white text |
| `carousel-card--cream` | `--cream` + `--ink` text |
| `carousel-card--clay` | `--clay` |
| `carousel-card--lavender` | `--lavender` |
| `carousel-card--mint` | `--mint` |

## JS modules & constants

### Scroll reveal
- Selector: `.reveal`
- IntersectionObserver: `threshold: 0.12`, `rootMargin: "0px 0px -40px 0px"`
- Visible class: `is-visible`

### Nav (`#site-nav`)
- Hide class: `nav-hidden` when scrolling down past 120px
- Dark invert: `nav-on-dark` when overlapping `.section-dark` or `.section-faq`

### Hero terminal
| Constant | Value |
|----------|-------|
| `REST_X` | 12° |
| `REST_Y` | -22° |
| `MAX_TILT` | 20° |
| Lerp factor | 0.085 |

IDs: `#hero-visual`, `#terminal-tilt`, `#terminal-card`, `#terminal-glare`, `#terminal-shadow`, `#terminal-aura`, `#terminal-ambient`

### Sticker tilt
- Selector: `[data-tilt]`
- Tilt: `rotateY(x * 14deg) rotateX(-y * 14deg)` on `.card-inner`
- Skip when `is-zoom-source`

### Click zoom (stickers only)
| Item | Detail |
|------|--------|
| Portal | `#card-zoom-portal` → `.card-zoom-backdrop`, `.card-zoom-stage` |
| Guard | `card.closest("#stickers")` |
| Max scale | 2 (clamped to viewport) |
| Dismiss | backdrop click, Escape, toggle same card |
| Crisp props | fontSize, padding, margin, borderRadius, gap, minHeight, lineHeight |

### Carousel
| Constant | Value |
|----------|-------|
| `AUTO_PX_PER_SEC` | 30 |
| `DRAG_MULT` | 1.2 |
| `HOVER_SCROLL_MULT` | 0.9 |
| `SNAP_EASE` | 0.1 |

IDs: `#carousel-viewport`, `#use-carousel` (track)

Loop: clone all `.carousel-card` nodes, append with `data-clone="true"`, measure `loopWidth` from first clone offset.

3D per card in `updateCarousel3D()`:
```javascript
const dist = (cardCenter - viewportCenter) / vp.width;
rotateY = clamp(dist * 55, -28, 28);
scale = 1 - min(0.12, abs(dist) * 0.2);
```

Track position: `carouselTrack.style.transform = translate3d(-trackOffset, 0, 0)` — **never** `scrollLeft`.

Click (dragMoved ≤ 8): set `snapTarget` to center card in viewport — **no zoom**.

## CSS class index

### Layout
- `.hero` — 2-col grid ≥960px
- `.hero-visual` — perspective 1600px
- `.sticker-grid` — 1/2/3 col at 0/640/960px
- `.feature-block`, `.feature-block--alt` — alternating feature rail
- `.carousel-wrap`, `.carousel-viewport`, `.carousel-track`

### 3D hero
- `.terminal-rig`, `.terminal-chassis`, `.terminal-bezel`, `.terminal-card`
- `.terminal-chassis__edge--left/right`, `.terminal-chassis__lip`
- `.terminal-keyboard` — decorative key caps

### 3D stickers
- `.card-3d`, `.card-inner`, `.card-face`, `.card-front`, `.card-back`
- `.sticker-label`, footer in `.sticker footer`

### Zoom clone
- `.card-zoom-clone`, `.card-zoom-clone.is-zoomed`
- `.card-3d.is-zoom-source` — opacity 0.12 while zoomed

### Buttons
- `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-lg`
- `.pill` — trust row chips
- `.section-tag`, `.section-tag--light`

## Reduced motion

When `prefers-reduced-motion: reduce`:
- All `.reveal` visible immediately
- Hero tilt disabled
- Carousel auto-drift `AUTO_PX_PER_SEC = 0`
- Zoom disabled
- Cursor blink / pulse animations off

## GitHub Pages deploy

1. `index.html` = landing at `/`
2. `chat.html` (or app) at `/chat.html`
3. Relative asset paths: `css/landing.css`, `js/landing.js`
4. Settings → Pages → Deploy from `main` / root

## Adaptation checklist for new accent color

Replace `--terminal-green` and derived rgba glows in:
- Hero terminal border, text, cursor, aura
- `.drag-hint__pulse`
- Optional: keep cream/dark palette unchanged for brand consistency

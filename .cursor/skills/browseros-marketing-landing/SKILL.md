---
name: browseros-marketing-landing
description: >-
  Build BrowserOS-inspired static marketing landing pages with cream/dark palette,
  3D hero, sticker grid click-zoom, horizontal carousel with 3D rotateY, scroll
  reveals, and nav hide/show. Use when creating product landing pages, marketing
  sites for dev tools, or rebuilding UI like the Plexus landing page.
---

# BrowserOS Marketing Landing Page

Canonical reference implementation: **`plexus repo root (this project)`** (`index.html`, `css/landing.css`, `js/landing.js`).

Read [reference.md](reference.md) for tokens, motion constants, and interaction rules.  
Read [templates.md](templates.md) for HTML section scaffolds.

## Architecture

Static HTML/CSS/JS — no build step. App lives at separate path (e.g. `chat.html`).

```
index.html          # Marketing landing
<app>.html          # Unchanged product UI
css/landing.css     # All landing styles
js/landing.js       # All landing interactions (IIFE)
```

Deploy: GitHub Pages from repo root. `index.html` = landing, CTA links to app.

## Rebuild workflow

Copy this checklist when adapting for a new tool:

```
- [ ] 1. Copy landing.css + landing.js from Plexus (or scaffold from templates)
- [ ] 2. Replace brand name, copy, stats, feature blocks, sticker content
- [ ] 3. Customize hero terminal text + accent color (--terminal-green)
- [ ] 4. Set sticker grid: 6 cards, 6 unique colors, 3×2 grid
- [ ] 5. Set carousel: N persona cards, clone loop in JS, unique card color classes
- [ ] 6. Point all CTAs to <app>.html
- [ ] 7. Verify: no horizontal page scroll, reduced-motion fallbacks
- [ ] 8. Test: hero tilt, sticker click-zoom, carousel drag/hover-scroll only
```

## Page sections (in order)

| # | ID | Class | Purpose |
|---|-----|-------|---------|
| — | `top` | `hero section-light` | Copy + 3D hero visual |
| 01 | `features` | `section-light feature-rail` | Alternating feature blocks |
| 02 | `stickers` | `section-paper` | 6 tilt stickers, **click zoom** |
| 03 | `use-cases` | `section-dark` | Carousel, **scroll only, no zoom** |
| 04 | `preview` | `section-light preview-section` | CTA to app |
| 05 | `faq` | `section-faq` | `<details>` accordion |
| — | — | `site-footer section-dark` | Final CTA |

Add `class="reveal"` (+ optional `reveal-delay-1`…`5`) for scroll entrance.

## Interaction rules (do not mix up)

| Component | Trigger | Behavior |
|-----------|---------|----------|
| **Hero terminal** | Mouse move over `#hero-visual` | 3D tilt + glare + shadow parallax |
| **Stickers** (`#stickers .card-3d`) | Mouse move | Tilt `rotateY`/`rotateX` on `.card-inner` |
| **Stickers** | **Click** | Crisp 2× zoom to viewport center; backdrop/Esc/click again closes |
| **Carousel** | Auto | Slow drift `30px/s`, infinite loop via cloned cards |
| **Carousel** | Drag or L/R mouse move | Scroll track; **never zoom** |
| **Carousel** | Click (no drag) | Snap card to carousel center (`snapTarget`) |
| **Nav** | Scroll down | Hide; scroll up = show; invert on dark sections |

**Critical:** Zoom portal (`#card-zoom-portal`) is **stickers only**. Guard with `card.closest("#stickers")`.

## Design tokens (summary)

Use CSS variables from `:root` in `landing.css`:

- Backgrounds: `--cream`, `--paper`, `--dark`
- Text: `--ink`, `--ink-muted`, `--ink-soft`, `--white`
- Accents: `--clay`, `--lavender`, `--mint`, `--terminal-green`
- Fonts: `--font-serif` (Instrument Serif), `--font-sans` (Inter), `--font-mono` (IBM Plex Mono)
- Motion: `--ease-out`, `--ease-spring`

Sticker colors (one per card): `sticker-cream`, `sticker-clay`, `sticker-mint`, `sticker-lavender`, `sticker-sky`, `sticker-blush`.

Carousel variants: default dark, `carousel-card--cream`, `--clay`, `--lavender`, `--mint`.

## Crisp click-zoom (stickers)

Clone at **native 2× dimensions** (not `scale(2)` on 1× DOM):

1. `targetW = rect.width * scale`, `targetH = rect.height * scale` (scale max 2)
2. `startScale = 1 / scale` — animate CSS transform from `scale(startScale)` → `scale(1)`
3. `applyCrispScale()` copies computed `fontSize`, padding, borders, gaps × scale on clone tree
4. Portal: `#card-zoom-portal` with backdrop click + Escape to dismiss

## Horizontal scroll prevention

```css
html, body.landing-body { overflow-x: clip; max-width: 100%; }
.carousel-viewport { overflow: clip; contain: layout paint; }
.carousel-track { position: absolute; transform: translate3d(...); } /* not overflow-x:auto */
```

## Fonts (Google)

```
Instrument Serif | Inter | IBM Plex Mono
```

## What to customize per tool

- Product name, eyebrow, H1, lead, pills, stats grid
- Hero terminal session text (keep monospace / pipeline aesthetic)
- 5 feature blocks + orbit icons
- 6 sticker titles (capability-focused)
- 5–9 carousel personas (role-focused)
- FAQ items, meta description, CTA label (`Launch X →`)

## What to keep identical

- File split (`landing.css` / `landing.js`)
- Section order and class names
- Nav behavior, reveal observer settings
- Carousel translate3d + 3D `rotateY` from center distance
- Sticker 3×2 grid breakpoints (1 / 2 / 3 columns)
- Click-zoom only on `#stickers`; carousel scroll-only

## Verification

```bash
cd <project> && python3 -m http.server 8765
# Hard refresh http://127.0.0.1:8765/
```

- `document.documentElement.scrollWidth === clientWidth` (no horizontal scroll)
- Sticker click → centered 2× clone, `ratio ≈ 2`
- Carousel click without drag → no zoom, card centers
- Carousel drag → track moves, no zoom clone

## Additional resources

- Full tokens, JS constants, CSS class map: [reference.md](reference.md)
- HTML snippets per section: [templates.md](templates.md)
- Live demo: https://khanshahzeb01.github.io/plexus/

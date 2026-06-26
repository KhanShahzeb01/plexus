# Landing page blueprint

This repo is the **canonical implementation** of the BrowserOS-inspired Plexus marketing landing page.

## Source files

| File | Role |
|------|------|
| `index.html` | Landing page |
| `chat.html` | Product app (unchanged) |
| `css/landing.css` | All landing styles |
| `js/landing.js` | All landing interactions |

Live: https://khanshahzeb01.github.io/plexus/

## Rebuild skill

To build the same UI for another tool (colors, cards, animations, carousel, zoom):

**Skill:** `.cursor/skills/browseros-marketing-landing/` (in this repo) or `~/.agents/skills/browseros-marketing-landing/`

Tell the agent: *"Use the browseros-marketing-landing skill to build a landing page for [tool]."*

## Quick rules

- **Stickers** (`#stickers`): mouse tilt + **click** → crisp 2× center zoom
- **Carousel** (`#use-cases`): auto-drift + drag/hover scroll only — **no zoom**
- **Hero**: 3D terminal rig, mouse-follow tilt
- **No horizontal page scroll** — carousel uses `translate3d` inside clipped viewport

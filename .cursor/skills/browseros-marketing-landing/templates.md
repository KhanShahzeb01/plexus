# BrowserOS Landing — HTML Templates

Replace `{{PLACEHOLDERS}}`. Keep class names and structure identical for CSS/JS compatibility.

## Document shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PRODUCT}} — {{TAGLINE}}</title>
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/landing.css">
</head>
<body class="landing-body">
  <!-- sections -->
  <div id="card-zoom-portal" class="card-zoom-portal" aria-hidden="true">
    <div class="card-zoom-backdrop"></div>
    <div class="card-zoom-stage"></div>
  </div>
  <script src="js/landing.js" defer></script>
</body>
</html>
```

## Nav

```html
<nav id="site-nav" class="site-nav" aria-label="Primary">
  <a class="logo" href="#top">
    <span class="logo-mark" aria-hidden="true">▣</span>
    <span>{{PRODUCT}}</span>
  </a>
  <div class="nav-links" id="nav-links">
    <a href="#features">Features</a>
    <a href="#stickers">Capabilities</a>
    <a href="#use-cases">Use cases</a>
    <a href="#faq">FAQ</a>
  </div>
  <a class="btn btn-primary nav-cta" href="{{APP}}.html">Launch {{PRODUCT}} →</a>
</nav>
```

## Hero

```html
<header id="top" class="hero section-light reveal">
  <div class="hero-copy">
    <p class="eyebrow">{{EYEBROW}}</p>
    <h1>{{HEADLINE}} <em>{{HEADLINE_EM}}</em></h1>
    <p class="lead">{{LEAD}}</p>
    <div class="hero-actions">
      <a class="btn btn-primary btn-lg" href="{{APP}}.html">Launch {{PRODUCT}} →</a>
      <a class="btn btn-ghost" href="#preview">See the interface</a>
    </div>
    <div class="trust-row">
      <span class="pill">{{PILL_1}}</span>
      <span class="pill">{{PILL_2}}</span>
      <span class="pill">{{PILL_3}}</span>
    </div>
    <dl class="stats-grid">
      <div><dt>{{STAT_1}}</dt><dd>{{VAL_1}}</dd></div>
      <!-- 6 stats total -->
    </dl>
  </div>
  <div class="hero-visual reveal reveal-delay-2" id="hero-visual">
    <!-- Copy terminal-rig block from plexus/index.html lines 57–96 -->
    <p class="drag-hint"><span class="drag-hint__pulse" aria-hidden="true"></span>Move your cursor — terminal tilts with you</p>
  </div>
</header>
```

## Feature block (repeat 5×, alternate `feature-block--alt`)

```html
<article class="feature-block reveal">
  <div class="feature-meta"><span>01 // {{TAG}}</span></div>
  <div class="feature-content">
    <h3>{{TITLE}}</h3>
    <p>{{BODY}}</p>
    <div class="feature-tags"><span>{{TAG_A}}</span><span>{{TAG_B}}</span></div>
  </div>
  <div class="feature-visual sticker-hover">
    <div class="orbit-icon">{{ICON}}</div>
  </div>
</article>
```

## Sticker card (6×, unique `sticker-*` color + `reveal-delay-N`)

```html
<article class="sticker card-3d sticker-cream reveal" data-tilt>
  <div class="card-inner">
    <div class="card-face card-front tape">
      <p class="sticker-label">• {{LABEL}}</p>
      <h3>{{TITLE}}</h3>
      <p>{{BODY}}</p>
      <footer>{{FOOTER}}</footer>
    </div>
    <div class="card-face card-back">
      <p>{{BACK_TEXT}}</p>
    </div>
  </div>
</article>
```

Color rotation: `sticker-cream`, `sticker-clay`, `sticker-mint`, `sticker-lavender`, `sticker-sky`, `sticker-blush`.  
Alternate `tape` / `pin pin-gold|teal|coral` on front face.

## Carousel card

```html
<article class="carousel-card carousel-card--cream" data-index="0">
  <p class="carousel-label">• {{LABEL}}</p>
  <h3>{{TITLE}}</h3>
  <p>{{BODY}}</p>
</article>
```

Wrap in:
```html
<section id="use-cases" class="section-dark">
  <div class="section-head reveal">
    <p class="section-tag section-tag--light">[ 03 ] — USE CASES</p>
    <h2>Built for <em>every builder.</em></h2>
  </div>
  <div class="carousel-wrap reveal">
    <div class="carousel-viewport" id="carousel-viewport">
      <div class="carousel-track" id="use-carousel" tabindex="0" aria-label="Use case carousel">
        <!-- cards -->
      </div>
    </div>
    <p class="carousel-hint">← drag to explore →</p>
  </div>
</section>
```

## FAQ item

```html
<details class="faq-item">
  <summary>{{QUESTION}}</summary>
  <p>{{ANSWER}}</p>
</details>
```

## Footer CTA

```html
<footer class="site-footer section-dark">
  <div class="footer-inner reveal">
    <h2>Ready to enter the terminal?</h2>
    <p>Launch {{PRODUCT}} — your chat, your keys, your machine.</p>
    <a class="btn btn-primary btn-lg" href="{{APP}}.html">Launch {{PRODUCT}} →</a>
    <p class="footer-note">Static · client-side · {{STACK}}</p>
  </div>
</footer>
```

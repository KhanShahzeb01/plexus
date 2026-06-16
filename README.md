# Plexus

Terminal-themed AI chat app powered by OpenRouter. Static HTML/CSS/JS — no build tools, no frameworks, no backend.

```
index.html          # App shell
css/base.css        # Core layout and components
css/themes.css      # Theme variants
js/app.js           # UI, chat, settings, vision
js/plan-pipeline.js # Plan mode and /research pipeline
```

Looks and feels like the rallies CLI terminal, works on your phone.

## Deploy (free, 2 minutes)

### Option 1: GitHub Pages

```bash
# 1. Create a repo on GitHub (e.g. "plexus")
# 2. Push the file
git init
git add index.html css/ js/
git commit -m "plexus"
git remote add origin https://github.com/YOUR_USERNAME/plexus.git
git branch -M main
git push -u origin main

# 3. Enable GitHub Pages:
#    Settings → Pages → Deploy from branch → main / (root) → Save
#    → Your site will be at https://YOUR_USERNAME.github.io/plexus
```

### Option 2: Vercel (drag & drop)

1. Go to https://vercel.com/new
2. Drag the project folder (or zip `index.html`, `css/`, and `js/`) onto the deployment area
3. Click Deploy
4. Your site will be at `https://plexus-xxx.vercel.app`

### Option 3: Cloudflare Pages

1. Go to https://dash.cloudflare.com → Pages
2. Click "Upload assets" → Upload the project (`index.html`, `css/`, `js/`)
3. Deploy — done

### Option 4: Open locally

Just open `index.html` in your browser. Everything works offline except AI responses.

## Usage

1. Open the app
2. Click ⚙ (top-right) to enter your OpenRouter API key
3. Pick a model (free models available like `openai/gpt-oss-120b:free`)
4. Optionally set a custom system prompt
5. Start chatting — responses stream in real-time like a terminal

Get an API key: https://openrouter.ai/keys

## Features

- Terminal-style UI matching the rallies CLI aesthetic
- Streaming AI responses via OpenRouter
- Chat history saved in your browser (localStorage)
- Export conversations as Markdown
- Works offline for previous messages
- Mobile-responsive
- No tracking, no servers, no accounts

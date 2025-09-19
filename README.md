# Simulations — a completely vibe‑coded JavaScript playground 🎛️✨

Generative motion. Cozy gradients. Tiny engine. Big vibes.
This repo is a self‑contained HTML Canvas playground with multiple scenes you can click between and tweak. No frameworks, no build step—just pure ES modules and buttery 60fps.

## What’s inside

- Zero dependencies: drop it anywhere and it runs.
- Multiple scenes: `Scene 1–4` switchable via the top bar.
- Tiny engine: `Engine`, `Scene`, `Layer`, and simple `Entities` (rects, circles, text, sprites).
- Smooth tweens: easing, yoyo, repeat, and a minimal `Timeline` for quick sequences.
- Pointer‑aware: basic pointer state for interactive scenes.
- Dark‑mode by default: moody canvas with neon‑friendly contrast.

## Quick start

Serve over HTTP so ES modules load. Then open the URL.

- Python 3: `python3 -m http.server 8000`
- Node (serve): `npx serve .`
- VS Code: Right‑click `index.html` → Open with Live Server

Visit: http://localhost:8000 and click through the scenes.

## Make your own scene

Use the tiny engine directly or drop a new file in `js/scenes/` and import it like the others.

```js
import { Engine, Scene, Rect, Tween, Easing } from './js/engine.js';

const engine = new Engine(document.getElementById('stage'), { background: '#0e0e12' });
const scene = new Scene();

const box = new Rect({ x: 200, y: 200, width: 120, height: 80, fill: '#5b8cff' });
scene.add(box);

scene.addTween(new Tween(box, { x: 600 }, 2, {
  easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity
}));

engine.setScene(scene);
engine.start();
```

## Link or embed in your site

- Link out: host this repo (GitHub Pages, Netlify, Vercel) and add a normal `<a>` from your site.
- Subpath friendly: uses relative paths, so it works under `/simulations/`.
- Inline embed: `<iframe src="https://your-domain/simulations/" width="100%" height="800"></iframe>`.

## Project structure

- `index.html` — entry page, scene switcher, module loader
- `css/styles.css` — minimal full‑viewport styling
- `js/engine.js` — tiny canvas engine (entities, tweens, timeline)
- `js/main.js` — demo wiring (you can swap this)
- `js/scenes/scene1.js…scene4.js` — showcase scenes

## Vibes checklist

- buttery motion
- neon‑ready color palette
- minimal API surface
- copy‑pasteable building blocks

If you build something rad with this, send it—always down to see more vibes.

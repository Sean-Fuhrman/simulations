import { Scene, Layer, Entity, Circle, TextEntity } from '../engine.js';

export async function createScene(engine) {
  // Artsy chic vibe: deep navy background; gradient backdrop entity overlays
  engine.background = '#0b0f18';

  const scene = new Scene();

  const layerBG = new Layer(-1);
  const layerBoxes = new Layer(0);
  const layerCircles = new Layer(1);
  const layerUI = new Layer(2);
  scene.add(layerBG, layerBoxes, layerCircles, layerUI);

  const W = () => engine.canvas.clientWidth;
  const H = () => engine.canvas.clientHeight;

  // Backdrop gradient entity
  class Backdrop extends Entity {
    drawSelf(ctx) {
      const w = W();
      const h = H();
      const g = ctx.createRadialGradient(w * 0.2, h * 0.15, 80, w * 0.5, h * 0.55, Math.max(w, h) * 0.9);
      g.addColorStop(0, '#1b2440');
      g.addColorStop(1, '#0b0f18');
      ctx.fillStyle = g;
      ctx.fillRect(-this.anchorX * w, -this.anchorY * h, w, h);
    }
  }
  const backdrop = new Backdrop({ x: 0, y: 0, anchorX: 0, anchorY: 0 });
  layerBG.add(backdrop);

  // Open-top box entity (draws only left, right, and bottom)
  class OpenBox extends Entity {
    constructor({ width, height, stroke = 'rgba(234,242,255,0.9)', lineWidth = 8, radius = 14, ...rest }) {
      super(rest);
      this.width = width; this.height = height;
      this.stroke = stroke; this.lineWidth = lineWidth; this.radius = radius;
    }
    drawSelf(ctx) {
      const w = this.width, h = this.height;
      const ax = this.anchorX * w, ay = this.anchorY * h;
      const x0 = -ax, y0 = -ay; // top-left
      const x1 = x0 + w, y1 = y0 + h; // bottom-right
      const r = Math.min(this.radius, w * 0.25, h * 0.25);
      ctx.lineWidth = this.lineWidth;
      ctx.strokeStyle = this.stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      // Left side (open near top corner rounding)
      ctx.moveTo(x0, y1);
      ctx.lineTo(x0, y0 + r);
      // Bottom with rounded corners
      ctx.arcTo(x0, y1, x0 + r, y1, r); // bottom-left corner (subtle, mostly a smooth join)
      ctx.lineTo(x1 - r, y1);
      ctx.arcTo(x1, y1, x1, y1 - r, r); // bottom-right
      // Right side up to near top
      ctx.lineTo(x1, y0 + r);
      // top remains open (no stroke across)
      ctx.stroke();
    }
  }

  // Layout: 4 boxes in a centered row, not full screen
  function layout() {
    const maxBoxW = Math.min(220, Math.floor(W() * 0.18));
    const boxW = Math.max(140, maxBoxW);
    const boxH = Math.max(140, Math.floor(H() * 0.32));
    const gap = Math.max(28, Math.floor(W() * 0.02));
    const totalW = boxW * 4 + gap * 3;
    const startX = Math.floor((W() - totalW) / 2) + boxW / 2;
    const y = Math.floor(H() * 0.6);
    const xs = [0,1,2,3].map(i => startX + i * (boxW + gap));
    return { boxW, boxH, y, xs };
  }

  const palette = ['#9cc0ff', '#bfffe1', '#ffd59e', '#f3a7c8'];
  const boxes = [];

  // Glow circle factory (override drawSelf for glow)
  function makeGlowCircle(color) {
    const c = new Circle({ radius: 3, fill: color, x: 0, y: 0 });
    c.drawSelf = function(ctx) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.fill;
      ctx.fillStyle = this.fill;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    };
    return c;
  }

  const layerCounts = new Layer(3);
  scene.add(layerCounts);

  function buildScene() {
    layerBoxes.entities = [];
    layerCircles.entities = [];
    layerUI.entities = [];
    layerCounts.entities = [];
    boxes.length = 0;

    const { boxW, boxH, y, xs } = layout();
    for (let i = 0; i < 4; i++) {
      const x = xs[i];
      const box = new OpenBox({ x, y, width: boxW, height: boxH, stroke: 'rgba(234,242,255,0.9)', lineWidth: 8, radius: 14 });
      layerBoxes.add(box);
      const countLabel = new TextEntity({ text: '', x, y: y + boxH / 2 + 24, font: '600 13px Inter, system-ui, sans-serif', color: 'rgba(234,242,255,0.75)' });
      layerUI.add(countLabel);
      boxes.push({ box, label: countLabel, circles: [], pad: 12, color: palette[i % palette.length] });
    }

    // Seed circles (100–400 per box)
    for (let i = 0; i < boxes.length; i++) {
      const group = boxes[i];
      const count = Math.floor(100 + Math.random() * 301);
      for (let j = 0; j < count; j++) {
        const c = makeGlowCircle(group.color);
        const p = randomPointInBox(group);
        c.x = p.x; c.y = p.y;
        // Arc move state: { sx,sy, cx,cy, tx,ty, t, dur }
        c._arc = null;
        c.update = function(dt) {
          if (!this._arc) return;
          this._arc.t += dt;
          const t = Math.min(1, this._arc.t / this._arc.dur);
          const u = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
          const mt = 1 - u;
          const { sx, sy, cx, cy, tx, ty } = this._arc;
          this.x = mt * mt * sx + 2 * mt * u * cx + u * u * tx;
          this.y = mt * mt * sy + 2 * mt * u * cy + u * u * ty;
          if (t >= 1) this._arc = null;
        };
        group.circles.push(c);
        layerCircles.add(c);
      }
    }
    updateLabels();
  }

  function updateLabels() {
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].label.text = `${boxes[i].circles.length}`;
    }
  }

  function randomPointInBox(group) {
    const { box } = group;
    const pad = group.pad;
    const x = box.x + (Math.random() * (box.width - pad * 2) - (box.width / 2 - pad));
    const y = box.y + (Math.random() * (box.height - pad * 2) - (box.height / 2 - pad));
    return { x, y };
  }

  function attemptMove() {
    const counts = boxes.map(b => b.circles.length);
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (const si of order) {
      if (counts[si] <= 0) continue;
      const sourceCount = counts[si];
      const targets = [];
      for (let ti = 0; ti < 4; ti++) {
        if (ti === si) continue;
        if (counts[ti] >= sourceCount) targets.push(ti);
      }
      if (targets.length === 0) continue;
      const ti = targets[Math.floor(Math.random() * targets.length)];

      const source = boxes[si];
      const target = boxes[ti];
      const idx = Math.floor(Math.random() * source.circles.length);
      const circle = source.circles[idx];
      source.circles.splice(idx, 1);
      counts[si] -= 1;

      // Choose landing point near top interior of target box
      const pad = target.pad;
      const tx = target.box.x + (Math.random() * (target.box.width - pad * 2) - (target.box.width / 2 - pad));
      const ty = target.box.y - target.box.height / 2 + pad + Math.random() * 40; // near top inside

      // Arc control point: above both box tops, mid-way x with an upward lift
      const sx = circle.x, sy = circle.y;
      const topY = Math.min(source.box.y - source.box.height / 2, target.box.y - target.box.height / 2);
      const midX = (sx + tx) / 2;
      const lift = Math.max(60, target.box.height * 0.9);
      const cx = midX + (Math.random() - 0.5) * 60; // slight horizontal flair
      const cy = topY - lift;

      circle._arc = { sx, sy, cx, cy, tx, ty, t: 0, dur: 0.8 + Math.random() * 0.5 };
      target.circles.push(circle);
      counts[ti] += 1;
      updateLabels();
      return true;
    }
    return false;
  }

  // Drive motion attempts
  let acc = 0;
  const interval = 0.1; // attempt every 0.1s
  const baseUpdate = scene.update.bind(scene);
  scene.update = (dt, eng) => {
    baseUpdate(dt, eng);
    acc += dt;
    while (acc >= interval) {
      acc -= interval;
      attemptMove();
    }
  };

  // Reset API
  scene.reset = () => {
    buildScene();
  };

  // Responsive reflow
  scene.onResize = () => {
    const { boxW, boxH, y, xs } = layout();
    for (let i = 0; i < boxes.length; i++) {
      const group = boxes[i];
      group.box.x = xs[i];
      group.box.y = y;
      group.box.width = boxW;
      group.box.height = boxH;
      group.label.x = xs[i];
      group.label.y = y + boxH / 2 + 24;
      // If any circle is outside top opening, nudge it toward inside
      for (const c of group.circles) {
        if (!c._arc) {
          // keep within bounds after resize
          const p = randomPointInBox(group);
          c._arc = { sx: c.x, sy: c.y, cx: (c.x + p.x) / 2, cy: Math.min(group.box.y - group.box.height / 2, c.y) - 60, tx: p.x, ty: p.y, t: 0, dur: 0.4 };
        }
      }
    }
  };

  buildScene();
  scene.onResize();
  return scene;
}


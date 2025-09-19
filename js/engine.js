// Minimal 2D animation framework for HTML Canvas
// No dependencies, ES modules, works locally and when embedded.

export class Engine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = options.background ?? '#000';
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.running = false;
    this.lastTime = 0;
    this.scene = null;

    this._onResize = this._resize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._resize();

    // Pointer support (basic)
    this.pointer = { x: 0, y: 0, down: false }; 
    canvas.addEventListener('pointermove', (e) => this._updatePointer(e));
    canvas.addEventListener('pointerdown', (e) => { this._updatePointer(e); this.pointer.down = true; });
    canvas.addEventListener('pointerup', (e) => { this._updatePointer(e); this.pointer.down = false; });
  }

  setScene(scene) {
    this.scene = scene;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.lastTime) / 1000); // clamp to 50ms
      this.lastTime = t;
      this._tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }

  _resize() {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    const dpr = this.dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Notify active scene about resize if supported
    if (this.scene && typeof this.scene.onResize === 'function') {
      try { this.scene.onResize(this); } catch (_) {}
    }
  }

  _clear() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  _updatePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    this.pointer.x = x;
    this.pointer.y = y;
  }

  _tick(dt) {
    this._clear();
    if (this.scene) {
      this.scene.update(dt, this);
      this.scene.draw(this.ctx);
    }
  }
}

export class Scene {
  constructor() {
    this.layers = [];
    this.tweens = new Set();
    this.timeline = new Timeline();
  }

  add(...items) {
    for (const it of items) {
      if (it instanceof Layer) {
        this.layers.push(it);
      } else {
        // If it's an entity, add to a default layer 0
        let layer0 = this.layers.find(l => l.zIndex === 0);
        if (!layer0) { layer0 = new Layer(0); this.layers.push(layer0); }
        layer0.add(it);
      }
    }
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
    return this;
  }

  addTween(t) { this.tweens.add(t); return t; }

  update(dt, engine) {
    // Update timeline (spawns tweens)
    this.timeline.update(dt, (tween) => this.addTween(tween));

    // Update tweens
    for (const t of [...this.tweens]) {
      if (t.update(dt)) this.tweens.delete(t);
    }

    // Update all layers/entities
    for (const layer of this.layers) {
      layer.update(dt, engine);
    }
  }

  draw(ctx) {
    for (const layer of this.layers) {
      layer.draw(ctx);
    }
  }
}

export class Layer {
  constructor(zIndex = 0) {
    this.zIndex = zIndex;
    this.entities = [];
  }
  add(...entities) { this.entities.push(...entities); return this; }
  update(dt, engine) { for (const e of this.entities) e.update?.(dt, engine); }
  draw(ctx) { for (const e of this.entities) if (e.visible !== false) e._draw(ctx); }
}

export class Entity {
  constructor({ x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1, opacity = 1, anchorX = 0.5, anchorY = 0.5, name = '' } = {}) {
    this.x = x; this.y = y;
    this.rotation = rotation;
    this.scaleX = scaleX; this.scaleY = scaleY;
    this.opacity = opacity;
    this.anchorX = anchorX; this.anchorY = anchorY;
    this.visible = true;
    this.name = name;
  }

  // Subclasses implement drawSelf(ctx)
  drawSelf(ctx) {}

  _draw(ctx) {
    ctx.save();
    ctx.globalAlpha *= this.opacity;
    ctx.translate(this.x, this.y);
    if (this.rotation) ctx.rotate(this.rotation);
    if (this.scaleX !== 1 || this.scaleY !== 1) ctx.scale(this.scaleX, this.scaleY);
    this.drawSelf(ctx);
    ctx.restore();
  }

  update(dt, engine) {}
}

export class Rect extends Entity {
  constructor({ width = 100, height = 100, fill = '#fff', stroke = null, lineWidth = 1, ...rest } = {}) {
    super(rest);
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.stroke = stroke;
    this.lineWidth = lineWidth;
  }
  drawSelf(ctx) {
    const ax = this.anchorX * this.width;
    const ay = this.anchorY * this.height;
    if (this.fill) { ctx.fillStyle = this.fill; ctx.fillRect(-ax, -ay, this.width, this.height); }
    if (this.stroke) { ctx.lineWidth = this.lineWidth; ctx.strokeStyle = this.stroke; ctx.strokeRect(-ax, -ay, this.width, this.height); }
  }
}

export class Circle extends Entity {
  constructor({ radius = 50, fill = '#fff', stroke = null, lineWidth = 1, ...rest } = {}) {
    super(rest);
    this.radius = radius;
    this.fill = fill;
    this.stroke = stroke;
    this.lineWidth = lineWidth;
  }
  drawSelf(ctx) {
    ctx.beginPath();
    ctx.arc((1 - this.anchorX * 2) * 0, (1 - this.anchorY * 2) * 0, this.radius, 0, Math.PI * 2);
    if (this.fill) { ctx.fillStyle = this.fill; ctx.fill(); }
    if (this.stroke) { ctx.lineWidth = this.lineWidth; ctx.strokeStyle = this.stroke; ctx.stroke(); }
  }
}

export class TextEntity extends Entity {
  constructor({ text = 'Hello', font = '600 28px Inter, system-ui, sans-serif', color = '#fff', align = 'center', baseline = 'middle', shadow = null, ...rest } = {}) {
    super(rest);
    this.text = text;
    this.font = font;
    this.color = color;
    this.align = align;
    this.baseline = baseline;
    this.shadow = shadow; // { blur, color, offsetX, offsetY }
  }
  drawSelf(ctx) {
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = this.baseline;
    if (this.shadow) {
      ctx.shadowBlur = this.shadow.blur ?? 0;
      ctx.shadowColor = this.shadow.color ?? 'rgba(0,0,0,0.5)';
      ctx.shadowOffsetX = this.shadow.offsetX ?? 0;
      ctx.shadowOffsetY = this.shadow.offsetY ?? 0;
    }
    ctx.fillText(this.text, 0, 0);
  }
}

export class Sprite extends Entity {
  constructor({ image, width = null, height = null, ...rest } = {}) {
    super(rest);
    this.image = image; // HTMLImageElement
    this.width = width || (image ? image.naturalWidth : 0);
    this.height = height || (image ? image.naturalHeight : 0);
  }
  drawSelf(ctx) {
    if (!this.image) return;
    const ax = this.anchorX * this.width;
    const ay = this.anchorY * this.height;
    ctx.drawImage(this.image, -ax, -ay, this.width, this.height);
  }
}

// Tweens & Easing
export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: t => (--t) * t * t + 1,
  easeOutBack: (t) => {
    const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export class Tween {
  constructor(target, to, duration = 1, { easing = Easing.linear, delay = 0, yoyo = false, repeat = 0, onStart = null, onUpdate = null, onComplete = null } = {}) {
    this.target = target; this.to = to; this.duration = Math.max(0.0001, duration);
    this.easing = easing; this.delay = delay; this.yoyo = yoyo; this.repeat = repeat;
    this.onStart = onStart; this.onUpdate = onUpdate; this.onComplete = onComplete;
    this.elapsed = 0; this.started = false; this.done = false; this._dir = 1; // 1 forward, -1 backward
    this.from = {};
    for (const k of Object.keys(to)) this.from[k] = target[k];
  }

  update(dt) {
    if (this.done) return true;
    if (this.delay > 0) { this.delay -= dt; return false; }
    if (!this.started) { this.started = true; this.onStart?.(this); }
    this.elapsed += dt * this._dir;
    let t = Math.min(1, Math.max(0, this.elapsed / this.duration));
    const e = this.easing(t);
    for (const k of Object.keys(this.to)) {
      const a = this.from[k]; const b = this.to[k];
      this.target[k] = a + (b - a) * e;
    }
    this.onUpdate?.(this);

    // completion handling
    if ((this._dir > 0 && t >= 1) || (this._dir < 0 && t <= 0)) {
      if (this.yoyo) {
        this._dir *= -1;
        if (this._dir > 0) {
          // completed a full yoyo cycle
          if (this.repeat > 0) this.repeat -= 1;
          if (this.repeat === 0) {
            this.done = true; this.onComplete?.(this); return true;
          }
        }
      } else if (this.repeat > 0) {
        this.elapsed = 0; this.repeat -= 1;
        for (const k of Object.keys(this.to)) this.from[k] = this.target[k];
      } else {
        this.done = true; this.onComplete?.(this); return true;
      }
    }
    return false;
  }
}

// A very small, forward-only timeline that plays tweens in sequence with offsets
export class Timeline {
  constructor() { this.tracks = []; this.time = 0; this.playing = true; }
  // add(tweenFactory, atTime)
  add(factory, at = 0) { this.tracks.push({ factory, at, spawned: false }); return this; }
  reset() { this.time = 0; for (const t of this.tracks) t.spawned = false; }
  play() { this.playing = true; }
  pause() { this.playing = false; }
  update(dt, spawn) {
    if (!this.playing) return;
    this.time += dt;
    for (const tr of this.tracks) {
      if (!tr.spawned && this.time >= tr.at) { spawn(tr.factory()); tr.spawned = true; }
    }
  }
}

// Utilities
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

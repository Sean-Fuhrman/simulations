import { Scene, Layer, Entity, Circle, TextEntity } from '../engine.js';

export async function createScene(engine) {
  // Atmosphere
  engine.background = '#0a0d14';

  const scene = new Scene();
  const layerBG = new Layer(-2);
  const layerCliff = new Layer(-1);
  const layerWater = new Layer(0);
  const layerMist = new Layer(1);
  const layerUI = new Layer(2);
  scene.add(layerBG, layerCliff, layerWater, layerMist, layerUI);

  const W = () => engine.canvas.clientWidth;
  const H = () => engine.canvas.clientHeight;

  // Backdrop gradient sky
  class Sky extends Entity {
    drawSelf(ctx) {
      const w = W(), h = H();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0f1422');
      g.addColorStop(1, '#09101c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  layerBG.add(new Sky({ x: 0, y: 0, anchorX: 0, anchorY: 0 }));

  // Cliff silhouette: left side polygon with subtle gradients
  class Cliff extends Entity {
    constructor(opts) { super(opts); this.edge = []; this.shade = null; }
    regenerate() {
      const w = W(), h = H();
      const top = Math.round(h * 0.10);
      const bottom = Math.round(h * 0.92);
      const baseX = Math.round(w * 0.32);
      const segments = 7;
      const jitter = Math.max(18, Math.floor(w * 0.02));
      this.edge = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = Math.round(top + t * (bottom - top));
        // sculpt a gentle undercut mid-way
        const bulge = Math.sin(t * Math.PI) * Math.max(26, w * 0.025);
        const x = baseX + (Math.random() - 0.5) * jitter - bulge * 0.35 + (t > 0.7 ? bulge * 0.5 : 0);
        this.edge.push({ x, y });
      }
    }
    drawSelf(ctx) {
      if (!this.edge.length) this.regenerate();
      const w = W(), h = H();
      const top = this.edge[0].y;
      ctx.save();
      // fill shape to the left of the edge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h);
      ctx.lineTo(this.edge[this.edge.length - 1].x, this.edge[this.edge.length - 1].y);
      for (let i = this.edge.length - 2; i >= 0; i--) {
        ctx.lineTo(this.edge[i].x, this.edge[i].y);
      }
      ctx.lineTo(this.edge[0].x, top);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, w * 0.4, 0);
      g.addColorStop(0, '#111827');
      g.addColorStop(1, '#0c1220');
      ctx.fillStyle = g;
      ctx.fill();

      // Edge highlight
      ctx.strokeStyle = 'rgba(160, 190, 255, 0.10)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < this.edge.length; i++) {
        const p = this.edge[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  const cliff = new Cliff();
  layerCliff.add(cliff);

  // Water particle with glow rendering
  class Water extends Circle {
    constructor(props) { super(props); this.vx = 0; this.vy = 0; this.life = 1; }
    drawSelf(ctx) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.fill;
      ctx.fillStyle = this.fill;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mist puff that fades and expands
  class Mist extends Entity {
    constructor({ x, y, color }) { super({ x, y, opacity: 0.6 }); this.r = 8; this.v = 40 + Math.random() * 60; this.decay = 0.8 + Math.random() * 0.5; this.color = color; }
    update(dt) {
      this.r += this.v * dt;
      this.opacity *= Math.pow(1 - dt * this.decay, 1);
      if (this.opacity < 0.02) this.visible = false;
    }
    drawSelf(ctx) {
      const grd = ctx.createRadialGradient(0,0,0,0,0,this.r);
      grd.addColorStop(0, this.color);
      grd.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Parameters
  const params = {
    gravity: 2200,     // px/s^2
    restitution: 0.67, // bounce energy retention
    friction: 0.86,    // tangential damping on bounce
    rate: 420,         // particles per second
    maxParticles: 5000,
    waterColor: '#7cc9ff',
  };

  let emitter = { x: 120, y: 0, spread: 26, speedX: 250, speedY: 120 };
  let groundY = 0;
  const particles = [];

  function spawnParticle() {
    if (particles.length >= params.maxParticles) return;
    const c = new Water({ radius: 2 + Math.random() * 1.6, fill: params.waterColor, x: emitter.x + (Math.random() - 0.5) * emitter.spread, y: emitter.y + (Math.random() - 0.5) * 8 });
    // Horizontal drift away from cliff a bit
    c.vx = 40 + Math.random() * emitter.speedX;
    c.vy = Math.random() * emitter.speedY;
    particles.push(c);
    layerWater.add(c);
  }

  let emitAcc = 0;
  const baseUpdate = scene.update.bind(scene);
  scene.update = (dt, eng) => {
    baseUpdate(dt, eng);

    // Emit
    emitAcc += dt * params.rate;
    while (emitAcc >= 1) { emitAcc -= 1; spawnParticle(); }

    // Integrate
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vy += params.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Bounce bottom
      const floor = groundY - p.radius;
      if (p.y > floor) {
        p.y = floor;
        p.vy *= -params.restitution;
        p.vx *= params.friction;
      }

      // Cull offscreen to the right or too old below
      if (p.x > W() + 40 || p.y > H() + 40) {
        p.visible = false;
      }
    }

    // Remove invisible mist and particles occasionally
    if (Math.random() < 0.2) {
      layerMist.entities = layerMist.entities.filter(e => e.visible !== false);
      const alive = [];
      for (const p of particles) if (p.visible !== false) alive.push(p);
      if (alive.length !== particles.length) {
        layerWater.entities = alive;
        particles.length = 0; particles.push(...alive);
      }
    }
  };

  function rebuildLayout() {
    // Rebuild cliff shape and emitter position near its edge top
    cliff.regenerate();
    const edgeTop = cliff.edge[0];
    emitter.x = Math.max(80, edgeTop.x + 6);
    emitter.y = Math.max(40, edgeTop.y + 8);
    groundY = Math.round(H() * 0.9);

    // Title
    layerUI.entities = [];
    const title = new TextEntity({ text: 'Cliffside Falls', x: W() * 0.72, y: H() * 0.18, font: '700 40px Inter, system-ui, sans-serif', color: '#d6e6ff' });
    const subtitle = new TextEntity({ text: 'Scene 4', x: W() * 0.72, y: H() * 0.18 + 30, font: '600 16px Inter, system-ui, sans-serif', color: 'rgba(214,230,255,0.6)' });
    layerUI.add(title, subtitle);
  }

  scene.reset = () => {
    // Clear particles and mist
    particles.length = 0;
    layerWater.entities = [];
    layerMist.entities = [];
  };

  scene.onResize = () => {
    rebuildLayout();
  };

  rebuildLayout();
  return scene;
}


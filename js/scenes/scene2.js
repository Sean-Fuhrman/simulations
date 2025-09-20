import { Scene, Circle, TextEntity, Tween, Easing } from '../engine.js';

export async function createScene(engine) {
  // Unified theme background
  engine.background = '#0e0e12';

  const scene = new Scene();
  const W = () => engine.canvas.clientWidth;
  const H = () => engine.canvas.clientHeight;

  const title = new TextEntity({
    text: 'Scene 2',
    x: W() / 2, y: 80,
    font: '700 42px Inter, system-ui, sans-serif',
    color: '#c7e1ff',
  });
  const subtitle = new TextEntity({
    text: 'Orbiting particles (pointer reactive)',
    x: W() / 2, y: 120,
    font: '500 18px Inter, system-ui, sans-serif',
    color: '#8fb3e1',
  });

  const center = { x: W() / 2, y: H() / 2 + 20 };
  const particles = [];
  const count = 12;
  const baseRadius = Math.min(W(), H()) * 0.22;

  for (let i = 0; i < count; i++) {
    const ang0 = (i / count) * Math.PI * 2;
    const c = new Circle({ radius: 10, x: center.x, y: center.y, fill: `hsl(${(i / count) * 360}, 80%, 60%)` });
    c._angle = ang0;
    c._r = baseRadius * (0.8 + Math.random() * 0.4);
    c._speed = 0.8 + Math.random() * 0.8; // rotations per 10s-ish
    c.update = function(dt, eng) {
      // Light pointer repulsion
      const px = eng.pointer.x, py = eng.pointer.y;
      const dx = px - center.x, dy = py - center.y;
      const dist = Math.hypot(dx, dy) || 1;
      const repel = Math.max(0, 1 - Math.min(dist / (baseRadius * 1.2), 1)) * 24;
      this._angle += dt * this._speed * 0.9;
      const r = this._r + repel;
      this.x = center.x + Math.cos(this._angle) * r;
      this.y = center.y + Math.sin(this._angle) * r;
    };
    particles.push(c);
  }

  // Center pulse using a tween on a dummy object controlling particle size
  const pulse = { s: 1 };
  scene.addTween(new Tween(pulse, { s: 1.4 }, 1.2, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));
  for (const p of particles) {
    const base = p.radius;
    p.updateSize = () => { p.radius = base * pulse.s; };
  }
  // Hook into scene update to apply pulse scale to particles
  const origUpdate = scene.update.bind(scene);
  scene.update = (dt, eng) => {
    origUpdate(dt, eng);
    for (const p of particles) p.updateSize?.();
  };

  scene.add(title, subtitle, ...particles);

  scene.onResize = () => {
    title.x = W() / 2;
    subtitle.x = W() / 2;
    center.x = W() / 2; center.y = H() / 2 + 20;
    const newBase = Math.min(W(), H()) * 0.22;
    for (const p of particles) p._r = newBase * (0.8 + Math.random() * 0.4);
  };
  scene.onResize();

  return scene;
}

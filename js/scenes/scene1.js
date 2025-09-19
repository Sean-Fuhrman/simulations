import { Scene, Rect, Circle, TextEntity, Sprite, Tween, Easing, loadImage } from '../engine.js';

export async function createScene(engine) {
  // Optional: set a background for this scene
  engine.background = '#0e0e12';

  const scene = new Scene();
  const W = () => engine.canvas.clientWidth;
  const H = () => engine.canvas.clientHeight;

  const title = new TextEntity({
    text: 'Scene 1',
    x: W() / 2, y: H() / 2 - 40,
    font: '700 48px Inter, system-ui, sans-serif',
    color: '#ffffff',
    shadow: { blur: 24, color: 'rgba(0,0,0,0.5)' },
  });

  const subtitle = new TextEntity({
    text: 'Floating shapes with tweens',
    x: W() / 2, y: H() / 2 + 10,
    font: '500 20px Inter, system-ui, sans-serif',
    color: '#a7b0c0',
  });

  const rect = new Rect({ width: 160, height: 100, x: W() / 2 - 220, y: H() / 2 + 120, fill: '#5b8cff', opacity: 0.9, rotation: 0.05 });
  const circle = new Circle({ radius: 62, x: W() / 2 + 220, y: H() / 2 + 120, fill: '#6ee7b7', opacity: 0.9 });

  // Optional sprite if assets/logo.png exists
  try {
    const img = await loadImage('./assets/logo.png');
    const sprite = new Sprite({ image: img, x: W() / 2, y: H() / 2 - 140, scaleX: 0.5, scaleY: 0.5 });
    scene.add(sprite);
    scene.addTween(new Tween(sprite, { rotation: 0.2 }, 2.4, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));
  } catch (_) {}

  scene.add(title, subtitle, rect, circle);

  // Tweens
  scene.addTween(new Tween(rect, { y: rect.y - 18 }, 1.6, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));
  scene.addTween(new Tween(circle, { y: circle.y - 14 }, 1.2, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));

  // Intro
  title.opacity = 0; title.y += 20;
  subtitle.opacity = 0; subtitle.y += 28;
  scene.timeline
    .add(() => new Tween(title, { opacity: 1, y: title.y - 20 }, 0.7, { easing: Easing.easeOutCubic }), 0.0)
    .add(() => new Tween(subtitle, { opacity: 1, y: subtitle.y - 28 }, 0.9, { easing: Easing.easeOutCubic }), 0.2);

  // Responsive positioning when canvas resizes
  scene.onResize = () => {
    title.x = subtitle.x = W() / 2;
    title.y = H() / 2 - 40;
    subtitle.y = H() / 2 + 10;
    rect.x = W() / 2 - 220; rect.y = H() / 2 + 120;
    circle.x = W() / 2 + 220; circle.y = H() / 2 + 120;
  };

  // Initial layout
  scene.onResize();

  return scene;
}


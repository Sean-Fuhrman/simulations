// Demo scene setup. Replace with your own as needed.
export async function setupDemo({ engine, scene, loadImage, Rect, Circle, TextEntity, Sprite, Tween, Easing, Timeline }) {
  const W = () => engine.canvas.clientWidth;
  const H = () => engine.canvas.clientHeight;

  // Hero title
  const title = new TextEntity({
    text: '2D Animations',
    x: W() / 2, y: H() / 2 - 40,
    font: '700 48px Inter, system-ui, sans-serif',
    color: '#ffffff',
    shadow: { blur: 24, color: 'rgba(0,0,0,0.5)' },
  });

  // Subtitle
  const subtitle = new TextEntity({
    text: 'Minimal Canvas Framework',
    x: W() / 2, y: H() / 2 + 10,
    font: '500 20px Inter, system-ui, sans-serif',
    color: '#a7b0c0',
  });

  // Floating rectangle and circle
  const rect = new Rect({ width: 160, height: 100, x: W() / 2 - 220, y: H() / 2 + 120, fill: '#5b8cff', opacity: 0.9, rotation: 0.05 });
  const circle = new Circle({ radius: 62, x: W() / 2 + 220, y: H() / 2 + 120, fill: '#6ee7b7', opacity: 0.9 });

  // Optional: load an image if you place one in /assets/logo.png
  let sprite = null;
  try {
    const img = await loadImage('./assets/logo.png');
    sprite = new Sprite({ image: img, x: W() / 2, y: H() / 2 - 140, scaleX: 0.5, scaleY: 0.5, anchorX: 0.5, anchorY: 0.5 });
  } catch (_) {
    // No image found, ignore silently.
  }

  // Add to scene
  scene.add(title, subtitle, rect, circle);
  if (sprite) scene.add(sprite);

  // Bobbing animations with tweens
  scene.addTween(new Tween(rect, { y: rect.y - 18 }, 1.6, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));
  scene.addTween(new Tween(circle, { y: circle.y - 14 }, 1.2, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));
  if (sprite) scene.addTween(new Tween(sprite, { rotation: 0.2 }, 2.4, { easing: Easing.easeInOutQuad, yoyo: true, repeat: Infinity }));

  // Title intro via a small timeline
  title.opacity = 0; title.y += 20;
  subtitle.opacity = 0; subtitle.y += 28;
  scene.timeline
    .add(() => new Tween(title, { opacity: 1, y: title.y - 20 }, 0.7, { easing: Easing.easeOutCubic }), 0.0)
    .add(() => new Tween(subtitle, { opacity: 1, y: subtitle.y - 28 }, 0.9, { easing: Easing.easeOutCubic }), 0.2);

  // Keep layout responsive on resize
  const onResize = () => {
    title.x = subtitle.x = W() / 2;
    title.y = H() / 2 - 40;
    subtitle.y = H() / 2 + 10;
    rect.x = W() / 2 - 220; rect.y = H() / 2 + 120;
    circle.x = W() / 2 + 220; circle.y = H() / 2 + 120;
    if (sprite) { sprite.x = W() / 2; sprite.y = H() / 2 - 140; }
  };
  window.addEventListener('resize', onResize);
}


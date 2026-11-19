/* Фон главной: лента из волн, реагирующая на курсор и клик.
   При прокрутке страницы вниз волна уезжает вверх и не повторяется.
   Порт компонента AetherRibbonMesh на чистый JS, палитра под тёмный сайт. */
(function () {
  const canvas = document.querySelector('.bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = '#0a0a0b', SCROLL_SPEED = 1;

  let width = 0, height = 0, raf = 0, scroll = 0;
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const particles = [];
  const ripple = { x: 0, y: 0, radius: 0, maxRadius: 400, speed: 14 };

  class Particle {
    constructor(x, y) {
      this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 2; this.vy = (Math.random() - 0.5) * 2;
      this.maxLife = 80 + Math.random() * 60; this.life = this.maxLife; this.size = 1 + Math.random() * 2;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 1; this.vx *= 0.98; this.vy *= 0.98; }
    draw() {
      if (this.life <= 0) return;
      ctx.globalAlpha = this.life / this.maxLife; ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const point = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;
  const onMove = (e) => { const p = point(e); mouse.targetX = p.clientX - width / 2; mouse.targetY = p.clientY - height / 2; };
  const onLeave = () => { mouse.targetX = 0; mouse.targetY = 0; };
  const onDown = (e) => {
    const p = point(e); ripple.x = p.clientX; ripple.y = p.clientY; ripple.radius = 0;
    for (let i = 0; i < 30; i++) particles.push(new Particle(p.clientX, p.clientY));
  };

  const noise = (x, t, o) => (Math.sin(x * 0.0012 + t * 0.25 + o) + Math.cos(x * 0.0028 - t * 0.4 + o * 2)) / 2;
  let last = performance.now(), time = 0;

  const layers = [
    { count: 16, step: 4, offsetMod: 0, freq: 0.0035, amp: 55, speed: 1.1, primary: true },
    { count: 10, step: 6, offsetMod: 1.2, freq: 0.0075, amp: 30, speed: 0.7, primary: false },
  ];

  const drawBlock = (shift) => {
    layers.forEach((L) => {
      ctx.globalCompositeOperation = L.primary ? 'source-over' : 'lighter';
      const g = ctx.createLinearGradient(0, 0, width, 0);
      g.addColorStop(0, 'rgba(56, 189, 248, ' + (L.primary ? 0.1 : 0.02) + ')');
      g.addColorStop(0.5, 'rgba(96, 165, 250, ' + (L.primary ? 0.8 : 0.3) + ')');
      g.addColorStop(1, 'rgba(168, 85, 247, ' + (L.primary ? 0.1 : 0.02) + ')');
      for (let r = 0; r < L.count; r++) {
        const prog = r / L.count;
        const yOffset = height * 0.22 + r * (height * 0.032) + L.offsetMod * 35 + shift;
        if (yOffset < -150 || yOffset > height + 150) continue;
        const baseAlpha = (1 - prog * 0.75) * 0.55;
        const rd = ripple.radius < ripple.maxRadius
          ? Math.sin((time * 2 + prog * Math.PI) * 2) * ((ripple.maxRadius / Math.max(ripple.radius, 1)) * 2.5) : 0;
        ctx.beginPath();
        for (let x = 0; x <= width + L.step; x += L.step) {
          const env = Math.sin((x / width) * Math.PI);
          const nF = 1 + noise(x, time, prog) * 0.18, nA = 1 + noise(x * 2, -time, prog * 0.5) * 0.15;
          const w1 = Math.sin(x * (L.freq * nF) + time * L.speed + r * 0.18) * (L.amp * env * nA);
          const w2 = Math.cos(x * 0.008 - time * 0.7 + r * 0.1) * (20 * env);
          const w3 = Math.sin(x * 0.018 + time * 1.4) * (8 * env);
          const dX = Math.abs(x - (width / 2 + mouse.x));
          const mF = Math.exp(-Math.pow(dX / (L.primary ? 380 : 220), 2));
          const mD = Math.sin(x * 0.015 + time * 2.6) * (mF * (L.primary ? 50 : 25) * env);
          const rF = Math.exp(-Math.pow(Math.abs(dX - ripple.radius) / (25 + rd), 2));
          const y = yOffset + w1 + w2 + w3 + mD + rF * rd * (1.8 - prog) + mouse.y * (prog * 0.1);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          if (L.primary && x % 48 === 0) { ctx.fillStyle = 'rgba(168, 85, 247, 0.3)'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        ctx.globalAlpha = baseAlpha; ctx.strokeStyle = g;
        ctx.lineWidth = (L.primary ? 1.4 : 0.8) + (1 - prog) * 0.5;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  const render = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    time += dt * 0.85;
    const lerp = 1 - Math.exp(-9 * dt);
    mouse.x += (mouse.targetX - mouse.x) * lerp; mouse.y += (mouse.targetY - mouse.y) * lerp;
    // прокрутка страницы с лёгкой инерцией: волна уезжает вверх
    scroll += (window.scrollY - scroll) * (1 - Math.exp(-6 * dt));

    ctx.fillStyle = BG; ctx.fillRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.update(); p.draw(); if (p.life <= 0) particles.splice(i, 1); }
    if (ripple.radius < ripple.maxRadius) ripple.radius += ripple.speed;

    // волна один раз уезжает вверх вместе с прокруткой, без повтора
    drawBlock(-scroll * SCROLL_SPEED);
    if (!reduce) raf = requestAnimationFrame(render);
  };

  resize();
  window.addEventListener('resize', () => { resize(); if (reduce) render(performance.now()); });
  if (reduce) window.addEventListener('scroll', () => { scroll = window.scrollY; render(performance.now()); }, { passive: true });
  else {
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(render); }
    });
  }
  raf = requestAnimationFrame(render);
})();

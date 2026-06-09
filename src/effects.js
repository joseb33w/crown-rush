import { TAU } from './math.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.floats = []; // floating text / icons
    this.shake = 0;
    this.shakeMax = 0;
    this.flashT = 0; // full-screen flash (tower fall)
    this.flashColor = '#ffffff';
  }

  reset() {
    this.particles.length = 0;
    this.floats.length = 0;
    this.shake = 0;
    this.flashT = 0;
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
    this.shakeMax = Math.max(this.shakeMax, this.shake);
  }

  fullFlash(color, t = 0.18) {
    this.flashColor = color;
    this.flashT = Math.max(this.flashT, t);
  }

  spawn(x, y, opts) {
    this.particles.push({
      x, y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      life: opts.life,
      max: opts.life,
      size: opts.size || 3,
      color: opts.color || '#fff',
      grav: opts.grav || 0,
      drag: opts.drag ?? 0.9,
      shape: opts.shape || 'square',
      shrink: opts.shrink ?? true,
    });
  }

  poof(x, y, color = '#ffffff', n = 9, power = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = power * (0.4 + Math.random() * 0.8);
      this.spawn(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 18,
        life: 0.35 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color, grav: 120, drag: 0.86,
      });
    }
  }

  blood(x, y, color, n = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = 30 + Math.random() * 50;
      this.spawn(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.18 + Math.random() * 0.18,
        size: 1.5 + Math.random() * 2,
        color, drag: 0.8,
      });
    }
  }

  explode(x, y, color = '#ffae3a', n = 34) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = 70 + Math.random() * 150;
      this.spawn(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.45 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: Math.random() < 0.4 ? '#fff2c0' : Math.random() < 0.6 ? color : '#ff5a2a',
        grav: 160, drag: 0.9,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.spawn(x, y, {
        vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 60,
        life: 0.6 + Math.random() * 0.5, size: 4 + Math.random() * 5,
        color: '#555', grav: -20, drag: 0.95,
      });
    }
  }

  ring(x, y, color = '#fff', life = 0.4, maxR = 60) {
    this.particles.push({
      x, y, vx: 0, vy: 0, life, max: life, size: maxR,
      color, grav: 0, drag: 1, shape: 'ring', shrink: false,
    });
  }

  floatText(x, y, text, color = '#fff', size = 14) {
    this.floats.push({ x, y, vy: -34, life: 0.9, max: 0.9, text, color, size });
  }

  crownPop(x, y) {
    this.floats.push({ x, y, vy: -28, life: 1.1, max: 1.1, text: '\u2606', color: '#ffd24a', size: 22, glow: true });
  }

  update(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      if (p.shape === 'ring') continue;
      p.vy += p.grav * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    const fs = this.floats;
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i];
      f.life -= dt;
      if (f.life <= 0) { fs.splice(i, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= 0.94;
    }
    if (this.shake > 0) {
      this.shake -= dt * (this.shakeMax * 2 + 6);
      if (this.shake < 0) this.shake = 0;
    }
    if (this.flashT > 0) this.flashT -= dt;
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const t = p.life / p.max;
      if (p.shape === 'ring') {
        const r = p.size * (1 - t);
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      const s = p.shrink ? p.size * (0.3 + t * 0.7) : p.size;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  drawFloats(ctx) {
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      const t = f.life / f.max;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.font = `bold ${f.size}px ui-sans-serif, system-ui, sans-serif`;
      if (f.glow) { ctx.shadowColor = f.color; ctx.shadowBlur = 12; }
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawFlash(ctx, w, h) {
    if (this.flashT > 0) {
      ctx.globalAlpha = Math.min(0.55, this.flashT * 2.2);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  shakeOffset() {
    if (this.shake <= 0) return [0, 0];
    const m = this.shake;
    return [(Math.random() - 0.5) * m, (Math.random() - 0.5) * m];
  }
}

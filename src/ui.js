import {
  ARENA_H, VIEW_W, VIEW_H, TRAY_H, CARDS, ELIXIR_MAX, TEAM,
} from './config.js';
import { drawSprite, SPRITES } from './sprites.js';

const TRAY_TOP = ARENA_H;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCrownIcon(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  const w = s, h = s * 0.7;
  const x = cx - w / 2, y = cy - h / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.35);
  ctx.lineTo(x + w * 0.2, y + h * 0.62);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.8, y + h * 0.62);
  ctx.lineTo(x + w, y + h * 0.35);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#00000033';
  ctx.fillRect(x, y + h - 2, w, 2);
}

export class UI {
  constructor(game) {
    this.game = game;
    this.cardRects = [];
    this.layout();
  }

  layout() {
    this.cardRects = [];
    const n = 4;
    const cw = 74, ch = 118, gap = 8;
    const total = n * cw + (n - 1) * gap;
    const startX = (VIEW_W - total) / 2;
    const y = TRAY_TOP + 46;
    for (let i = 0; i < n; i++) {
      this.cardRects.push({ x: startX + i * (cw + gap), y, w: cw, h: ch, i });
    }
    this.nextRect = { x: 8, y: TRAY_TOP + 10, w: 34, h: 30 };
    this.elixir = { x: 50, y: TRAY_TOP + 14, w: VIEW_W - 62, h: 16 };
  }

  hitTestCard(px, py) {
    for (const r of this.cardRects) {
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.i;
    }
    return -1;
  }

  inTray(py) { return py >= TRAY_TOP; }

  // ---------------------------------------------------------------- draw ---
  draw(ctx, time) {
    this.drawTopBar(ctx);
    this.drawTray(ctx, time);
    if (this.game.state === 'title') this.drawTitle(ctx, time);
    else if (this.game.state === 'over') this.drawOver(ctx, time);
    if (this.game.toast && this.game.toastT > 0) this.drawToast(ctx);
    if (this.game.state === 'play' && this.game.startCountT > 0) this.drawCountdown(ctx);
  }

  drawTopBar(ctx) {
    const g = this.game;
    // timer pill
    const t = Math.max(0, Math.ceil(g.timeLeft));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    const label = `${mm}:${ss}`;
    ctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pillW = 70, pillH = 26, px = VIEW_W / 2 - pillW / 2, py = 8;
    ctx.fillStyle = g.timeLeft < 60 ? '#5a1730dd' : '#1c1430dd';
    roundRect(ctx, px, py, pillW, pillH, 8); ctx.fill();
    ctx.strokeStyle = g.timeLeft < 60 ? '#ff5a7a' : '#7a6bb0'; ctx.lineWidth = 1.5;
    roundRect(ctx, px, py, pillW, pillH, 8); ctx.stroke();
    ctx.fillStyle = g.timeLeft < 60 ? '#ffd0dc' : '#fff';
    ctx.fillText(label, VIEW_W / 2, py + pillH / 2 + 1);

    // crowns: player (left), enemy (right)
    this.drawCrownGroup(ctx, 14, 21, g.crowns.player, TEAM.player.ring, 'left');
    this.drawCrownGroup(ctx, VIEW_W - 14, 21, g.crowns.enemy, TEAM.enemy.ring, 'right');
  }

  drawCrownGroup(ctx, x, y, count, color, align) {
    const dir = align === 'left' ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const cx = x + dir * (i * 18 + 9);
      const lit = i < count;
      drawCrownIcon(ctx, cx, y, 16, lit ? color : '#ffffff20');
    }
  }

  drawTray(ctx, time) {
    const g = this.game;
    // panel
    ctx.fillStyle = '#241a33';
    ctx.fillRect(0, TRAY_TOP, VIEW_W, TRAY_H);
    ctx.fillStyle = '#170f24';
    ctx.fillRect(0, TRAY_TOP, VIEW_W, 4);
    ctx.fillStyle = '#34264d';
    ctx.fillRect(0, TRAY_TOP + 4, VIEW_W, 2);

    // elixir bar
    const e = this.elixir;
    const frac = g.elixir.player / ELIXIR_MAX;
    ctx.fillStyle = '#120a1e';
    roundRect(ctx, e.x, e.y, e.w, e.h, 7); ctx.fill();
    const full = g.elixir.player >= ELIXIR_MAX - 0.001;
    const glow = 0.5 + 0.5 * Math.sin(time * 6);
    if (full) { ctx.shadowColor = '#ff58d8'; ctx.shadowBlur = 10 * glow + 4; }
    ctx.fillStyle = g.doubleElixir ? '#ff77e0' : '#e24ad0';
    roundRect(ctx, e.x + 1, e.y + 1, (e.w - 2) * frac, e.h - 2, 6); ctx.fill();
    ctx.shadowBlur = 0;
    // segment ticks
    ctx.strokeStyle = '#00000055'; ctx.lineWidth = 1;
    for (let i = 1; i < ELIXIR_MAX; i++) {
      const sx = e.x + (e.w * i) / ELIXIR_MAX;
      ctx.beginPath(); ctx.moveTo(sx, e.y + 1); ctx.lineTo(sx, e.y + e.h - 1); ctx.stroke();
    }
    ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.floor(g.elixir.player)}`, e.x + e.w - 4, e.y + e.h / 2);
    if (g.doubleElixir) {
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffb0f0';
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('x2', e.x + 3, e.y + e.h / 2);
    }

    // next card thumbnail
    this.drawNextCard(ctx);

    // hand cards
    for (const r of this.cardRects) {
      const id = g.hands.player[r.i];
      this.drawCard(ctx, r, id, time);
    }
  }

  drawNextCard(ctx) {
    const g = this.game;
    const id = g.queue.player[0];
    if (!id) return;
    const r = this.nextRect;
    ctx.fillStyle = '#1a1228';
    roundRect(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill();
    ctx.strokeStyle = '#473563'; ctx.lineWidth = 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 4); ctx.stroke();
    this.drawCardIcon(ctx, id, r.x + r.w / 2, r.y + r.h / 2 + 1, 0.7);
    ctx.font = 'bold 6px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#9b86c0';
    ctx.fillText('NEXT', r.x + r.w / 2, r.y - 8);
  }

  drawCard(ctx, r, id, time) {
    const g = this.game;
    const c = CARDS[id];
    const affordable = g.elixir.player >= c.cost;
    const selected = g.selectedSlot === r.i;
    const lift = selected ? 6 : 0;
    const y = r.y - lift;

    // body
    ctx.save();
    if (affordable) {
      const glow = 0.5 + 0.5 * Math.sin(time * 5 + r.i);
      ctx.shadowColor = c.accent;
      ctx.shadowBlur = (selected ? 16 : 8) + glow * 4;
    }
    ctx.fillStyle = selected ? '#3a2b54' : '#2c2040';
    roundRect(ctx, r.x, y, r.w, r.h, 8); ctx.fill();
    ctx.restore();

    // header band tinted to card
    ctx.fillStyle = affordable ? c.accent + '' : '#5a5168';
    ctx.globalAlpha = affordable ? 0.28 : 0.15;
    roundRect(ctx, r.x, y, r.w, r.h, 8); ctx.fill();
    ctx.globalAlpha = 1;

    // border
    ctx.strokeStyle = selected ? '#ffe27a' : affordable ? c.accent : '#5a5168';
    ctx.lineWidth = selected ? 3 : 1.5;
    roundRect(ctx, r.x, y, r.w, r.h, 8); ctx.stroke();

    // icon
    this.drawCardIcon(ctx, id, r.x + r.w / 2, y + r.h * 0.42, 1.6);

    // name
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = affordable ? '#fff' : '#9a90ab';
    ctx.fillText(c.name, r.x + r.w / 2, y + r.h - 28);

    // cost gem
    const gx = r.x + r.w / 2, gy = y + r.h - 12;
    ctx.fillStyle = affordable ? '#e24ad0' : '#7a3a72';
    ctx.beginPath(); ctx.arc(gx, gy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00000055'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(String(c.cost), gx, gy + 1);

    if (!affordable) {
      ctx.fillStyle = '#0c0712aa';
      roundRect(ctx, r.x, y, r.w, r.h, 8); ctx.fill();
    }
  }

  drawCardIcon(ctx, id, cx, cy, scale) {
    if (id === 'spell') {
      // fireball glyph
      ctx.fillStyle = '#ff5a1e';
      ctx.beginPath(); ctx.arc(cx, cy, 11 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb13a';
      ctx.beginPath(); ctx.arc(cx, cy, 7 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath(); ctx.arc(cx - 2 * scale, cy - 2 * scale, 3.4 * scale, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const sprite = SPRITES[CARDS[id].unit.type] || SPRITES.swarm;
    drawSprite(ctx, sprite, cx, cy, 2.4 * scale, TEAM.player, {});
    if (CARDS[id].count > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(8 * scale)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('x' + CARDS[id].count, cx + 14 * scale, cy + 14 * scale);
    }
  }

  drawToast(ctx) {
    const g = this.game;
    const a = Math.min(1, g.toastT * 2);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
    const y = ARENA_H * 0.4;
    ctx.fillStyle = '#000';
    ctx.fillText(g.toast, VIEW_W / 2 + 2, y + 2);
    ctx.fillStyle = g.toastColor || '#ffd24a';
    ctx.fillText(g.toast, VIEW_W / 2, y);
    ctx.globalAlpha = 1;
  }

  drawCountdown(ctx) {
    const g = this.game;
    const n = Math.ceil(g.startCountT);
    const label = n > 0 ? String(n) : 'GO!';
    const frac = g.startCountT - Math.floor(g.startCountT);
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * frac;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${48 + (1 - frac) * 24}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText(label, VIEW_W / 2 + 2, ARENA_H / 2 + 2);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(label, VIEW_W / 2, ARENA_H / 2);
    ctx.restore();
  }

  // ---- title / over overlays ----
  panelBg(ctx, alpha = 0.72) {
    ctx.fillStyle = `rgba(8,5,14,${alpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawTitle(ctx, time) {
    this.panelBg(ctx, 0.78);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cx = VIEW_W / 2;
    drawCrownIcon(ctx, cx, VIEW_H * 0.26, 56 + Math.sin(time * 2) * 3, '#ffd24a');
    ctx.font = 'bold 40px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#000'; ctx.fillText('CROWN', cx + 2, VIEW_H * 0.36 + 2);
    ctx.fillStyle = '#ffd24a'; ctx.fillText('CROWN', cx, VIEW_H * 0.36);
    ctx.fillStyle = '#000'; ctx.fillText('RUSH', cx + 2, VIEW_H * 0.44 + 2);
    ctx.fillStyle = '#ff5fae'; ctx.fillText('RUSH', cx, VIEW_H * 0.44);
    ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#cbbce6';
    ctx.fillText('Real-time lane battler', cx, VIEW_H * 0.52);

    const rec = this.game.record;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#8d7fb0';
    ctx.fillText(`Wins ${rec.wins}   \u00b7   Losses ${rec.losses}`, cx, VIEW_H * 0.58);

    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('TAP TO BATTLE', cx, VIEW_H * 0.72);
    ctx.globalAlpha = 1;

    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#6f6390';
    ctx.fillText('Tap a card, then tap your half to deploy.', cx, VIEW_H * 0.8);
    ctx.fillText('Take the king tower or lead on crowns at 0:00.', cx, VIEW_H * 0.83);
  }

  drawOver(ctx, time) {
    const g = this.game;
    this.panelBg(ctx, 0.74);
    const cx = VIEW_W / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let title, color;
    if (g.winner === 'player') { title = 'VICTORY!'; color = '#ffd24a'; }
    else if (g.winner === 'enemy') { title = 'DEFEAT'; color = '#ff5a5a'; }
    else { title = 'DRAW'; color = '#cbbce6'; }

    const pop = g.overT < 0.5 ? g.overT / 0.5 : 1;
    ctx.save();
    ctx.translate(cx, VIEW_H * 0.34);
    ctx.scale(0.6 + pop * 0.5, 0.6 + pop * 0.5);
    ctx.font = 'bold 44px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#000'; ctx.fillText(title, 2, 2);
    ctx.fillStyle = color; ctx.fillText(title, 0, 0);
    ctx.restore();

    // crowns summary
    drawCrownIcon(ctx, cx - 40, VIEW_H * 0.46, 26, TEAM.player.ring);
    drawCrownIcon(ctx, cx + 40, VIEW_H * 0.46, 26, TEAM.enemy.ring);
    ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(g.crowns.player), cx - 40, VIEW_H * 0.51);
    ctx.fillText(String(g.crowns.enemy), cx + 40, VIEW_H * 0.51);
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#9b8fbb';
    ctx.fillText('YOU', cx - 40, VIEW_H * 0.55);
    ctx.fillText('ENEMY', cx + 40, VIEW_H * 0.55);

    const rec = g.record;
    ctx.fillStyle = '#8d7fb0';
    ctx.fillText(`Wins ${rec.wins}  \u00b7  Losses ${rec.losses}`, cx, VIEW_H * 0.62);

    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('TAP TO PLAY AGAIN', cx, VIEW_H * 0.74);
    ctx.globalAlpha = 1;
  }
}

import {
  ARENA_W, ARENA_H, VIEW_W, VIEW_H, RIVER_TOP, RIVER_BOT, RIVER_MID,
  LANE_X, BRIDGE_W, DEPLOY, TOWERS, TOWER_DEF, CARDS, DECK,
  ELIXIR_MAX, ELIXIR_START, ELIXIR_PERIOD, MATCH_TIME, OVERTIME,
  DOUBLE_ELIXIR_AT, TEAM,
} from './config.js';
import { clamp, makeRng, shuffle } from './math.js';
import { Unit, Tower, Projectile } from './entities.js';
import { Effects } from './effects.js';
import { AI } from './ai.js';
import { UI } from './ui.js';
import { sfx } from './audio.js';

const REC_KEY = 'crownrush.record.v1';

function loadRecord() {
  try {
    const r = JSON.parse(localStorage.getItem(REC_KEY));
    if (r && typeof r.wins === 'number') return r;
  } catch (_) { /* ignore */ }
  return { wins: 0, losses: 0 };
}
function saveRecord(r) {
  try { localStorage.setItem(REC_KEY, JSON.stringify(r)); } catch (_) { /* ignore */ }
}

function onBridge(x) {
  return Math.abs(x - LANE_X.left) < BRIDGE_W / 2 + 3 || Math.abs(x - LANE_X.right) < BRIDGE_W / 2 + 3;
}

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.effects = new Effects();
    this.ai = new AI(this);
    this.sfx = sfx;
    this.rng = makeRng();
    this.units = [];
    this.towers = [];
    this.projectiles = [];
    this.state = 'title'; // title | play | over
    this.record = loadRecord();
    this.selectedSlot = -1;
    this.elixir = { player: ELIXIR_START, enemy: ELIXIR_START };
    this.crowns = { player: 0, enemy: 0 };
    this.hands = { player: [], enemy: [] };
    this.queue = { player: [], enemy: [] };
    this.timeLeft = MATCH_TIME;
    this.doubleElixir = false;
    this.overtime = false;
    this.winner = null;
    this.overT = 0;
    this.startCountT = 0;
    this.toast = '';
    this.toastT = 0;
    this.toastColor = '#ffd24a';
    this._lastElix = { player: ELIXIR_START, enemy: ELIXIR_START };
    this._dblToast = false;
    this.ui = new UI(this);
    this.time = 0;
  }

  setToast(text, color = '#ffd24a', dur = 1.6) {
    this.toast = text; this.toastColor = color; this.toastT = dur;
  }

  // ----------------------------------------------------------- lifecycle ---
  startMatch() {
    this.units.length = 0;
    this.projectiles.length = 0;
    this.effects.reset();
    this.towers = TOWERS.map((s) => new Tower(s, TOWER_DEF[s.kind]));
    this.elixir = { player: ELIXIR_START, enemy: ELIXIR_START };
    this._lastElix = { player: ELIXIR_START, enemy: ELIXIR_START };
    this.crowns = { player: 0, enemy: 0 };
    const pd = shuffle(DECK, this.rng);
    const ed = shuffle(DECK, this.rng);
    this.hands.player = pd.slice(0, 4);
    this.queue.player = pd.slice(4);
    this.hands.enemy = ed.slice(0, 4);
    this.queue.enemy = ed.slice(4);
    this.timeLeft = MATCH_TIME;
    this.doubleElixir = false;
    this.overtime = false;
    this._dblToast = false;
    this.winner = null;
    this.overT = 0;
    this.selectedSlot = -1;
    this.startCountT = 3.6;
    this.ai.reset();
    this.state = 'play';
    this.setToast('', '#fff', 0);
  }

  endMatch(winner) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.winner = winner;
    this.overT = 0;
    this.selectedSlot = -1;
    if (winner === 'player') { this.record.wins++; this.sfx.win(); }
    else if (winner === 'enemy') { this.record.losses++; this.sfx.lose(); }
    saveRecord(this.record);
  }

  awardCrown(team, tower) {
    this.crowns[team]++;
    this.setToast(team === 'player' ? 'CROWN!' : 'TOWER LOST', team === 'player' ? '#ffd24a' : '#ff6a6a', 1.2);
    if (tower.towerKind === 'king') { this.endMatch(team); return; }
    if (this.overtime) this.endMatch(this.crowns.player > this.crowns.enemy ? 'player' : 'enemy');
  }

  // ------------------------------------------------------------- cards -----
  selectCard(slot) {
    if (this.state !== 'play' || this.startCountT > 0) return;
    this.selectedSlot = this.selectedSlot === slot ? -1 : slot;
    this.sfx.select();
  }

  tryDeploy(x, y) {
    if (this.selectedSlot < 0) return;
    const id = this.hands.player[this.selectedSlot];
    const card = CARDS[id];
    if (this.elixir.player < card.cost) {
      this.sfx.error();
      this.setToast('Not enough elixir', '#ff8a8a', 0.9);
      return;
    }
    if (card.kind === 'unit' && y < RIVER_TOP) {
      this.sfx.error();
      this.setToast('Deploy on your side', '#ff8a8a', 0.9);
      return;
    }
    this.playCard('player', this.selectedSlot, x, y);
    this.selectedSlot = -1;
  }

  playCard(team, slot, x, y) {
    const id = this.hands[team][slot];
    if (!id) return false;
    const card = CARDS[id];
    if (this.elixir[team] < card.cost) return false;
    if (card.kind === 'spell') {
      x = clamp(x, 10, ARENA_W - 10); y = clamp(y, 10, ARENA_H - 10);
    } else if (team === 'player') {
      x = clamp(x, DEPLOY.minX, DEPLOY.maxX); y = clamp(y, DEPLOY.minY, DEPLOY.maxY);
    } else {
      x = clamp(x, 24, ARENA_W - 24); y = clamp(y, 64, RIVER_TOP - 8);
    }
    this.elixir[team] -= card.cost;
    // rotate hand: played slot refilled by next card, played card to back
    this.hands[team][slot] = this.queue[team].shift();
    this.queue[team].push(id);
    if (card.kind === 'spell') this.deploySpell(team, card, x, y);
    else this.deployUnits(team, card, x, y);
    return true;
  }

  deployUnits(team, card, x, y) {
    const def = card.unit;
    const count = card.count || 1;
    const offs = this.formation(count, card.spread || 0);
    for (let i = 0; i < count; i++) {
      const ux = clamp(x + offs[i][0], 12, ARENA_W - 12);
      const uy = clamp(y + offs[i][1], 18, ARENA_H - 18);
      this.units.push(new Unit(team, def, ux, uy, card.accent));
    }
    this.effects.ring(x, y, TEAM[team].ring, 0.4, def.radius * 4 + 14);
    this.effects.poof(x, y, TEAM[team].ring, 8, 50);
    if (def.type === 'tank') this.sfx.deployBig(); else this.sfx.deploy();
  }

  formation(count, spread) {
    if (count === 1) return [[0, 0]];
    if (count === 2) return [[-spread / 2, 4], [spread / 2, -4]];
    // 2x2 diamond-ish
    const s = spread / 2;
    return [[-s, -s], [s, -s], [-s, s], [s, s]];
  }

  deploySpell(team, card, x, y) {
    this.projectiles.push(new Projectile({
      kind: 'spell', tx: x, ty: y, team, dmg: 0,
      color: '#ff7a2a', spell: card.spell,
    }));
    this.effects.floatText(x, y - 30, 'INCOMING', '#ff9a4a', 12);
  }

  spawnProjectile(opts) { this.projectiles.push(new Projectile(opts)); }

  // ------------------------------------------------------------- update ----
  update(dt) {
    this.time += dt;
    this.effects.update(dt);
    if (this.toastT > 0) this.toastT -= dt;

    if (this.state === 'over') { this.overT += dt; return; }
    if (this.state !== 'play') return;

    if (this.startCountT > 0) {
      this.startCountT -= dt;
      return;
    }

    // timer
    this.timeLeft -= dt;
    this.doubleElixir = this.overtime || this.timeLeft <= DOUBLE_ELIXIR_AT;
    if (!this.overtime && this.timeLeft <= DOUBLE_ELIXIR_AT && !this._dblToast) {
      this._dblToast = true;
      this.setToast('DOUBLE ELIXIR!', '#ff77e0', 1.6);
    }
    if (this.timeLeft <= 0) {
      this.handleTimeUp();
      if (this.state !== 'play') return;
    }

    // elixir regen
    const rate = (1 / ELIXIR_PERIOD) * (this.doubleElixir ? 2 : 1);
    for (const team of ['player', 'enemy']) {
      this.elixir[team] = Math.min(ELIXIR_MAX, this.elixir[team] + rate * dt);
      if (Math.floor(this.elixir[team]) > Math.floor(this._lastElix[team])) {
        if (team === 'player') this.sfx.elixir();
      }
      this._lastElix[team] = this.elixir[team];
    }

    // AI
    this.ai.update(dt);

    // entities
    for (const t of this.towers) t.update(dt, this);
    for (const u of this.units) u.update(dt, this);
    this.separate();
    for (const p of this.projectiles) p.update(dt, this);

    // cull
    this.units = this.units.filter((u) => !u.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  handleTimeUp() {
    if (!this.overtime) {
      if (this.crowns.player !== this.crowns.enemy) {
        this.endMatch(this.crowns.player > this.crowns.enemy ? 'player' : 'enemy');
      } else {
        this.overtime = true;
        this.timeLeft = OVERTIME;
        this.setToast('OVERTIME!\nFIRST CROWN WINS', '#ffd24a', 2.2);
      }
    } else {
      const pf = this.lowestTowerFrac('player');
      const ef = this.lowestTowerFrac('enemy');
      if (Math.abs(pf - ef) < 0.001) this.endMatch('draw');
      else this.endMatch(pf > ef ? 'player' : 'enemy');
    }
  }

  lowestTowerFrac(team) {
    let lo = Infinity;
    for (const t of this.towers) {
      if (t.team !== team) continue;
      const f = t.destroyed ? 0 : t.hp / t.maxHp;
      if (f < lo) lo = f;
    }
    return lo === Infinity ? 0 : lo;
  }

  separate() {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      if (a.dead) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j];
        if (b.dead) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        const min = a.radius + b.radius;
        let d = Math.hypot(dx, dy);
        if (d > 0 && d < min) {
          const overlap = (min - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          const wa = b.mass / (a.mass + b.mass);
          const wb = a.mass / (a.mass + b.mass);
          a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
          b.x += nx * overlap * wb; b.y += ny * overlap * wb;
        }
      }
    }
    for (const u of us) {
      u.x = clamp(u.x, 10, ARENA_W - 10);
      u.y = clamp(u.y, 14, ARENA_H - 14);
      if (u.y > RIVER_TOP && u.y < RIVER_BOT && !onBridge(u.x)) {
        const ln = Math.abs(u.x - LANE_X.left) < Math.abs(u.x - LANE_X.right) ? LANE_X.left : LANE_X.right;
        u.x += Math.sign(ln - u.x) * 1;
        u.y = u.y < RIVER_MID ? RIVER_TOP : RIVER_BOT;
      }
    }
  }

  // ------------------------------------------------------------- render ----
  handlePointer(x, y) {
    if (this.state === 'title') { this.startMatch(); return; }
    if (this.state === 'over') { if (this.overT > 0.5) this.startMatch(); return; }
    if (this.startCountT > 0) return;
    if (this.ui.inTray(y)) {
      const slot = this.ui.hitTestCard(x, y);
      if (slot >= 0) this.selectCard(slot);
      else this.selectedSlot = -1;
    } else {
      this.tryDeploy(x, y);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const [sx, sy] = this.effects.shakeOffset();
    ctx.save();
    ctx.translate(sx, sy);
    this.drawArena(ctx);
    this.drawDeployHint(ctx);

    const drawables = [];
    for (const t of this.towers) drawables.push(t);
    for (const u of this.units) drawables.push(u);
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    for (const p of this.projectiles) p.draw(ctx);
    this.effects.drawParticles(ctx);
    this.effects.drawFloats(ctx);
    ctx.restore();

    this.effects.drawFlash(ctx, VIEW_W, VIEW_H);
    this.ui.draw(ctx, this.time);
  }

  drawArena(ctx) {
    const TILE = 24;
    for (let ty = 0; ty < ARENA_H; ty += TILE) {
      for (let tx = 0; tx < ARENA_W; tx += TILE) {
        const even = ((tx / TILE) + (ty / TILE)) % 2 === 0;
        ctx.fillStyle = even ? '#34743f' : '#2e6a39';
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
    ctx.fillStyle = 'rgba(58,155,255,0.06)';
    ctx.fillRect(0, RIVER_MID, ARENA_W, ARENA_H - RIVER_MID);
    ctx.fillStyle = 'rgba(255,91,72,0.06)';
    ctx.fillRect(0, 0, ARENA_W, RIVER_MID);

    for (const t of this.towers) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(t.x - t.w / 2 - 4, t.y - t.h / 2 - 2, t.w + 8, t.h + 10);
    }

    const rg = ctx.createLinearGradient(0, RIVER_TOP, 0, RIVER_BOT);
    rg.addColorStop(0, '#1f5fa8');
    rg.addColorStop(0.5, '#2f86d6');
    rg.addColorStop(1, '#1f5fa8');
    ctx.fillStyle = rg;
    ctx.fillRect(0, RIVER_TOP, ARENA_W, RIVER_BOT - RIVER_TOP);
    ctx.fillStyle = '#173f70';
    ctx.fillRect(0, RIVER_TOP - 2, ARENA_W, 2);
    ctx.fillRect(0, RIVER_BOT, ARENA_W, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const t = this.time;
    for (let i = 0; i < ARENA_W; i += 14) {
      const yy = RIVER_TOP + 8 + Math.sin((i * 0.18) + t * 2) * 3 + (RIVER_BOT - RIVER_TOP) * 0.25;
      ctx.fillRect(i + ((t * 12) % 14), yy, 6, 2);
      const yy2 = RIVER_TOP + 20 + Math.sin((i * 0.2) - t * 2.4) * 3;
      ctx.fillRect(i + (((t * -9) % 14) + 14) % 14, yy2, 5, 2);
    }

    for (const lane of ['left', 'right']) {
      const bx = LANE_X[lane] - BRIDGE_W / 2;
      const by = RIVER_TOP - 4, bh = (RIVER_BOT - RIVER_TOP) + 8;
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(bx, by, BRIDGE_W, bh);
      ctx.fillStyle = '#92602f';
      for (let py = by; py < by + bh; py += 7) ctx.fillRect(bx + 1, py, BRIDGE_W - 2, 4);
      ctx.fillStyle = '#5e371b';
      ctx.fillRect(bx, by, 3, bh);
      ctx.fillRect(bx + BRIDGE_W - 3, by, 3, bh);
    }

    ctx.strokeStyle = '#12331f'; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, ARENA_W - 4, ARENA_H - 4);
  }

  drawDeployHint(ctx) {
    if (this.state !== 'play' || this.selectedSlot < 0 || this.startCountT > 0) return;
    const id = this.hands.player[this.selectedSlot];
    const card = CARDS[id];
    if (card.kind === 'spell') {
      ctx.fillStyle = 'rgba(255,138,58,0.06)';
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);
      return;
    }
    ctx.fillStyle = 'rgba(79,176,255,0.10)';
    ctx.fillRect(DEPLOY.minX, DEPLOY.minY, DEPLOY.maxX - DEPLOY.minX, DEPLOY.maxY - DEPLOY.minY);
    ctx.strokeStyle = 'rgba(79,176,255,0.5)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(DEPLOY.minX, DEPLOY.minY, DEPLOY.maxX - DEPLOY.minX, DEPLOY.maxY - DEPLOY.minY);
    ctx.setLineDash([]);
  }
}

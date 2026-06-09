import {
  RIVER_TOP, RIVER_BOT, RIVER_MID, LANE_X, BRIDGE_W, ARENA_W, ARENA_H, TEAM,
} from './config.js';
import { dist, TAU } from './math.js';
import { drawSprite, drawShadow, SPRITES } from './sprites.js';

let UID = 1;

function onBridge(x) {
  return (
    Math.abs(x - LANE_X.left) < BRIDGE_W / 2 + 3 ||
    Math.abs(x - LANE_X.right) < BRIDGE_W / 2 + 3
  );
}

// ---------------------------------------------------------------- Unit -----
export class Unit {
  constructor(team, def, x, y, accent) {
    this.id = UID++;
    this.kind = 'unit';
    this.team = team;
    this.type = def.type;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dmg = def.dmg;
    this.atk = def.atk;
    this.range = def.range;
    this.speed = def.speed;
    this.sight = def.sight;
    this.radius = def.radius;
    this.mass = def.mass;
    this.ranged = !!def.ranged;
    this.projSpeed = def.projSpeed || 240;
    this.buildingsOnly = !!def.targetsBuildingsOnly;
    this.accent = accent;
    this.lane = x < ARENA_W / 2 ? 'left' : 'right';
    this.atkCd = 0.15;
    this.flash = 0;
    this.dead = false;
    this.spawnT = 0.35; // brief deploy-in
    this.walk = Math.random() * TAU;
    this.face = team === 'player' ? -1 : 1;
    this.target = null;
    this.engaged = false;
    this.scale = this.type === 'tank' ? 1.7 : this.type === 'ranged' ? 1.5 : 1.5;
  }

  get pal() { return TEAM[this.team]; }

  takeDamage(d, game, fromTeam) {
    if (this.dead) return;
    this.hp -= d;
    this.flash = 0.12;
    game.effects.blood(this.x, this.y, this.team === 'player' ? '#7fc0ff' : '#ff8f7f', 4);
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    if (this.dead) return;
    this.dead = true;
    game.effects.poof(this.x, this.y, this.team === 'player' ? '#bfe0ff' : '#ffc7bd', this.type === 'tank' ? 16 : 9, this.type === 'tank' ? 90 : 55);
    if (this.type === 'tank') { game.effects.addShake(5); game.effects.ring(this.x, this.y, '#fff', 0.35, 40); }
    game.sfx.death();
  }

  acquire(game) {
    let target = null;
    if (!this.buildingsOnly) {
      let best = this.sight * this.sight;
      for (const u of game.units) {
        if (u.dead || u.team === this.team) continue;
        const dx = u.x - this.x, dy = u.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) { best = d2; target = u; }
      }
    }
    if (!target) {
      // nearest standing enemy tower
      let bestD = Infinity;
      for (const t of game.towers) {
        if (t.destroyed || t.team === this.team) continue;
        const d = dist(this.x, this.y, t.x, t.y);
        if (d < bestD) { bestD = d; target = t; }
      }
    }
    this.target = target;
  }

  update(dt, game) {
    if (this.dead) return;
    if (this.spawnT > 0) this.spawnT -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;

    this.acquire(game);
    const tgt = this.target;
    this.engaged = false;
    if (!tgt) return;

    const tr = tgt.radius || 14;
    const reach = this.range + this.radius + tr;
    const d = dist(this.x, this.y, tgt.x, tgt.y);

    if (d <= reach) {
      // in range → attack, hold position
      this.engaged = true;
      this.face = tgt.x < this.x ? -1 : 1;
      if (this.atkCd <= 0) this.attack(game, tgt);
      return;
    }

    // --- move toward target, funneling across the river via a bridge ------
    let aimX = tgt.x, aimY = tgt.y;
    const crossing = (this.y > RIVER_BOT && tgt.y < RIVER_TOP) || (this.y < RIVER_TOP && tgt.y > RIVER_BOT);
    if (crossing && !onBridge(this.x)) {
      aimX = LANE_X[this.lane];
      aimY = RIVER_MID;
    }
    let dx = aimX - this.x, dy = aimY - this.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    this.face = dx < 0 ? -1 : 1;

    let nx = this.x + dx * this.speed * dt;
    let ny = this.y + dy * this.speed * dt;

    // block off-bridge river crossing
    if (ny > RIVER_TOP && ny < RIVER_BOT && !onBridge(nx)) {
      ny = this.y <= RIVER_TOP ? RIVER_TOP : this.y >= RIVER_BOT ? RIVER_BOT : this.y;
    }
    nx = Math.max(10, Math.min(ARENA_W - 10, nx));
    ny = Math.max(14, Math.min(ARENA_H - 14, ny));
    this.x = nx; this.y = ny;
    this.walk += dt * (this.speed * 0.12 + 4);
  }

  attack(game, tgt) {
    this.atkCd = this.atk;
    if (this.ranged) {
      game.spawnProjectile({
        x: this.x, y: this.y - 4, team: this.team, target: tgt,
        speed: this.projSpeed, dmg: this.dmg, color: this.pal.proj, kind: 'bolt',
      });
      game.sfx.shoot();
    } else {
      tgt.takeDamage(this.dmg, game, this.team);
      const hx = (this.x + tgt.x) / 2, hy = (this.y + tgt.y) / 2;
      game.effects.poof(hx, hy, '#fff', 3, 30);
      game.sfx.hit();
    }
  }

  draw(ctx) {
    const sprite = SPRITES[this.type] || SPRITES.swarm;
    const bob = this.engaged ? 0 : Math.sin(this.walk) * 1.2;
    const cy = this.y + bob;
    drawShadow(ctx, this.x, this.y + this.radius * 0.7, this.radius + 1);
    let alpha = 1, scale = this.scale;
    if (this.spawnT > 0) {
      const t = 1 - this.spawnT / 0.35;
      alpha = t;
      scale = this.scale * (0.5 + t * 0.5);
    }
    drawSprite(ctx, sprite, this.x, cy - this.radius * 0.3, scale, this.pal, { flash: this.flash, alpha });
    // accent pip for unit type (small dot) + ranged bow glint
    if (this.type === 'ranged') {
      ctx.fillStyle = this.accent;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(this.x - 1), Math.round(cy + this.radius * 0.4), 2, 2);
      ctx.globalAlpha = 1;
    }
    if (this.spawnT <= 0) this.drawHpBar(ctx);
  }

  drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const w = Math.max(12, this.radius * 2.4);
    const x = this.x - w / 2;
    const y = this.y - this.radius - (this.type === 'tank' ? 16 : 11);
    ctx.fillStyle = '#000a';
    ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = this.team === 'player' ? '#39d05a' : '#ff4d4d';
    ctx.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 2);
  }
}

// --------------------------------------------------------------- Tower -----
export class Tower {
  constructor(spec, def) {
    this.id = spec.id;
    this.kind = 'tower';
    this.team = spec.team;
    this.towerKind = spec.kind;
    this.x = spec.x;
    this.y = spec.y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.dmg = def.dmg;
    this.atk = def.atk;
    this.range = def.range;
    this.radius = def.radius;
    this.w = def.w;
    this.h = def.h;
    this.atkCd = Math.random() * 0.4;
    this.flash = 0;
    this.destroyed = false;
    this.active = spec.kind !== 'king'; // king sleeps until provoked
    this.recoil = 0;
  }

  get pal() { return TEAM[this.team]; }

  takeDamage(d, game, fromTeam) {
    if (this.destroyed) return;
    this.hp -= d;
    this.flash = 0.1;
    if (this.towerKind === 'king') this.active = true;
    game.sfx.towerHit();
    if (this.hp <= 0) this.destroy(game);
  }

  destroy(game) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.hp = 0;
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    game.effects.explode(this.x, this.y, '#ffae3a', this.towerKind === 'king' ? 50 : 34);
    game.effects.addShake(this.towerKind === 'king' ? 14 : 9);
    game.effects.fullFlash('#fff', this.towerKind === 'king' ? 0.3 : 0.18);
    game.effects.ring(this.x, this.y, '#ffd24a', 0.5, this.towerKind === 'king' ? 110 : 80);
    game.effects.crownPop(this.x, this.y - 6);
    game.sfx.towerFall();
    game.sfx.crown();
    game.awardCrown(enemyTeam, this);
    // activate own king when a guarding side tower falls
    if (this.towerKind === 'side') {
      const king = game.towers.find((t) => t.team === this.team && t.towerKind === 'king');
      if (king) king.active = true;
    }
  }

  update(dt, game) {
    if (this.destroyed) return;
    if (this.flash > 0) this.flash -= dt;
    if (this.recoil > 0) this.recoil -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;
    if (!this.active) return;
    // target nearest enemy unit in range
    let best = null, bestD = (this.range + 12) * (this.range + 12);
    for (const u of game.units) {
      if (u.dead || u.team === this.team) continue;
      const dx = u.x - this.x, dy = u.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = u; }
    }
    if (best && this.atkCd <= 0) {
      this.atkCd = this.atk;
      this.recoil = 0.12;
      game.spawnProjectile({
        x: this.x, y: this.y - this.h * 0.35, team: this.team, target: best,
        speed: 300, dmg: this.dmg, color: this.pal.proj, kind: 'shell',
      });
      game.sfx.shoot();
    }
  }

  draw(ctx) {
    const pal = this.pal;
    const w = this.w, h = this.h;
    const x = this.x - w / 2;
    let y = this.y - h / 2;
    if (this.destroyed) {
      drawShadow(ctx, this.x, this.y + h * 0.35, w * 0.55);
      ctx.fillStyle = '#3b3340';
      for (let i = 0; i < 6; i++) {
        const rx = this.x - w / 2 + (i * w) / 6 + ((i % 2) ? 2 : -1);
        const ry = this.y + 2 + ((i % 3) - 1) * 4;
        ctx.fillRect(rx, ry, 7, 6);
      }
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(this.x - w / 2, this.y + h * 0.25, w, 6);
      // lingering embers
      ctx.fillStyle = 'rgba(255,120,40,0.5)';
      ctx.fillRect(this.x - 3 + Math.sin(this.id.length + performance.now() / 200) * 4, this.y, 2, 2);
      return;
    }
    if (this.recoil > 0) y += 2;
    drawShadow(ctx, this.x, this.y + h * 0.4, w * 0.6);

    const flashing = this.flash > 0;
    const body = flashing ? '#ffffff' : pal.T;
    const hi = flashing ? '#ffffff' : pal.h;
    const out = flashing ? '#ffd0d0' : pal.o;

    // base
    ctx.fillStyle = out;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = body;
    ctx.fillRect(x, y, w, h);
    // crenellations
    ctx.fillStyle = hi;
    for (let i = 0; i < w; i += 8) ctx.fillRect(x + i, y, 4, 5);
    ctx.fillRect(x + 3, y + 8, w - 6, 4);
    // window / core
    ctx.fillStyle = out;
    ctx.fillRect(this.x - 4, y + h * 0.45, 8, h * 0.4);
    // king crown
    if (this.towerKind === 'king') {
      ctx.fillStyle = flashing ? '#fff' : '#ffd24a';
      const cw = w * 0.6, cx = this.x - cw / 2, cyy = y - 8;
      ctx.fillRect(cx, cyy + 4, cw, 4);
      for (let i = 0; i <= 4; i++) ctx.fillRect(cx + (i * (cw - 3)) / 4, cyy, 3, 5);
    }
    if (this.towerKind === 'king' && !this.active) {
      ctx.fillStyle = '#0008';
      ctx.fillRect(x, y, w, h);
    }
    this.drawHpBar(ctx, x, y - (this.towerKind === 'king' ? 12 : 6), w);
  }

  drawHpBar(ctx, x, y, w) {
    const frac = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#000a';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = this.team === 'player' ? '#39d05a' : '#ff4d4d';
    ctx.fillRect(x, y, w * frac, 4);
    ctx.fillStyle = '#ffffff22';
    ctx.fillRect(x, y, w * frac, 1);
  }
}

// ----------------------------------------------------------- Projectile ----
export class Projectile {
  constructor(o) {
    this.x = o.x; this.y = o.y;
    this.team = o.team;
    this.target = o.target || null;
    this.tx = o.tx ?? (o.target ? o.target.x : o.x);
    this.ty = o.ty ?? (o.target ? o.target.y : o.y);
    this.speed = o.speed;
    this.dmg = o.dmg;
    this.color = o.color;
    this.kind = o.kind || 'bolt';
    this.dead = false;
    this.trail = [];
    this.spell = o.spell || null;
    this.r = this.kind === 'shell' ? 3 : 2.5;
    if (this.kind === 'spell') { this.x = this.tx; this.y = -20; this.speed = 520; }
  }

  update(dt, game) {
    if (this.target && !this.target.dead && !this.target.destroyed) {
      this.tx = this.target.x;
      this.ty = this.target.y - (this.target.kind === 'tower' ? 4 : 0);
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = this.speed * dt;
    this.trail.push([this.x, this.y]);
    if (this.trail.length > 7) this.trail.shift();
    if (step >= d) {
      this.x = this.tx; this.y = this.ty;
      this.hit(game);
      this.dead = true;
      return;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  hit(game) {
    if (this.kind === 'spell' && this.spell) {
      const { radius, dmgUnit, dmgTower } = this.spell;
      game.effects.explode(this.x, this.y, '#ff7a2a', 40);
      game.effects.ring(this.x, this.y, '#ffb24a', 0.45, radius * 1.4);
      game.effects.addShake(8);
      game.sfx.spell();
      for (const u of game.units) {
        if (u.dead || u.team === this.team) continue;
        if (dist(u.x, u.y, this.x, this.y) <= radius + u.radius) u.takeDamage(dmgUnit, game, this.team);
      }
      for (const t of game.towers) {
        if (t.destroyed || t.team === this.team) continue;
        if (dist(t.x, t.y, this.x, this.y) <= radius + t.radius) t.takeDamage(dmgTower, game, this.team);
      }
      return;
    }
    if (this.target && !this.target.dead && !this.target.destroyed) {
      this.target.takeDamage(this.dmg, game, this.team);
    }
    game.effects.poof(this.x, this.y, this.color, 4, 36);
  }

  draw(ctx) {
    if (this.kind === 'spell') {
      // a glowing meteor
      for (let i = 0; i < this.trail.length; i++) {
        const [tx, ty] = this.trail[i];
        const a = (i / this.trail.length) * 0.6;
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 2 ? '#ff7a2a' : '#ffd24a';
        ctx.fillRect(tx - 3, ty - 3, 6, 6);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff2c0';
      ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath(); ctx.arc(this.x, this.y, 3.5, 0, TAU); ctx.fill();
      return;
    }
    // tracer trail
    for (let i = 0; i < this.trail.length; i++) {
      const [tx, ty] = this.trail[i];
      ctx.globalAlpha = (i / this.trail.length) * 0.5;
      ctx.fillStyle = this.color;
      const s = this.r * (0.4 + (i / this.trail.length) * 0.6);
      ctx.fillRect(tx - s / 2, ty - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - this.r / 2, this.y - this.r / 2, this.r, this.r);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.r, this.y - this.r, this.r * 0.8, this.r * 0.8);
  }
}

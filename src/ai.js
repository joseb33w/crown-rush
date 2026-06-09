import { CARDS, LANE_X, RIVER_TOP, RIVER_BOT } from './config.js';
import { dist } from './math.js';

// Moderate AI: defends the threatened lane, punishes clusters with the spell,
// and builds pushes when elixir is flush. Aggression ramps as the match goes on.
export class AI {
  constructor(game) {
    this.game = game;
    this.decTimer = 1.4;
    this.spellCd = 0;
  }

  reset() {
    this.decTimer = 1.4;
    this.spellCd = 0;
  }

  laneOf(x) { return x < 180 ? 'left' : 'right'; }

  update(dt) {
    this.spellCd -= dt;
    this.decTimer -= dt;
    if (this.decTimer <= 0) {
      this.decTimer = 0.65 + Math.random() * 0.7;
      this.decide();
    }
  }

  affordableSlots() {
    const g = this.game;
    const out = [];
    g.hands.enemy.forEach((id, i) => {
      if (CARDS[id].cost <= g.elixir.enemy) out.push({ i, id, card: CARDS[id] });
    });
    return out;
  }

  pick(slots, type) { return slots.find((s) => s.id === type); }

  decide() {
    const g = this.game;
    if (g.state !== 'play') return;
    const slots = this.affordableSlots();
    if (!slots.length) return;
    const aggression = g.timeLeft < 60 ? 1.4 : 1; // double-elixir push harder

    // --- threat assessment (player units on/near the enemy half) ----------
    const threat = { left: 0, right: 0 };
    const lead = { left: null, right: null };
    const cluster = [];
    for (const u of g.units) {
      if (u.team !== 'player' || u.dead) continue;
      if (u.y < RIVER_BOT + 70) {
        const lane = this.laneOf(u.x);
        threat[lane] += u.maxHp / 90 + u.dmg / 18;
        if (!lead[lane] || u.y < lead[lane].y) lead[lane] = u;
        cluster.push(u);
      }
    }

    // --- spell on a juicy cluster -----------------------------------------
    const spellSlot = this.pick(slots, 'spell');
    if (spellSlot && this.spellCd <= 0) {
      const best = this.bestSpellTarget(cluster, spellSlot.card.spell.radius);
      if (best && best.count >= 3) {
        g.playCard('enemy', spellSlot.i, best.x, best.y);
        this.spellCd = 6;
        return;
      }
    }

    const topLane = threat.left >= threat.right ? 'left' : 'right';
    const topThreat = threat[topLane];

    // --- defend a real threat ---------------------------------------------
    if (topThreat > 4) {
      const ld = lead[topLane];
      const laneX = LANE_X[topLane];
      const hasTank = g.units.some((u) => u.team === 'player' && !u.dead && u.type === 'tank' && this.laneOf(u.x) === topLane);
      let want;
      if (hasTank) want = this.pick(slots, 'swarm') || this.pick(slots, 'ranged') || this.pick(slots, 'tank');
      else want = this.pick(slots, 'ranged') || this.pick(slots, 'swarm') || this.pick(slots, 'tank');
      if (want) {
        const y = Math.max(112, Math.min(RIVER_TOP - 10, (ld ? ld.y : RIVER_TOP) - 26));
        g.playCard('enemy', want.i, laneX, y);
        return;
      }
    }

    // --- otherwise build a push when flush --------------------------------
    if (g.elixir.enemy >= 7 * (2 - aggression) || (g.elixir.enemy >= 6 && Math.random() < 0.4 * aggression)) {
      const pushLane = this.weakLane();
      const laneX = LANE_X[pushLane];
      const want = this.pick(slots, 'tank') || this.pick(slots, 'ranged') || this.pick(slots, 'swarm');
      if (want) {
        const y = want.id === 'tank' ? 86 : 120;
        g.playCard('enemy', want.i, laneX, y);
      }
    }
  }

  weakLane() {
    const g = this.game;
    const lt = g.towers.find((t) => t.id === 'p_left');
    const rt = g.towers.find((t) => t.id === 'p_right');
    const lv = lt.destroyed ? -1 : lt.hp;
    const rv = rt.destroyed ? -1 : rt.hp;
    if (lv === rv) return Math.random() < 0.5 ? 'left' : 'right';
    return lv < rv ? 'left' : 'right';
  }

  bestSpellTarget(units, radius) {
    let best = null;
    for (const a of units) {
      let count = 0, sx = 0, sy = 0;
      for (const b of units) {
        if (dist(a.x, a.y, b.x, b.y) <= radius) { count++; sx += b.x; sy += b.y; }
      }
      if (!best || count > best.count) best = { count, x: sx / count, y: sy / count };
    }
    return best;
  }
}

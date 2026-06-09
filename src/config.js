// ---- Arena geometry (logical pixels) ------------------------------------
export const ARENA_W = 360;
export const ARENA_H = 560; // playfield height
export const TRAY_H = 170; // bottom HUD (elixir + cards)
export const VIEW_W = ARENA_W;
export const VIEW_H = ARENA_H + TRAY_H; // 730

// River runs horizontally across the middle of the playfield.
export const RIVER_TOP = 256;
export const RIVER_BOT = 296;
export const RIVER_MID = (RIVER_TOP + RIVER_BOT) / 2;

// Two lanes; bridges + side towers align to these x columns.
export const LANE_X = { left: 84, right: 276 };
export const BRIDGE_W = 48;

// Deploy bounds for the human player (their half, below the river).
export const DEPLOY = { minX: 22, maxX: 338, minY: RIVER_BOT + 4, maxY: 498 };

// ---- Towers --------------------------------------------------------------
export const TOWER_DEF = {
  king: { hp: 2600, dmg: 64, atk: 1.0, range: 116, radius: 19, w: 40, h: 44 },
  side: { hp: 1500, dmg: 52, atk: 0.72, range: 110, radius: 16, w: 32, h: 36 },
};

// Tower placements. Player attacks UP (toward y=0); enemy attacks DOWN.
export const TOWERS = [
  { id: 'p_king', team: 'player', kind: 'king', x: 180, y: 506 },
  { id: 'p_left', team: 'player', kind: 'side', x: 84, y: 398 },
  { id: 'p_right', team: 'player', kind: 'side', x: 276, y: 398 },
  { id: 'e_king', team: 'enemy', kind: 'king', x: 180, y: 50 },
  { id: 'e_left', team: 'enemy', kind: 'side', x: 84, y: 158 },
  { id: 'e_right', team: 'enemy', kind: 'side', x: 276, y: 158 },
];

// ---- Cards / units -------------------------------------------------------
// targetsBuildingsOnly: marches straight to towers, ignores enemy units (golem-like).
export const CARDS = {
  swarm: {
    id: 'swarm', name: 'Rats', cost: 3, kind: 'unit', count: 4, spread: 16,
    accent: '#9bf06b',
    unit: {
      type: 'swarm', hp: 66, dmg: 17, atk: 0.7, range: 13, speed: 64,
      sight: 86, radius: 6, mass: 0.7, ranged: false,
    },
  },
  tank: {
    id: 'tank', name: 'Brute', cost: 5, kind: 'unit', count: 1,
    accent: '#cdd6e6',
    unit: {
      type: 'tank', hp: 980, dmg: 98, atk: 1.4, range: 16, speed: 26,
      sight: 60, radius: 11, mass: 3, ranged: false, targetsBuildingsOnly: true,
    },
  },
  ranged: {
    id: 'ranged', name: 'Archers', cost: 3, kind: 'unit', count: 2, spread: 18,
    accent: '#ffd24a',
    unit: {
      type: 'ranged', hp: 102, dmg: 38, atk: 0.9, range: 106, speed: 44,
      sight: 130, radius: 6, mass: 0.8, ranged: true, projSpeed: 240,
    },
  },
  spell: {
    id: 'spell', name: 'Fireball', cost: 3, kind: 'spell',
    accent: '#ff8a3a',
    spell: { radius: 54, dmgUnit: 250, dmgTower: 140, anywhere: true },
  },
};

// 8-card cycling deck (two of each) → 4-card hand with classic CR rotation.
export const DECK = ['swarm', 'tank', 'ranged', 'spell', 'swarm', 'tank', 'ranged', 'spell'];

// ---- Elixir / match ------------------------------------------------------
export const ELIXIR_MAX = 10;
export const ELIXIR_START = 5;
export const ELIXIR_PERIOD = 2.8; // seconds per 1 elixir (single rate)
export const MATCH_TIME = 180; // 3 minutes
export const OVERTIME = 60;
export const DOUBLE_ELIXIR_AT = 60; // last 60s of regulation = 2x regen

// ---- Team palettes (sprite tints) ---------------------------------------
export const TEAM = {
  player: { T: '#3a9bff', h: '#a6d6ff', o: '#0b2c63', proj: '#8fd0ff', ring: '#4fb0ff' },
  enemy: { T: '#ff5b48', h: '#ffb3a6', o: '#5e1410', proj: '#ffb199', ring: '#ff6e5a' },
};

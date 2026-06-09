import { VIEW_W, VIEW_H } from './config.js';
import { Game } from './game.js';
import { initAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let cssScale = 1;

function resize() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const scale = Math.min(maxW / VIEW_W, maxH / VIEW_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cssScale = scale;
  canvas.style.width = VIEW_W * scale + 'px';
  canvas.style.height = VIEW_H * scale + 'px';
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 80));
resize();

const game = new Game(ctx);

function toLogical(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((ev.clientY - rect.top) / rect.height) * VIEW_H;
  return [x, y];
}

let audioReady = false;
function onDown(ev) {
  ev.preventDefault();
  if (!audioReady) { initAudio(); audioReady = true; }
  const [x, y] = toLogical(ev);
  game.handlePointer(x, y);
}
canvas.addEventListener('pointerdown', onDown, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp big stalls
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- test / debug hooks (used by the headless verifier) -----------------
window.__game = game;
window.__crown = {
  get game() { return game; },
  start() { game.startMatch(); },
  skipCountdown() { game.startCountT = 0; },
  deployPlayer(idOrSlot, x, y) {
    let slot = typeof idOrSlot === 'number' ? idOrSlot : game.hands.player.indexOf(idOrSlot);
    if (slot < 0) slot = 0;
    return game.playCard('player', slot, x, y);
  },
  step(dt = 1 / 30) { game.update(dt); },
  sim(seconds, dt = 1 / 30) {
    let t = 0;
    let guard = 0;
    while (t < seconds && game.state === 'play' && guard < 60000) {
      game.update(dt);
      t += dt; guard++;
    }
    return this.snapshot();
  },
  snapshot() {
    return {
      state: game.state,
      winner: game.winner,
      timeLeft: Math.round(game.timeLeft),
      overtime: game.overtime,
      crowns: { ...game.crowns },
      elixir: { player: +game.elixir.player.toFixed(2), enemy: +game.elixir.enemy.toFixed(2) },
      units: game.units.length,
      towers: game.towers.map((t) => ({ id: t.id, hp: Math.round(t.hp), destroyed: t.destroyed })),
    };
  },
};

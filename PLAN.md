# Goal
Build **Crown Rush**, a 2D real-time lane-battler (Clash Royale–style) in pixel art for mobile.
Symmetrical two-lane arena with a river, side + king towers per side, a regenerating elixir bar,
a hand of 4 cards (swarm / tank / ranged / spell), tap-to-deploy units that auto-march and fight,
an AI opponent on a timer, crowns, a 3-minute match, and lots of juice.

# Files to touch
- `index.html` — canvas + mobile meta + page chrome
- `vite.config.js`, `package.json` — Vite vanilla build (`base: './'` for subpath hosting)
- `src/config.js` — arena geometry, card/unit/tower stats, elixir/match constants
- `src/math.js` — vector + rng helpers
- `src/sprites.js` — pixel-art sprite matrices + team-tinted sprite renderer
- `src/audio.js` — WebAudio sfx (unlocked on first tap)
- `src/effects.js` — particles (poofs, explosions), floating crowns, screen shake
- `src/entities.js` — Unit, Tower, Projectile
- `src/ai.js` — AI opponent controller (reactive defense + pushes)
- `src/ui.js` — HUD: elixir bar, card tray, timer, crowns, banners
- `src/game.js` — game state, update/render loop, deploy logic, win/lose
- `src/main.js` — bootstrap: canvas scaling, pointer input, RAF loop
- `README.md`

# Verification approach
- Build with Vite; serve `dist/` and drive a headless-Chromium harness.
- Run a fast-forwarded full match sim to confirm matches resolve and combat deltas are real.
- Deploy `dist/` to the R2 preview.

# Out of scope
- Online multiplayer / accounts (single-player vs AI only).
- A real backend (local win/loss via localStorage).

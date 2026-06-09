# Crown Rush

A 2D real-time **lane battler** (Clash Royale–style) in pixel art, built for mobile browsers.
Pure vanilla JavaScript + HTML5 Canvas, bundled with Vite. No engine, no CDN runtime, ~37 kB.

## Play

Tap a card, then tap **your half** of the arena to spend elixir and deploy. Units auto-march down
their lane, fight whatever they meet, and batter the enemy towers. An AI opponent deploys against
you on a timer.

- **Win instantly** by destroying the enemy **King Tower**.
- Otherwise, the side with the **most crowns** (towers destroyed) at `0:00` wins.
- Tie at the buzzer → **Overtime**: first crown wins.

### Cards

| Card | Cost | Role |
|------|------|------|
| **Rats** (swarm) | 3 | 4 fast, fragile melee units — great for swarming a tank or a tower |
| **Brute** (tank) | 5 | One slow, huge-HP unit that ignores troops and marches straight at towers |
| **Archers** (ranged) | 3 | 2 ranged units that shoot from a safe distance |
| **Fireball** (spell) | 3 | Instant area damage anywhere — clears a cluster or chips a tower |

You hold a hand of 4 cards drawn from an 8-card cycling deck; the **Next** card shows what rotates in.
Elixir regenerates over time (up to 10) and **doubles** in the final minute.

## Juice

Hit flashes, projectile tracers, death poofs, a screen-shaking tower explosion when one falls,
an elixir-ready glow, deploy rings, a 3·2·1 countdown, and animated win/lose banners.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

Your win/loss record is stored locally in the browser (`localStorage`). The game is fully
single-player vs. the built-in AI — no account or network required.

## License

MIT

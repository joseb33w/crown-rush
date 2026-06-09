// Pixel-art sprites as char matrices.
//   .  transparent      T team body      h team highlight     o team outline
//   a  dark accent      H metal          g gold               w white
// Team colors (T/h/o) are supplied per-draw so one sprite serves both sides.

const ACCENT = {
  a: '#10101c',
  H: '#cfd8ea',
  g: '#ffce3a',
  w: '#ffffff',
  s: '#7a5a3a', // wood/shaft
};

function parse(rows) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const cells = [];
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const c = row[x] || '.';
      if (c !== '.') cells.push([x, y, c]);
    }
  }
  return { w, h, cells };
}

export const SPRITES = {
  swarm: parse([
    '..ooo..',
    '.oTThTo',
    'oThhhTo',
    'oTaTaTo',
    'oThhhTo',
    '.oTTTo.',
    '..ooo..',
  ]),
  tank: parse([
    '...ooooo...',
    '..oTTTTTo..',
    '.oThhhhhTo.',
    'oThHHHHHhTo',
    'oThHaaaHhTo',
    'oThHaHaHhTo',
    'oThHaaaHhTo',
    'oThHHHHHhTo',
    '.oThhhhhTo.',
    '..oTTTTTo..',
    '...ooooo...',
  ]),
  ranged: parse([
    '..ooo..',
    '.oThTo.',
    'oTaaaTo',
    'oThhhTo',
    'g.TTT.g',
    'g.ooo.g',
    's.o.o.s',
    '..o.o..',
  ]),
};

// Towers are drawn separately (parametric) so size scales with hp bar etc.
export function drawSprite(ctx, sprite, cx, cy, scale, pal, opts = {}) {
  const { flash = 0, alpha = 1 } = opts;
  const px = scale;
  const ox = cx - (sprite.w * px) / 2;
  const oy = cy - (sprite.h * px) / 2;
  ctx.globalAlpha = alpha;
  const flashing = flash > 0;
  for (let i = 0; i < sprite.cells.length; i++) {
    const [x, y, c] = sprite.cells[i];
    let color;
    if (flashing) {
      color = c === 'o' || c === 'a' ? '#ffd0d0' : '#ffffff';
    } else if (c === 'T') color = pal.T;
    else if (c === 'h') color = pal.h;
    else if (c === 'o') color = pal.o;
    else color = ACCENT[c] || pal.T;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(ox + x * px), Math.round(oy + y * px), Math.ceil(px), Math.ceil(px));
  }
  ctx.globalAlpha = 1;
}

// A soft circular shadow under units/towers.
export function drawShadow(ctx, cx, cy, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
}

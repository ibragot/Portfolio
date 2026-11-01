/**
 * Deterministic helpers for drawing the night city. Everything is seeded so the
 * server render is stable between builds (and never mismatches on hydration).
 */

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Appends an axis-aligned rectangle to an SVG path string. */
export const rectPath = (x: number, y: number, w: number, h: number) =>
  `M${r(x)} ${r(y)}h${r(w)}v${r(h)}h${r(-w)}Z`;

export type WindowPaths = { warm: string; cool: string };

type GridOptions = {
  colWidth: number;
  rowHeight: number;
  winWidth: number;
  winHeight: number;
  /** Probability that a given window is lit. */
  chance: number;
  /** Share of lit windows that glow cool green instead of warm amber. */
  coolShare?: number;
  pad?: number;
};

/** Scatters lit windows over a facade, returned as two compound paths. */
export function windowGrid(
  rng: Rng,
  x: number,
  y: number,
  w: number,
  h: number,
  { colWidth, rowHeight, winWidth, winHeight, chance, coolShare = 0.25, pad = 6 }: GridOptions,
): WindowPaths {
  let warm = "";
  let cool = "";
  const cols = Math.max(1, Math.floor((w - pad * 2) / colWidth));
  const offsetX = x + (w - cols * colWidth) / 2 + (colWidth - winWidth) / 2;
  for (let wy = y + pad; wy + winHeight < y + h - pad; wy += rowHeight) {
    for (let c = 0; c < cols; c++) {
      if (rng() > chance) continue;
      const d = rectPath(offsetX + c * colWidth, wy, winWidth, winHeight);
      if (rng() < coolShare) cool += d;
      else warm += d;
    }
  }
  return { warm, cool };
}

type SkylineOptions = {
  from: number;
  to: number;
  base: number;
  /** Typical building height at a given x. */
  height: (x: number) => number;
  minWidth: number;
  maxWidth: number;
  windows?: Omit<GridOptions, "chance"> & { chance: number };
};

export type Skyline = { body: string } & WindowPaths;

/** A row of silhouettes with spires, setbacks and domes. */
export function skyline(rng: Rng, opts: SkylineOptions): Skyline {
  const { from, to, base, height, minWidth, maxWidth, windows } = opts;
  let body = "";
  let warm = "";
  let cool = "";
  let x = from;

  while (x < to) {
    const w = minWidth + rng() * (maxWidth - minWidth);
    const h = height(x + w / 2) * (0.55 + rng() * 0.65);
    const top = base - h;
    let d = `M${r(x)} ${base}V${r(top)}`;

    const roll = rng();
    if (roll < 0.2) {
      // Gothic spire
      const sw = w * (0.25 + rng() * 0.2);
      const cx = x + w / 2;
      d += `H${r(cx - sw / 2)}L${r(cx)} ${r(top - h * (0.25 + rng() * 0.3))}L${r(cx + sw / 2)} ${r(top)}`;
    } else if (roll < 0.36) {
      // Art deco setback
      const s = w * 0.2;
      const rise = h * (0.08 + rng() * 0.1);
      d += `H${r(x + s)}V${r(top - rise)}H${r(x + w - s)}V${r(top)}`;
    } else if (roll < 0.44) {
      // Dome
      d += `A${r(w / 2)} ${r(w * 0.4)} 0 0 1 ${r(x + w)} ${r(top)}`;
    }
    d += `H${r(x + w)}V${base}Z`;
    body += d;

    if (windows) {
      const lit = windowGrid(rng, x, top, w, h, windows);
      warm += lit.warm;
      cool += lit.cool;
    }

    // Buildings either butt up against each other or leave a slim alley.
    x += w + (rng() < 0.25 ? rng() * 8 : -rng() * 4);
  }

  return { body, warm, cool };
}

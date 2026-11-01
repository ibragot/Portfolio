// Shared painting tools for the scenes. The look we are after is a painting on black paper:
// shadows are pure black, lit surfaces are soft airbrushed gradients, edges are crisp, and the
// whole thing has a fine paper grain.

export type Ctx = CanvasRenderingContext2D;

export type SceneState = {
  t: number; // ms since the scene started
  dt: number; // ms since last frame
  progress: number; // 0 when the scene enters the bottom of the screen, 1 when it leaves the top
  mx: number; // pointer in scene coords (px), or -1 when outside
  my: number;
  px: number; // smoothed pointer offset from centre, -0.5..0.5
  py: number;
  still: boolean; // reduced motion
};

export type Scene = {
  draw: (ctx: Ctx, s: SceneState) => void;
  click?: (x: number, y: number, s: SceneState) => void;
};

export type SceneFactory = (w: number, h: number, dpr: number) => Scene;

/** Small fast seeded random, so a scene paints the same city every time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** An offscreen canvas in CSS pixels, backed at the given pixel ratio. */
export function layer(w: number, h: number, dpr: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * dpr));
  c.height = Math.max(1, Math.ceil(h * dpr));
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  return [c, g];
}

export function vgrad(g: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

export function hgrad(g: Ctx, x0: number, x1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

let grainTile: HTMLCanvasElement | null = null;
/** A tile of soft noise, used to give every painted surface a paper tooth. */
export function grain() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    // Two octaves: fine speckle plus a slightly coarser mottle
    const v = 128 + (r() - 0.5) * 120 + (r() - 0.5) * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function applyGrain(g: Ctx, w: number, h: number, alpha = 0.16) {
  g.save();
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(grain(), "repeat")!;
  g.fillRect(0, 0, w, h);
  g.restore();
}

/** Additive soft light. */
export function glow(g: Ctx, x: number, y: number, r: number, rgb: string, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.save();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

export type Win = { x: number; y: number; w: number; h: number; c: string };

export type TowerOpts = {
  x: number; // left edge
  base: number; // y of the ground line
  w: number;
  h: number;
  tiers?: number;
  crown?: "steps" | "spire" | "dome" | "flat" | "mast" | "fins" | "needle";
  // Lit front face: top and bottom of the airbrushed gradient
  face: [string, string];
  // Shadow side
  side: string;
  sideW?: number; // fraction of width in shadow
  sideLeft?: boolean;
  ribs?: string | null; // colour of vertical fluting highlights
  ribCount?: number;
  rim?: string | null; // thin highlight on the lit edge
  windows?: {
    lit: number;
    colors: string[];
    gx: number;
    gy: number;
    cw: number;
    ch: number;
    floorChance?: number;
    onSide?: boolean;
  } | null;
  rnd: () => number;
  out?: { lit: Win[]; slots: Win[] };
  fadeTo?: string | null; // base fades into this colour (mist), or null for black
};

/**
 * Paint one deco tower: setback tiers, an airbrushed lit face, a flat shadow side,
 * fluting highlights, a crown, and sparse windows.
 */
export function tower(g: Ctx, o: TowerOpts) {
  const tiers = Math.max(1, o.tiers ?? 2);
  const sideW = o.sideW ?? 0.3;
  const tierH = o.h / (tiers + 0.5);
  let x = o.x;
  let w = o.w;
  let bottom = o.base;
  let top = o.base;
  const boxes: { x: number; w: number; top: number; bottom: number }[] = [];
  for (let i = 0; i < tiers; i++) {
    top = i === tiers - 1 ? o.base - o.h : bottom - tierH * (i === 0 ? 1.5 : 1);
    boxes.push({ x, w, top, bottom });
    bottom = top;
    const inset = w * (0.1 + o.rnd() * 0.08);
    x += inset;
    w -= inset * 2;
  }

  for (const b of boxes) {
    const sw = b.w * sideW;
    const fx = o.sideLeft ? b.x + sw : b.x;
    const fw = b.w - sw;
    const sx = o.sideLeft ? b.x : b.x + fw;
    g.fillStyle = vgrad(g, b.top, o.base, [
      [0, o.face[0]],
      [0.55, o.face[1]],
      [1, o.fadeTo ?? "#000"],
    ]);
    g.fillRect(fx, b.top, fw, b.bottom - b.top);
    g.fillStyle = vgrad(g, b.top, o.base, [
      [0, o.side],
      [1, "#000"],
    ]);
    g.fillRect(sx, b.top, sw, b.bottom - b.top);

    if (o.ribs) {
      const n = o.ribCount ?? Math.max(2, Math.round(fw / 16));
      g.save();
      g.globalAlpha = 0.55;
      for (let r = 1; r < n; r++) {
        const rx = fx + (fw / n) * r;
        g.fillStyle = vgrad(g, b.top, b.top + (b.bottom - b.top) * 0.85, [
          [0, o.ribs],
          [1, "rgba(0,0,0,0)"],
        ]);
        g.fillRect(rx, b.top + 2, Math.max(1, fw * 0.025), (b.bottom - b.top) * 0.85);
      }
      g.restore();
    }
    if (o.rim) {
      g.fillStyle = o.rim;
      g.fillRect(o.sideLeft ? fx + fw - 1.2 : fx, b.top, 1.2, (b.bottom - b.top) * 0.7);
      g.fillRect(b.x, b.top, b.w, 1);
    }

    if (o.windows) {
      const W = o.windows;
      const cols = Math.floor((b.w - W.gx * 0.6) / W.gx);
      const rows = Math.floor((b.bottom - b.top - W.gy * 0.6) / W.gy);
      const ox = b.x + (b.w - cols * W.gx) / 2 + (W.gx - W.cw) / 2;
      for (let r = 0; r < rows; r++) {
        const floor = o.rnd() < (W.floorChance ?? 0.03);
        for (let q = 0; q < cols; q++) {
          const wx = ox + q * W.gx;
          const wy = b.top + W.gy * 0.5 + r * W.gy;
          if (wy + W.ch > o.base - 4) continue;
          const onSide = o.sideLeft ? wx < b.x + sw : wx + W.cw > b.x + fw;
          if (onSide && !W.onSide) continue;
          const slot = { x: wx, y: wy, w: W.cw, h: W.ch, c: "" };
          o.out?.slots.push(slot);
          if (floor || o.rnd() < W.lit) {
            const c = W.colors[Math.floor(o.rnd() * W.colors.length)];
            g.fillStyle = c;
            g.globalAlpha = onSide ? 0.7 : 1;
            g.fillRect(wx, wy, W.cw, W.ch);
            g.globalAlpha = 1;
            o.out?.lit.push({ ...slot, c });
          }
        }
      }
    }
  }

  // Crown
  const t = boxes[boxes.length - 1];
  const cx = t.x + t.w / 2;
  const topY = t.top;
  const lit = o.face[0];
  switch (o.crown) {
    case "steps": {
      let sw = t.w * 0.78;
      let y = topY;
      for (let i = 0; i < 3; i++) {
        const sh = t.w * 0.13;
        g.fillStyle = vgrad(g, y - sh, y, [
          [0, lit],
          [1, o.face[1]],
        ]);
        g.fillRect(cx - sw / 2, y - sh, sw, sh);
        g.fillStyle = o.side;
        g.fillRect(cx + sw / 2 - sw * sideW * 0.6, y - sh, sw * sideW * 0.6, sh);
        y -= sh;
        sw *= 0.66;
      }
      g.fillStyle = lit;
      g.fillRect(cx - 1, y - t.w * 0.6, 2, t.w * 0.6);
      break;
    }
    case "spire":
    case "needle": {
      const bw = o.crown === "needle" ? t.w * 0.18 : t.w * 0.36;
      const sh = o.crown === "needle" ? t.w * 2.4 : t.w * 1.25;
      g.fillStyle = lit;
      g.beginPath();
      g.moveTo(cx - bw, topY);
      g.lineTo(cx, topY - sh);
      g.lineTo(cx + bw, topY);
      g.closePath();
      g.fill();
      g.fillStyle = o.side;
      g.beginPath();
      g.moveTo(cx, topY - sh);
      g.lineTo(cx + bw, topY);
      g.lineTo(cx + bw * 0.25, topY);
      g.closePath();
      g.fill();
      break;
    }
    case "dome": {
      const r = t.w * 0.42;
      g.fillStyle = vgrad(g, topY - r, topY, [
        [0, lit],
        [1, o.face[1]],
      ]);
      g.beginPath();
      g.ellipse(cx, topY, r, r * 0.9, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = lit;
      g.fillRect(cx - 1, topY - r * 1.6, 2, r * 0.8);
      break;
    }
    case "mast": {
      g.fillStyle = lit;
      g.fillRect(cx - t.w * 0.16, topY - t.w * 0.4, t.w * 0.32, t.w * 0.4);
      g.fillRect(cx - 1.5, topY - t.w * 1.8, 3, t.w * 1.45);
      break;
    }
    case "fins": {
      g.fillStyle = lit;
      for (let i = -2; i <= 2; i++) {
        const fh = t.w * (0.9 - Math.abs(i) * 0.25);
        g.fillRect(cx + i * t.w * 0.16 - t.w * 0.04, topY - fh, t.w * 0.08, fh);
      }
      break;
    }
    default:
      break;
  }
  return boxes;
}

/** Thin straight rain streaks across a scene. */
export function makeRain(n: number, seed = 3) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r(), y: r(), v: 0.7 + r() * 0.8, l: 8 + r() * 16 }));
}

export function drawRain(
  ctx: Ctx,
  drops: { x: number; y: number; v: number; l: number }[],
  w: number,
  h: number,
  dt: number,
  alpha: number,
  color = "190,205,230",
) {
  ctx.save();
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of drops) {
    d.y += (dt / 1000) * d.v * 1.1;
    d.x += (dt / 1000) * d.v * 0.12;
    if (d.y > 1.05) {
      d.y = -0.05;
      d.x = Math.random();
    }
    const x = (d.x % 1) * w;
    const y = d.y * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + d.l * 0.15, y + d.l);
  }
  ctx.stroke();
  ctx.restore();
}

/** A jagged lightning bolt from the top of the scene down to (x, y). */
export function makeBolt(x: number, y: number) {
  const pts: [number, number][] = [[x + (Math.random() - 0.5) * 120, -10]];
  let cx = pts[0][0];
  let cy = -10;
  while (cy < y) {
    cy += 14 + Math.random() * 30;
    cx += (Math.random() - 0.5) * 50 + (x - cx) * 0.2;
    pts.push([cx, Math.min(cy, y)]);
  }
  return pts;
}

export function drawBolt(ctx: Ctx, pts: [number, number][], life: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(225,232,255,${life})`;
  ctx.shadowColor = "rgba(160,190,255,0.9)";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

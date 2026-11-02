// Drawing kit for the plates. Everything is vector-drawn into canvases at the screen's pixel
// ratio, so edges stay sharp at any size. The texture comes from three things: fine stipple
// (thousands of tiny dots of varying brightness), hatching (thin lines that follow a form), and
// soft gradient light. Static parts are painted once into offscreen layers; each frame only
// composites those layers and draws the few things that move.

export type Ctx = CanvasRenderingContext2D;

export type SceneState = {
  t: number; // ms since start
  dt: number; // ms since last frame
  progress: number; // 0 entering from below, 1 leaving at the top
  mx: number; // pointer in scene px, -1 when outside
  my: number;
  px: number; // smoothed pointer offset, -0.5..0.5
  py: number;
  still: boolean; // prefers-reduced-motion
};

export type Scene = {
  draw: (ctx: Ctx, s: SceneState) => void;
  click?: (x: number, y: number, s: SceneState) => void;
  act?: (s: SceneState) => void; // triggered by a button outside the canvas
};

export type SceneFactory = (w: number, h: number, dpr: number) => Scene;

export const PAGE = "#0e1029"; // page background; plates dissolve into it

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

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

export function lgrad(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

export function glow(g: Ctx, x: number, y: number, r: number, rgb: string, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(0.3, `rgba(${rgb},${a * 0.4})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.save();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

/** Run `draw` with the canvas clipped to the path built by `path`. */
export function clip(g: Ctx, path: (g: Ctx) => void, draw: () => void) {
  g.save();
  g.beginPath();
  path(g);
  g.clip();
  draw();
  g.restore();
}

/** Scatter tiny dots in a box. Used after clip() to give a surface its glittering tooth. */
export function speckle(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  density: number, // dots per 1000 px²
  rgb: string,
  amin: number,
  amax: number,
  rnd: () => number,
  rmin = 0.35,
  rmax = 0.9,
  weight?: (u: number, v: number) => number, // 0..1 bias by position within the box
) {
  const n = Math.round((w * h * density) / 1000);
  for (let i = 0; i < n; i++) {
    const u = rnd();
    const v = rnd();
    if (weight && rnd() > weight(u, v)) continue;
    const a = amin + (amax - amin) * rnd() ** 2;
    g.fillStyle = `rgba(${rgb},${a})`;
    const r = rmin + (rmax - rmin) * rnd() ** 3;
    g.beginPath();
    g.arc(x + u * w, y + v * h, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Parallel hatch lines across a box at an angle; clip first to confine them to a shape. */
export function hatch(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  rgb: string,
  a: number,
  angle = 0,
  width = 0.6,
  wobble = 0,
  rnd?: () => number,
) {
  g.save();
  g.strokeStyle = `rgba(${rgb},${a})`;
  g.lineWidth = width;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.hypot(w, h) / 2 + gap;
  g.translate(cx, cy);
  g.rotate(angle);
  g.beginPath();
  for (let d = -R; d <= R; d += gap) {
    if (wobble && rnd) {
      g.moveTo(-R, d);
      for (let s = -R; s <= R; s += 24) g.lineTo(s, d + (rnd() - 0.5) * wobble);
    } else {
      g.moveTo(-R, d);
      g.lineTo(R, d);
    }
  }
  g.stroke();
  g.restore();
}

export type Twinkle = { x: number; y: number; r: number; ph: number; sp: number; a: number; rgb: string };

/** A sky full of stars, faint to bright. Returns a handful of bright ones that twinkle. */
export function stars(g: Ctx, w: number, h: number, rnd: () => number, n: number, maxY: number): Twinkle[] {
  const tw: Twinkle[] = [];
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = rnd() ** 1.4 * maxY;
    const b = rnd() ** 3;
    const r = 0.3 + b * 0.9;
    const a = 0.2 + b * 0.75;
    g.fillStyle = `rgba(240,236,255,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    if (b > 0.55 && tw.length < 60) tw.push({ x, y, r: r + 0.3, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.8, a, rgb: "255,250,235" });
  }
  return tw;
}

export function drawTwinkles(ctx: Ctx, list: Twinkle[], t: number, ox = 0, oy = 0) {
  for (const s of list) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph);
    const a = s.a * (0.25 + 0.75 * k);
    ctx.fillStyle = `rgba(${s.rgb},${a})`;
    ctx.beginPath();
    ctx.arc(s.x + ox, s.y + oy, s.r * (0.8 + k * 0.5), 0, Math.PI * 2);
    ctx.fill();
    if (k > 0.85 && s.r > 0.9) {
      ctx.fillStyle = `rgba(${s.rgb},${a * 0.35})`;
      ctx.fillRect(s.x + ox - s.r * 3, s.y + oy - 0.3, s.r * 6, 0.6);
      ctx.fillRect(s.x + ox - 0.3, s.y + oy - s.r * 3, 0.6, s.r * 6);
    }
  }
}

export function moon(g: Ctx, x: number, y: number, r: number) {
  glow(g, x, y, r * 7, "255,236,205", 0.12);
  glow(g, x, y, r * 2.4, "255,240,215", 0.35);
  g.fillStyle = lgrad(g, x - r, y - r, x + r, y + r, [
    [0, "#fff6e4"],
    [1, "#f1d9b6"],
  ]);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  // soft maria
  g.fillStyle = "rgba(200,170,140,0.22)";
  g.beginPath();
  g.arc(x - r * 0.25, y - r * 0.15, r * 0.32, 0, Math.PI * 2);
  g.arc(x + r * 0.3, y + r * 0.25, r * 0.22, 0, Math.PI * 2);
  g.fill();
}

/**
 * A towering cumulus: a cauliflower of puffs, densest along its outline, lit warm from below by
 * the city and cool from the sky above, with soft creases between puffs and glitter on top.
 */
export function cloud(
  g: Ctx,
  cx: number,
  base: number,
  W: number,
  H: number,
  rnd: () => number,
  o: { lit: string; mid: string; shade: string; crease: string; rim: string; spark: string } = {
    lit: "#ffc29a",
    mid: "#e7a1b4",
    shade: "#8c80d6",
    crease: "rgba(60,46,140,0.22)",
    rim: "#ffe3cc",
    spark: "255,236,220",
  },
) {
  type P = { x: number; y: number; r: number };
  const puffs: P[] = [];
  // silhouette: half-width as a function of height (0 base .. 1 top), lumpy
  const lumps = Array.from({ length: 7 }, () => rnd());
  const half = (t: number) => {
    const l = lumps[Math.min(6, Math.floor(t * 6.99))];
    return (W / 2) * (1 - Math.pow(t, 1.25) * 0.62) * (0.88 + l * 0.18);
  };
  // a solid body first, so the puffs never leave gaps
  g.fillStyle = vgrad(g, base - H, base, [
    [0, o.shade],
    [0.6, o.mid],
    [1, o.lit],
  ]);
  g.beginPath();
  g.moveTo(cx - half(0) * 0.92, base);
  for (let t = 0; t <= 1; t += 0.05) g.lineTo(cx - half(t) * 0.86, base - t * H * 0.94);
  for (let t = 1; t >= 0; t -= 0.05) g.lineTo(cx + half(t) * 0.86, base - t * H * 0.94);
  g.closePath();
  g.fill();
  // outline puffs (they define the cauliflower edge)
  for (let t = 0; t <= 1.0001; t += 0.06) {
    const y = base - t * H;
    const hw = half(t);
    const r = W * (0.05 + rnd() * 0.035) * (1 + t * 0.6);
    puffs.push({ x: cx - hw + r * 0.6, y, r });
    puffs.push({ x: cx + hw - r * 0.6, y: y + (rnd() - 0.5) * r * 0.4, r: r * (0.9 + rnd() * 0.3) });
  }
  // the crown: a few big heads
  for (let i = 0; i < 6; i++) {
    const hw = half(0.95);
    puffs.push({ x: cx + (rnd() - 0.5) * hw * 1.6, y: base - H * (0.9 + rnd() * 0.1), r: W * (0.08 + rnd() * 0.05) });
  }
  // interior fill
  for (let i = 0; i < 110; i++) {
    const t = rnd() ** 0.85;
    const hw = half(t) * 0.8;
    puffs.push({ x: cx + (rnd() * 2 - 1) * hw, y: base - t * H, r: W * (0.06 + rnd() * 0.06) });
  }
  puffs.sort((a, b) => a.y - b.y);
  for (const p of puffs) {
    const t = Math.min(1, Math.max(0, (base - p.y) / H));
    // crease: a soft dark ring just above each puff separates it from the one behind
    const cr = g.createRadialGradient(p.x, p.y - p.r * 0.12, p.r * 0.8, p.x, p.y - p.r * 0.12, p.r * 1.12);
    cr.addColorStop(0, o.crease);
    cr.addColorStop(1, "rgba(60,46,140,0)");
    g.fillStyle = cr;
    g.beginPath();
    g.arc(p.x, p.y - p.r * 0.12, p.r * 1.12, 0, Math.PI * 2);
    g.fill();
    // body: warm where the city light hits from below, cool lavender toward the top
    const gr = g.createRadialGradient(p.x - p.r * 0.15, p.y + p.r * 0.55, p.r * 0.05, p.x, p.y, p.r);
    gr.addColorStop(0, o.lit);
    gr.addColorStop(0.55 - t * 0.15, o.mid);
    gr.addColorStop(0.92, o.shade);
    gr.addColorStop(1, o.shade);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.strokeStyle = o.rim;
    g.globalAlpha = 0.28 + (1 - t) * 0.25;
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(p.x, p.y, p.r - 0.5, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    g.restore();
  }
  const left = cx - W / 2 - W * 0.1;
  clip(
    g,
    (c) => {
      for (const p of puffs) {
        c.moveTo(p.x + p.r, p.y);
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
    },
    () => {
      speckle(g, left, base - H * 1.15, W * 1.2, H * 1.25, 11, o.spark, 0.06, 0.85, rnd, 0.3, 1, (_u, v) => 0.3 + v * 0.7);
      speckle(g, left, base - H * 1.15, W * 1.2, H * 1.25, 5, "50,36,120", 0.05, 0.3, rnd, 0.3, 0.8, (_u, v) => 1 - v * 0.7);
    },
  );
  return puffs;
}

export type Win = { x: number; y: number; w: number; h: number; c: string };

export type TowerSpec = {
  x: number;
  base: number;
  w: number;
  h: number;
  tiers: number;
  crown: "flat" | "steps" | "spire" | "needle" | "dome" | "mast" | "fins";
  lit: [string, string]; // lit face top → bottom
  side: [string, string];
  sideW: number; // share of width in shadow (right side)
  hatch: string; // rgb for floor lines
  hatchA: number;
  rib?: string; // rgb for vertical fluting
  winRate: number;
  winColors: string[];
  winScale: number;
  speck?: string; // rgb glitter
};

/** A deco tower with setbacks, a lit face and a shadow face, hatched floors, fluting and windows. */
export function tower(g: Ctx, s: TowerSpec, rnd: () => number, out?: { lit: Win[]; slots: Win[] }) {
  const boxes: { x: number; w: number; top: number; bottom: number }[] = [];
  let x = s.x;
  let w = s.w;
  let bottom = s.base;
  const tierH = s.h / (s.tiers + 0.45);
  for (let i = 0; i < s.tiers; i++) {
    const top = i === s.tiers - 1 ? s.base - s.h : bottom - tierH * (i === 0 ? 1.45 : 1);
    boxes.push({ x, w, top, bottom });
    bottom = top;
    const inset = w * (0.1 + rnd() * 0.07);
    x += inset;
    w -= inset * 2;
  }
  for (const b of boxes) {
    const sw = b.w * s.sideW;
    const fw = b.w - sw;
    // lit face
    g.fillStyle = vgrad(g, b.top, s.base, [
      [0, s.lit[0]],
      [1, s.lit[1]],
    ]);
    g.fillRect(b.x, b.top, fw, b.bottom - b.top);
    // shadow face
    g.fillStyle = vgrad(g, b.top, s.base, [
      [0, s.side[0]],
      [1, s.side[1]],
    ]);
    g.fillRect(b.x + fw, b.top, sw, b.bottom - b.top);
    // floor hatching on both faces, slightly stronger on the lit face
    clip(
      g,
      (c) => c.rect(b.x, b.top, b.w, b.bottom - b.top),
      () => {
        hatch(g, b.x, b.top, b.w, b.bottom - b.top, 2.6, s.hatch, s.hatchA, 0, 0.5);
        if (s.speck) speckle(g, b.x, b.top, fw, b.bottom - b.top, 3, s.speck, 0.05, 0.45, rnd);
      },
    );
    // fluting
    if (s.rib) {
      const n = Math.max(2, Math.round(fw / 9));
      g.fillStyle = `rgba(${s.rib},0.22)`;
      for (let r = 1; r < n; r++) g.fillRect(b.x + (fw / n) * r, b.top + 1, 0.8, b.bottom - b.top);
    }
    // crisp edge highlight
    g.fillStyle = `rgba(${s.hatch},0.55)`;
    g.fillRect(b.x, b.top, b.w, 0.8);
    g.fillRect(b.x, b.top, 0.8, (b.bottom - b.top) * 0.6);
    // windows
    const gx = 6.5 * s.winScale;
    const gy = 8 * s.winScale;
    const cw = 2.2 * s.winScale;
    const ch = 3.4 * s.winScale;
    const cols = Math.floor((b.w - gx * 0.5) / gx);
    const rows = Math.floor((b.bottom - b.top - gy * 0.6) / gy);
    const ox = b.x + (b.w - cols * gx) / 2 + (gx - cw) / 2;
    for (let r = 0; r < rows; r++) {
      const floorOn = rnd() < 0.025;
      for (let q = 0; q < cols; q++) {
        const wx = ox + q * gx;
        const wy = b.top + gy * 0.55 + r * gy;
        if (wy + ch > s.base - 2) continue;
        const slot = { x: wx, y: wy, w: cw, h: ch, c: "" };
        out?.slots.push(slot);
        if (floorOn || rnd() < s.winRate) {
          const c = s.winColors[Math.floor(rnd() * s.winColors.length)];
          g.fillStyle = c;
          g.globalAlpha = wx > b.x + fw ? 0.65 : 1;
          g.fillRect(wx, wy, cw, ch);
          g.globalAlpha = 1;
          out?.lit.push({ ...slot, c });
        }
      }
    }
  }
  // crown
  const t = boxes[boxes.length - 1];
  const cx = t.x + t.w / 2;
  const top = t.top;
  const fw = t.w * (1 - s.sideW);
  g.fillStyle = s.lit[0];
  switch (s.crown) {
    case "steps": {
      let sw = t.w * 0.76;
      let y = top;
      for (let i = 0; i < 3; i++) {
        const sh = t.w * 0.12;
        g.fillStyle = s.lit[0];
        g.fillRect(cx - sw / 2, y - sh, sw * (1 - s.sideW), sh);
        g.fillStyle = s.side[0];
        g.fillRect(cx - sw / 2 + sw * (1 - s.sideW), y - sh, sw * s.sideW, sh);
        g.fillStyle = `rgba(${s.hatch},0.6)`;
        g.fillRect(cx - sw / 2, y - sh, sw, 0.7);
        y -= sh;
        sw *= 0.66;
      }
      g.fillStyle = s.lit[0];
      g.fillRect(cx - 0.6, y - t.w * 0.55, 1.2, t.w * 0.55);
      break;
    }
    case "spire":
    case "needle": {
      const bw = s.crown === "needle" ? t.w * 0.16 : t.w * 0.34;
      const sh = s.crown === "needle" ? t.w * 2.2 : t.w * 1.15;
      g.fillStyle = s.lit[0];
      g.beginPath();
      g.moveTo(cx - bw, top);
      g.lineTo(cx, top - sh);
      g.lineTo(cx, top);
      g.closePath();
      g.fill();
      g.fillStyle = s.side[0];
      g.beginPath();
      g.moveTo(cx, top - sh);
      g.lineTo(cx + bw, top);
      g.lineTo(cx, top);
      g.closePath();
      g.fill();
      break;
    }
    case "dome": {
      const r = t.w * 0.4;
      g.fillStyle = lgrad(g, cx - r, top - r, cx + r, top, [
        [0, s.lit[0]],
        [0.6, s.lit[1]],
        [1, s.side[0]],
      ]);
      g.beginPath();
      g.ellipse(cx, top, r, r * 0.85, 0, Math.PI, 0);
      g.fill();
      g.fillRect(cx - 0.6, top - r * 1.55, 1.2, r * 0.75);
      break;
    }
    case "mast": {
      g.fillRect(cx - t.w * 0.14, top - t.w * 0.36, t.w * 0.28 * (1 - s.sideW), t.w * 0.36);
      g.fillStyle = s.side[0];
      g.fillRect(cx - t.w * 0.14 + t.w * 0.28 * (1 - s.sideW), top - t.w * 0.36, t.w * 0.28 * s.sideW, t.w * 0.36);
      g.fillStyle = s.lit[0];
      g.fillRect(cx - 0.7, top - t.w * 1.7, 1.4, t.w * 1.4);
      break;
    }
    case "fins": {
      for (let i = -2; i <= 2; i++) {
        const fh = t.w * (0.85 - Math.abs(i) * 0.22);
        g.fillStyle = i > 0 ? s.side[0] : s.lit[0];
        g.fillRect(cx + i * t.w * 0.15 - t.w * 0.035, top - fh, t.w * 0.07, fh);
      }
      break;
    }
    default:
      void fw;
      break;
  }
  return { boxes, top: s.base - s.h, cx };
}

/** A tiny standing figure, seen from behind, with a long moon shadow across the roof. */
export function figure(g: Ctx, x: number, y: number, s: number, color = "#0c0b24", shadow = "rgba(8,8,30,0.55)", shadowDir = 1) {
  g.save();
  g.fillStyle = shadow;
  g.beginPath();
  g.moveTo(x - 1.6 * s, y);
  g.lineTo(x + shadowDir * 22 * s, y + 2.2 * s);
  g.lineTo(x + shadowDir * 22 * s, y + 3.4 * s);
  g.lineTo(x + 1.6 * s, y + 0.6 * s);
  g.closePath();
  g.fill();
  g.fillStyle = color;
  // legs
  g.fillRect(x - 1.3 * s, y - 5 * s, 1.1 * s, 5 * s);
  g.fillRect(x + 0.2 * s, y - 5 * s, 1.1 * s, 5 * s);
  // coat
  g.beginPath();
  g.moveTo(x - 2.2 * s, y - 4.5 * s);
  g.lineTo(x - 1.7 * s, y - 11 * s);
  g.quadraticCurveTo(x, y - 12 * s, x + 1.7 * s, y - 11 * s);
  g.lineTo(x + 2.3 * s, y - 4.5 * s);
  g.closePath();
  g.fill();
  // head
  g.beginPath();
  g.arc(x, y - 13.2 * s, 1.55 * s, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function waterTower(g: Ctx, x: number, base: number, s: number, lit: string, shade: string, line: string) {
  // legs
  g.strokeStyle = shade;
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.moveTo(x - 6 * s, base);
  g.lineTo(x - 4.5 * s, base - 9 * s);
  g.moveTo(x + 6 * s, base);
  g.lineTo(x + 4.5 * s, base - 9 * s);
  g.moveTo(x - 5.5 * s, base - 3 * s);
  g.lineTo(x + 5.5 * s, base - 6.5 * s);
  g.moveTo(x + 5.5 * s, base - 3 * s);
  g.lineTo(x - 5.5 * s, base - 6.5 * s);
  g.stroke();
  // tank
  g.fillStyle = lgrad(g, x - 6 * s, 0, x + 6 * s, 0, [
    [0, lit],
    [0.55, lit],
    [0.56, shade],
    [1, shade],
  ]);
  g.fillRect(x - 6 * s, base - 19 * s, 12 * s, 10 * s);
  g.beginPath();
  g.moveTo(x - 6.6 * s, base - 19 * s);
  g.lineTo(x, base - 24 * s);
  g.lineTo(x + 6.6 * s, base - 19 * s);
  g.closePath();
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(x - 6 * s, base - 9 * s - i * 2.5 * s);
    g.lineTo(x + 6 * s, base - 9 * s - i * 2.5 * s);
    g.stroke();
  }
}

/**
 * The plate's lower edge dissolves into the page in a field of dots (an ordered dither),
 * like the friend's site does, instead of a blurry gradient.
 */
export function dissolve(w: number, h: number, dpr: number, color = PAGE, seed = 5) {
  const [c, g] = layer(w, h, dpr);
  const r = rng(seed);
  g.fillStyle = vgrad(g, 0, h, [
    [0, "rgba(0,0,0,0)"],
    [0.45, "rgba(0,0,0,0)"],
    [1, color],
  ]);
  g.fillRect(0, 0, w, h);
  const cell = 1.4;
  g.fillStyle = color;
  const rows = Math.ceil(h / cell);
  const cols = Math.ceil(w / cell);
  for (let j = 0; j < rows; j++) {
    const t = Math.pow(j / rows, 1.5);
    for (let i = 0; i < cols; i++) if (r() < t) g.fillRect(i * cell, j * cell, cell, cell);
  }
  return c;
}

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
  rgb = "200,205,240",
) {
  ctx.save();
  ctx.strokeStyle = `rgba(${rgb},${alpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const d of drops) {
    d.y += (dt / 1000) * d.v * 1.2;
    d.x += (dt / 1000) * d.v * 0.1;
    if (d.y > 1.05) {
      d.y = -0.05;
      d.x = Math.random();
    }
    const x = (d.x % 1) * w;
    const y = d.y * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + d.l * 0.12, y + d.l);
  }
  ctx.stroke();
  ctx.restore();
}

/** Warm glow on the windows nearest the cursor. `mask` holds every window slot in white. */
export function cursorWindows(
  ctx: Ctx,
  buf: [HTMLCanvasElement, Ctx],
  mask: HTMLCanvasElement,
  mx: number,
  my: number,
  ox: number,
  oy: number,
  w: number,
  h: number,
  mw: number,
  mh: number,
) {
  const [bc, bg] = buf;
  bg.globalCompositeOperation = "source-over";
  bg.clearRect(0, 0, w, h);
  const gr = bg.createRadialGradient(mx, my, 0, mx, my, 120);
  gr.addColorStop(0, "rgba(255,214,140,1)");
  gr.addColorStop(0.5, "rgba(255,180,90,0.5)");
  gr.addColorStop(1, "rgba(255,180,90,0)");
  bg.fillStyle = gr;
  bg.fillRect(mx - 125, my - 125, 250, 250);
  bg.globalCompositeOperation = "destination-in";
  bg.drawImage(mask, ox, oy, mw, mh);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(bc, 0, 0, w, h);
  ctx.restore();
}

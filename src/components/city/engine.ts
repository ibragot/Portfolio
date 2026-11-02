/**
 * Night-city renderer.
 *
 * The city is a real (tiny) 3D world: boxes on a grid, viewed by a camera that
 * floats above a central avenue. Buildings are projected with one-point
 * perspective and baked into three depth layers (far / mid / near). Every frame
 * we paint the sky, then composite the baked layers with parallax offsets and
 * draw the live bits on top: searchlights, drifting clouds, traffic, twinkling
 * windows, aircraft beacons.
 */

import { createRng, type Rng } from "@/lib/skyline";

/* ------------------------------------------------------------------ colour */

type RGB = [number, number, number];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const SKY = {
  top: hex("#0f2a34"),
  upper: hex("#1c4c5a"),
  mid: hex("#2f6e78"),
  horizon: hex("#6aa5a2"),
  ground: hex("#223b47"),
};
const FOG = hex("#5d9799");
const LIT: RGB[] = [hex("#ffd36b"), hex("#ffe29b"), hex("#ffc65a"), hex("#fff0c2")];
const LIT_COOL = hex("#c8f0e6");

type StyleName = "lavender" | "slate" | "warm" | "white";
type Style = {
  top: RGB;
  bottom: RGB;
  side: RGB;
  roof: RGB;
  unlit: RGB;
  lit: number;
  colW: number;
  winW: number;
  floorH: number;
  winH: number;
};

const STYLES: Record<StyleName, Style> = {
  lavender: {
    top: hex("#aeabc8"), bottom: hex("#716e96"), side: hex("#57547c"), roof: hex("#97bcbb"),
    unlit: hex("#4c4970"), lit: 0.42, colW: 11, winW: 5.5, floorH: 13, winH: 7.5,
  },
  slate: {
    top: hex("#95a1b6"), bottom: hex("#5d6884"), side: hex("#47516b"), roof: hex("#8db0b4"),
    unlit: hex("#3e4763"), lit: 0.38, colW: 10, winW: 5, floorH: 12, winH: 7,
  },
  warm: {
    top: hex("#f4b86a"), bottom: hex("#7b5793"), side: hex("#56406f"), roof: hex("#d0a77c"),
    unlit: hex("#5d4776"), lit: 0.72, colW: 7, winW: 3, floorH: 12, winH: 9,
  },
  white: {
    top: hex("#e6ebf0"), bottom: hex("#a2afc2"), side: hex("#7a89a0"), roof: hex("#c6d6d8"),
    unlit: hex("#7f8ea6"), lit: 0.5, colW: 9, winW: 5, floorH: 11, winH: 6,
  },
};

/* ------------------------------------------------------------------- world */

type Seg = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; windows: boolean };

type Building = {
  id: number;
  segs: Seg[];
  style: StyleName;
  height: number;
  layer: 0 | 1 | 2;
  z: number;
  on: boolean;
  antenna?: { x: number; z: number; y0: number; y1: number };
  /** Layer-space bounding box from the last bake, used for hit testing. */
  box?: { x0: number; y0: number; x1: number; y1: number };
};

const AVENUE = 36; // half-width of the avenue the camera looks down
const CAM_Y = 280;

/** Cheap deterministic hash → [0, 1). Keeps window patterns stable across re-bakes. */
function hash(a: number, b: number, c: number) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function layerFor(z: number): 0 | 1 | 2 {
  return z < 720 ? 2 : z < 1500 ? 1 : 0;
}

function generateCity(rng: Rng): Building[] {
  const out: Building[] = [];
  let id = 1;

  for (let z = 250; z < 4600; ) {
    const rowDepth = 55 + rng() * 55;
    const far = z > 3200;
    const extent = 260 + z * 1.05;

    for (const side of [-1, 1]) {
      let x = AVENUE + rng() * 8;
      while (x < extent) {
        const w = 42 + rng() * 78;
        const d = rowDepth * (0.75 + rng() * 0.25);
        const dz = rng() * (rowDepth - d);
        const near = z < 720;

        let h = near ? 45 + rng() * 120 : 60 + rng() * 210;
        let style: StyleName = rng() < 0.55 ? "lavender" : "slate";
        const tower = !near && z > 1300 && z < 3000 && x < 800 && (side > 0 || z > 2300) && rng() < 0.1;
        if (tower) {
          h = 300 + rng() * 330;
          style = rng() < 0.6 ? "warm" : "white";
        } else if (!near && rng() < 0.12) {
          style = "white";
          h *= 1.3;
        }

        const x0 = side > 0 ? x : -(x + w);
        const x1 = side > 0 ? x + w : -x;
        const z0 = z + dz;
        const z1 = z0 + d;
        const segs: Seg[] = [];

        if (tower) {
          // Stepped art-deco crown
          const tiers = 2 + Math.floor(rng() * 3);
          let bottom = 0;
          let inset = 0;
          for (let t = 0; t < tiers; t++) {
            const top = t === tiers - 1 ? h : bottom + (h - bottom) * (0.55 + rng() * 0.2);
            segs.push({ x0: x0 + inset, x1: x1 - inset, z0: z0 + inset, z1: z1 - inset, y0: bottom, y1: top, windows: true });
            bottom = top;
            inset += Math.min(w, d) * 0.12;
          }
        } else {
          segs.push({ x0, x1, z0, z1, y0: 0, y1: h, windows: !far });
          // Rooftop clutter: AC units, stair housings, little water tanks
          if (!far && rng() < 0.55) {
            const uw = 8 + rng() * 16;
            const ux = x0 + 4 + rng() * Math.max(1, x1 - x0 - uw - 8);
            const uz = z0 + 4 + rng() * Math.max(1, d - 20);
            segs.push({ x0: ux, x1: ux + uw, z0: uz, z1: uz + 8 + rng() * 8, y0: h, y1: h + 6 + rng() * 12, windows: false });
          }
        }

        const top = segs[segs.length - 1];
        out.push({
          id: id++,
          segs,
          style,
          height: h,
          layer: layerFor(z0),
          z: z0,
          on: true,
          antenna: tower
            ? { x: (top.x0 + top.x1) / 2, z: (top.z0 + top.z1) / 2, y0: h, y1: h + 40 + rng() * 90 }
            : undefined,
        });

        x += w + (rng() < 0.18 ? 18 + rng() * 26 : 3 + rng() * 6);
      }
    }
    z += rowDepth + 26 + rng() * 22;
  }

  // Painter's order: far to near, and outside-in within a row
  out.sort((a, b) => b.z - a.z || Math.abs(b.segs[0].x0 + b.segs[0].x1) - Math.abs(a.segs[0].x0 + a.segs[0].x1));
  return out;
}

/* ------------------------------------------------------------------ render */

type View = { W: number; H: number; pad: number; cx: number; hy: number; f: number };

type Twinkle = { x: number; y: number; w: number; h: number; on: string; off: string; period: number; phase: number; b: Building };
type Beacon = { x: number; y: number; r: number; phase: number };

type Cloud = { img: HTMLCanvasElement; x: number; y: number; speed: number; depth: number };
type Star = { x: number; y: number; r: number; a: number; speed: number; phase: number };
type Ring = { x: number; y: number; layer: number; t0: number };

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** How far each layer drifts with the pointer (px) and with scrolling (fraction). */
const PARALLAX = [
  { x: 8, y: 4, scroll: 0.32 },
  { x: 18, y: 7, scroll: 0.18 },
  { x: 34, y: 12, scroll: 0.04 },
];

export class CityRenderer {
  private ctx: CanvasRenderingContext2D;
  private buildings: Building[];
  private layers: HTMLCanvasElement[] = [];
  private twinkles: Twinkle[][] = [[], [], []];
  private beacons: Beacon[][] = [[], [], []];
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private moon?: HTMLCanvasElement;
  private skyGradient?: CanvasGradient;
  private view: View = { W: 0, H: 0, pad: 60, cx: 0, hy: 0, f: 1 };
  private dpr = 1;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private scroll = 0;
  private raf = 0;
  private t0 = performance.now();
  private running = false;
  private visible = true;
  private dirty = new Set<number>();
  private lastBake = 0;
  private pending: { at: number; b: Building; on: boolean }[] = [];
  private rings: Ring[] = [];
  private shooting?: { x: number; y: number; vx: number; vy: number; t0: number };
  private nextShooting = 4000;
  private cleanup: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: { reducedMotion: boolean },
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.buildings = generateCity(createRng(2024));
    if (opts.reducedMotion) this.t0 -= 10_000; // skip the intro
  }

  /* ------------------------------------------------------------ lifecycle */

  start() {
    const parent = this.canvas.parentElement!;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(parent);
    this.cleanup.push(() => ro.disconnect());

    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.loop();
    });
    io.observe(this.canvas);
    this.cleanup.push(() => io.disconnect());

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      this.canvas.style.cursor = this.hit(e) ? "pointer" : "";
    };
    const onScroll = () => {
      this.scroll = window.scrollY;
      if (this.opts.reducedMotion) this.draw(performance.now());
    };
    const onClick = (e: MouseEvent) => {
      const b = this.hit(e);
      if (b) this.toggle(b, e);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    this.canvas.addEventListener("click", onClick);
    this.cleanup.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      this.canvas.removeEventListener("click", onClick);
    });

    this.resize();
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.cleanup.forEach((fn) => fn());
  }

  private loop = () => {
    if (this.running || !this.visible) return;
    this.running = true;
    const tick = (now: number) => {
      if (!this.visible) {
        this.running = false;
        return;
      }
      this.draw(now);
      if (this.opts.reducedMotion && this.pending.length === 0 && this.rings.length === 0) {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  /* -------------------------------------------------------------- layout */

  private resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect.width));
    const H = Math.max(1, Math.round(rect.height));
    if (W === this.view.W && H === this.view.H) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = W * this.dpr;
    this.canvas.height = H * this.dpr;

    const portrait = W / H < 0.85;
    this.view = {
      W,
      H,
      pad: 60,
      cx: portrait ? W * 0.5 : W * 0.64,
      hy: portrait ? H * 0.3 : H * 0.42,
      f: portrait ? H * 1.1 : Math.max(W * 0.82, H * 1.3),
    };

    this.buildSky();
    this.bakeAll();
    if (!this.running) this.draw(performance.now());
  }

  private buildSky() {
    const { W, H, hy } = this.view;
    const g = this.ctx.createLinearGradient(0, 0, 0, H);
    const h = hy / H;
    g.addColorStop(0, rgba(SKY.top));
    g.addColorStop(h * 0.45, rgba(SKY.upper));
    g.addColorStop(h * 0.85, rgba(SKY.mid));
    g.addColorStop(Math.min(0.99, h + 0.06), rgba(SKY.horizon));
    g.addColorStop(1, rgba(SKY.ground));
    this.skyGradient = g;

    const rng = createRng(9);
    this.stars = Array.from({ length: Math.round((W * hy) / 5500) }, () => ({
      x: rng() * W,
      y: rng() * hy * 0.95,
      r: 0.4 + rng() * 1.1,
      a: 0.25 + rng() * 0.6,
      speed: 0.6 + rng() * 2.2,
      phase: rng() * Math.PI * 2,
    }));

    // Moon sprite: glow, disc, soft maria, and speckle
    const r = Math.min(W, H) * 0.06 + 14;
    const size = Math.ceil(r * 6);
    const moon = document.createElement("canvas");
    moon.width = moon.height = size * this.dpr;
    const m = moon.getContext("2d")!;
    m.scale(this.dpr, this.dpr);
    const c = size / 2;
    const glow = m.createRadialGradient(c, c, r * 0.8, c, c, size / 2);
    glow.addColorStop(0, "rgba(220,245,238,0.45)");
    glow.addColorStop(0.4, "rgba(170,220,214,0.14)");
    glow.addColorStop(1, "rgba(170,220,214,0)");
    m.fillStyle = glow;
    m.fillRect(0, 0, size, size);
    const disc = m.createRadialGradient(c - r * 0.35, c - r * 0.35, r * 0.1, c, c, r);
    disc.addColorStop(0, "#fbfdf8");
    disc.addColorStop(0.7, "#e4f1ec");
    disc.addColorStop(1, "#c4dcd6");
    m.fillStyle = disc;
    m.beginPath();
    m.arc(c, c, r, 0, Math.PI * 2);
    m.fill();
    m.fillStyle = "rgba(150,185,180,0.28)";
    for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.2, 0.3], [0.05, -0.5, 0.12], [-0.45, 0.35, 0.14]]) {
      m.beginPath();
      m.arc(c + dx * r, c + dy * r, rr * r, 0, Math.PI * 2);
      m.fill();
    }
    this.moon = moon;

    // Puffy clouds, lit from the moon's side
    const cloudRng = createRng(31);
    const specs = [
      { y: 0.07, w: 0.34, speed: 5, depth: 0.3 },
      { y: 0.2, w: 0.22, speed: 8, depth: 0.5 },
      { y: 0.13, w: 0.18, speed: 11, depth: 0.7 },
      { y: 0.29, w: 0.26, speed: 6, depth: 0.45 },
      { y: 0.04, w: 0.2, speed: 9, depth: 0.6 },
    ];
    this.clouds = specs.map((s, i) => ({
      img: makeCloud(cloudRng, Math.max(160, W * s.w), this.dpr),
      x: ((i * 0.27 + 0.1) % 1) * W,
      y: hy * s.y * 2.1,
      speed: s.speed,
      depth: s.depth,
    }));
  }

  /* ---------------------------------------------------------------- bake */

  private bakeAll() {
    for (const l of [0, 1, 2]) this.bake(l);
  }

  private bake(layer: number) {
    const v = this.view;
    const LW = v.W + v.pad * 2;
    const LH = v.H + v.pad * 2;
    let canvas = this.layers[layer];
    if (!canvas) canvas = this.layers[layer] = document.createElement("canvas");
    canvas.width = LW * this.dpr;
    canvas.height = LH * this.dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, LW, LH);

    const P = (X: number, Y: number, Z: number): [number, number] => [
      v.pad + v.cx + (X * v.f) / Z,
      v.pad + v.hy + ((CAM_Y - Y) * v.f) / Z,
    ];

    this.twinkles[layer] = [];
    this.beacons[layer] = [];

    if (layer === 0) {
      // Ground beyond the city, then a far haze line
      ctx.fillStyle = rgba(mix(SKY.ground, FOG, 0.35));
      ctx.fillRect(0, v.pad + v.hy + 6, LW, LH);
    }

    for (const b of this.buildings) {
      if (b.layer !== layer) continue;
      this.drawBuilding(ctx, b, P, LW, LH);
    }

    // Atmospheric haze sitting on the horizon
    if (layer === 0 || layer === 1) {
      const top = v.pad + v.hy - v.H * (layer === 0 ? 0.25 : 0.12);
      const bottom = v.pad + v.hy + v.H * (layer === 0 ? 0.2 : 0.3);
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, rgba(FOG, 0));
      g.addColorStop(0.65, rgba(FOG, layer === 0 ? 0.55 : 0.28));
      g.addColorStop(1, rgba(FOG, 0));
      ctx.fillStyle = g;
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillRect(0, top, LW, bottom - top);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  private drawBuilding(
    ctx: CanvasRenderingContext2D,
    b: Building,
    P: (X: number, Y: number, Z: number) => [number, number],
    LW: number,
    LH: number,
  ) {
    const v = this.view;
    const st = STYLES[b.style];
    const fogT = Math.pow(Math.min(1, Math.max(0, (b.z - 260) / 2900)), 0.8) * 0.86;
    const fog = (c: RGB) => mix(c, FOG, fogT);

    // Cull off-screen buildings
    const base = b.segs[0];
    const xs = [P(base.x0, 0, base.z0)[0], P(base.x0, 0, base.z1)[0], P(base.x1, 0, base.z0)[0], P(base.x1, 0, base.z1)[0]];
    const bx0 = Math.min(...xs);
    const bx1 = Math.max(...xs);
    const topY = b.antenna ? b.antenna.y1 : b.height + 20;
    const by0 = Math.min(P(0, topY, base.z0)[1], P(0, topY, base.z1)[1]);
    const by1 = P(0, 0, base.z0)[1];
    if (bx1 < 0 || bx0 > LW || by0 > LH) {
      b.box = undefined;
      return;
    }
    b.box = { x0: bx0, y0: by0, x1: bx1, y1: Math.min(by1, LH) };

    for (const s of b.segs) {
      const { x0, x1, z0, z1, y0, y1 } = s;
      const isUnit = !s.windows && y0 > 0;

      // Side face (the one facing the avenue)
      if (x1 < 0 || x0 > 0) {
        const sx = x1 < 0 ? x1 : x0;
        const quad = [P(sx, y0, z0), P(sx, y1, z0), P(sx, y1, z1), P(sx, y0, z1)];
        fillPoly(ctx, quad, rgba(fog(st.side)));
        if (s.windows) this.sideWindows(ctx, b, s, sx, P, st, fog);
      }

      // Roof
      if (CAM_Y > y1) {
        const roof = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
        fillPoly(ctx, roof, rgba(fog(isUnit ? mix(st.roof, st.side, 0.4) : st.roof)));
        const [ax, ay] = roof[0];
        const [bx] = roof[1];
        ctx.fillStyle = rgba(fog(mix(st.roof, [255, 255, 255], 0.35)), 0.8);
        ctx.fillRect(ax, ay - 0.5, bx - ax, Math.max(1, v.f / z0 * 0.8));
      }

      // Front face, shaded top to bottom across the whole building height
      const [fx0, fyTop] = P(x0, y1, z0);
      const [fx1, fyBot] = P(x1, y0, z0);
      if (fyTop < LH) {
        const tTop = 1 - y1 / Math.max(b.height, 1);
        const tBot = 1 - y0 / Math.max(b.height, 1);
        const g = ctx.createLinearGradient(0, fyTop, 0, fyBot);
        g.addColorStop(0, rgba(fog(mix(st.top, st.bottom, Math.min(1, tTop)))));
        g.addColorStop(1, rgba(fog(mix(st.top, st.bottom, Math.min(1, tBot)))));
        ctx.fillStyle = isUnit ? rgba(fog(mix(st.side, st.top, 0.5))) : g;
        ctx.fillRect(fx0, fyTop, fx1 - fx0, Math.min(fyBot, LH) - fyTop);
        if (s.windows) this.frontWindows(ctx, b, s, P, st, fog, LH);
      }
    }

    if (b.antenna) {
      const { x, z, y0, y1 } = b.antenna;
      const [ax, ay0] = P(x, y0, z);
      const [, ay1] = P(x, y1, z);
      ctx.strokeStyle = rgba(fog(st.side));
      ctx.lineWidth = Math.max(1, (v.f / z) * 2.2);
      ctx.beginPath();
      ctx.moveTo(ax, ay0);
      ctx.lineTo(ax, ay1);
      ctx.stroke();
      this.beacons[b.layer].push({ x: ax, y: ay1, r: Math.max(1.6, (v.f / z) * 3.2), phase: (b.id % 7) / 7 });
    }
  }

  private frontWindows(
    ctx: CanvasRenderingContext2D,
    b: Building,
    s: Seg,
    P: (X: number, Y: number, Z: number) => [number, number],
    st: Style,
    fog: (c: RGB) => RGB,
    LH: number,
  ) {
    const scale = this.view.f / s.z0;
    const ww = st.winW * scale;
    const wh = st.winH * scale;
    if (ww < 1) return;

    const span = s.x1 - s.x0;
    const cols = Math.floor((span - 6) / st.colW);
    if (cols < 1) return;
    const startX = s.x0 + (span - cols * st.colW) / 2 + (st.colW - st.winW) / 2;

    const unlit = rgba(fog(st.unlit), 0.75);
    const lit = LIT.map((c) => rgba(fog(c)));
    const cool = rgba(fog(LIT_COOL));
    const buckets: number[][] = [[], [], [], [], [], []]; // unlit, 4 warm, cool

    let floor = 0;
    for (let Y = s.y0 + 7; Y + st.winH < s.y1 - 4; Y += st.floorH, floor++) {
      const [, sy] = P(0, Y + st.winH, s.z0);
      if (sy > LH) continue;
      for (let c = 0; c < cols; c++) {
        const [sx] = P(startX + c * st.colW, 0, s.z0);
        const r = hash(b.id, floor, c);
        const isLit = b.on && r < st.lit;
        let bucket = 0;
        if (isLit) {
          const pick = hash(b.id + 7, floor, c);
          bucket = pick < 0.12 ? 5 : 1 + Math.floor(pick * 4);
        }
        buckets[bucket].push(sx, sy, ww, wh);

        if (b.layer > 0 && hash(b.id + 13, floor, c) < 0.006) {
          this.twinkles[b.layer].push({
            x: sx, y: sy, w: ww, h: wh,
            on: lit[1], off: unlit,
            period: 2.5 + hash(b.id, c, floor) * 7,
            phase: hash(c, b.id, floor) * 10,
            b,
          });
        }
      }
    }

    const styles = [unlit, ...lit, cool];
    buckets.forEach((rects, i) => {
      if (!rects.length) return;
      ctx.fillStyle = styles[i];
      for (let k = 0; k < rects.length; k += 4) ctx.fillRect(rects[k], rects[k + 1], rects[k + 2], rects[k + 3]);
    });
  }

  private sideWindows(
    ctx: CanvasRenderingContext2D,
    b: Building,
    s: Seg,
    sx: number,
    P: (X: number, Y: number, Z: number) => [number, number],
    st: Style,
    fog: (c: RGB) => RGB,
  ) {
    if ((this.view.f / s.z1) * st.winW < 1.2) return;
    const depth = s.z1 - s.z0;
    const cols = Math.floor((depth - 6) / st.colW);
    if (cols < 1) return;

    const litPath = new Path2D();
    const darkPath = new Path2D();
    let floor = 0;
    for (let Y = s.y0 + 7; Y + st.winH < s.y1 - 4; Y += st.floorH, floor++) {
      for (let c = 0; c < cols; c++) {
        const za = s.z0 + 4 + c * st.colW;
        const zb = za + st.winW;
        const q = [P(sx, Y, za), P(sx, Y + st.winH, za), P(sx, Y + st.winH, zb), P(sx, Y, zb)];
        const path = b.on && hash(b.id + 3, floor, c) < st.lit * 0.85 ? litPath : darkPath;
        path.moveTo(q[0][0], q[0][1]);
        for (let k = 1; k < 4; k++) path.lineTo(q[k][0], q[k][1]);
        path.closePath();
      }
    }
    ctx.fillStyle = rgba(fog(mix(st.unlit, st.side, 0.3)), 0.8);
    ctx.fill(darkPath);
    ctx.fillStyle = rgba(fog(mix(LIT[0], st.side, 0.18)));
    ctx.fill(litPath);
  }

  /* --------------------------------------------------------- interaction */

  private offsets(now: number) {
    const intro = this.opts.reducedMotion ? 1 : (now - this.t0) / 1800;
    return PARALLAX.map((p, i) => {
      const t = ease(intro * 1.3 - i * 0.18);
      return {
        x: -this.pointer.x * p.x,
        y: -this.pointer.y * p.y + this.scroll * p.scroll + (1 - t) * (60 + i * 50),
        alpha: t,
      };
    });
  }

  private hit(e: MouseEvent): Building | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const off = this.offsets(performance.now());
    const pad = this.view.pad;
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (!b.box || b.layer === 0) continue;
      const lx = x - off[b.layer].x + pad;
      const ly = y - off[b.layer].y + pad;
      if (lx >= b.box.x0 && lx <= b.box.x1 && ly >= b.box.y0 && ly <= b.box.y1) return b;
    }
  }

  private toggle(b: Building, e: MouseEvent) {
    b.on = !b.on;
    this.dirty.add(b.layer);
    const rect = this.canvas.getBoundingClientRect();
    this.rings.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, layer: b.layer, t0: performance.now() });
    this.loop();
  }

  /** Switch every light in the city, rolling outward from the avenue. */
  setAllLights(on: boolean) {
    const now = performance.now();
    const rng = createRng(on ? 5 : 6);
    this.pending = this.buildings
      .filter((b) => b.on !== on)
      .map((b) => ({ at: now + Math.abs(b.segs[0].x0 + b.segs[0].x1) * 0.35 + b.z * 0.12 + rng() * 260, b, on }));
    this.loop();
  }

  /* ---------------------------------------------------------------- draw */

  private draw(now: number) {
    const { ctx, view: v } = this;
    const t = (now - this.t0) / 1000;
    const motion = !this.opts.reducedMotion;

    // Ease the pointer for a floaty parallax
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;

    // Apply scheduled light switches, re-baking at most ~12 times a second
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= now);
      if (due.length) {
        this.pending = this.pending.filter((p) => p.at > now);
        for (const p of due) {
          p.b.on = p.on;
          this.dirty.add(p.b.layer);
        }
      }
    }
    if (this.dirty.size && (now - this.lastBake > 80 || !this.pending.length)) {
      this.dirty.forEach((l) => this.bake(l));
      this.dirty.clear();
      this.lastBake = now;
    }

    const off = this.offsets(now);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Sky
    ctx.fillStyle = this.skyGradient!;
    ctx.fillRect(0, 0, v.W, v.H);
    const skyX = -this.pointer.x * 4;
    const skyY = this.scroll * 0.45;

    for (const s of this.stars) {
      ctx.globalAlpha = s.a * (motion ? 0.55 + 0.45 * Math.sin(t * s.speed + s.phase) : 0.8);
      ctx.fillStyle = "#eaf6f1";
      ctx.fillRect(s.x + skyX, s.y + skyY, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Moon
    const portrait = v.W / v.H < 0.85;
    const moonX = (portrait ? v.W * 0.76 : v.W * 0.84) + skyX * 1.5;
    const moonY = (portrait ? v.H * 0.12 : v.H * 0.17) + skyY;
    if (this.moon) {
      const size = this.moon.width / this.dpr;
      const pulse = motion ? 1 + Math.sin(t * 0.8) * 0.02 : 1;
      ctx.drawImage(this.moon, moonX - (size * pulse) / 2, moonY - (size * pulse) / 2, size * pulse, size * pulse);
    }

    // Shooting star, every so often
    if (motion) this.drawShootingStar(now);

    // Clouds behind the city
    for (const c of this.clouds) {
      const w = c.img.width / this.dpr;
      const h = c.img.height / this.dpr;
      const span = v.W + w;
      const x = motion ? ((((c.x + t * c.speed) % span) + span) % span) - w : c.x;
      ctx.drawImage(c.img, x - this.pointer.x * 10 * c.depth, c.y + skyY - h / 2, w, h);
    }

    // Plane crossing with blinking lights
    if (motion) this.drawPlane(t);

    // Far city
    this.drawLayer(0, off[0]);

    // Searchlights sweep up from behind the mid city
    this.drawBeams(t, off[0], motion);

    this.drawLayer(1, off[1]);
    this.drawTraffic(t, off, motion);
    this.drawLayer(2, off[2]);

    // Live window flicker and aircraft beacons
    if (motion) {
      for (const l of [1, 2]) {
        const o = off[l];
        ctx.globalAlpha = o.alpha;
        for (const tw of this.twinkles[l]) {
          if (!tw.b.on) continue;
          const phase = ((t + tw.phase) % tw.period) / tw.period;
          if (phase > 0.82) {
            ctx.fillStyle = tw.off;
            ctx.fillRect(tw.x + o.x - v.pad, tw.y + o.y - v.pad, tw.w, tw.h);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    for (const l of [0, 1, 2]) {
      const o = off[l];
      for (const bc of this.beacons[l]) {
        const blink = motion ? Math.max(0, Math.sin((t * 1.4 + bc.phase) * Math.PI * 2)) : 0.8;
        ctx.globalAlpha = o.alpha * blink;
        const g = ctx.createRadialGradient(bc.x + o.x - v.pad, bc.y + o.y - v.pad, 0, bc.x + o.x - v.pad, bc.y + o.y - v.pad, bc.r * 4);
        g.addColorStop(0, "rgba(255,90,80,1)");
        g.addColorStop(0.3, "rgba(255,90,80,0.5)");
        g.addColorStop(1, "rgba(255,90,80,0)");
        ctx.fillStyle = g;
        ctx.fillRect(bc.x + o.x - v.pad - bc.r * 4, bc.y + o.y - v.pad - bc.r * 4, bc.r * 8, bc.r * 8);
      }
    }
    ctx.globalAlpha = 1;

    // Click ripples
    this.rings = this.rings.filter((r) => now - r.t0 < 700);
    for (const r of this.rings) {
      const p = (now - r.t0) / 700;
      ctx.strokeStyle = `rgba(255,220,140,${(1 - p) * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8 + ease(p) * 46, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawLayer(i: number, o: { x: number; y: number; alpha: number }) {
    const layer = this.layers[i];
    if (!layer) return;
    const v = this.view;
    this.ctx.globalAlpha = o.alpha;
    this.ctx.drawImage(layer, o.x - v.pad, o.y - v.pad, v.W + v.pad * 2, v.H + v.pad * 2);
    this.ctx.globalAlpha = 1;
  }

  private project(X: number, Y: number, Z: number): [number, number] {
    const v = this.view;
    return [v.cx + (X * v.f) / Z, v.hy + ((CAM_Y - Y) * v.f) / Z];
  }

  private drawBeams(t: number, o: { x: number; y: number; alpha: number }, motion: boolean) {
    const { ctx, view: v } = this;
    const sources = [
      { X: -560, Z: 1900, base: -0.5, amp: 0.32, speed: 0.17 },
      { X: 420, Z: 1650, base: 0.35, amp: 0.38, speed: 0.13 },
      { X: 980, Z: 2500, base: 0.62, amp: 0.25, speed: 0.21 },
      { X: -180, Z: 2700, base: -0.15, amp: 0.3, speed: 0.11 },
    ];
    const len = v.H * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = o.alpha;
    for (const [i, s] of sources.entries()) {
      const [bx, by] = this.project(s.X, 0, s.Z);
      const x = bx + o.x;
      const y = by + o.y;
      const a = s.base + (motion ? Math.sin(t * s.speed * Math.PI * 2 * 0.25 + i * 1.7) * s.amp : 0);
      const spread = 0.045;
      const ex1 = x + Math.sin(a - spread) * len;
      const ey1 = y - Math.cos(a - spread) * len;
      const ex2 = x + Math.sin(a + spread) * len;
      const ey2 = y - Math.cos(a + spread) * len;
      const g = ctx.createLinearGradient(x, y, (ex1 + ex2) / 2, (ey1 + ey2) / 2);
      g.addColorStop(0, "rgba(225,250,244,0.32)");
      g.addColorStop(0.5, "rgba(200,240,232,0.1)");
      g.addColorStop(1, "rgba(200,240,232,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.lineTo(x + 2, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawTraffic(t: number, off: { x: number; y: number; alpha: number }[], motion: boolean) {
    const { ctx, view: v } = this;
    const lanes = [
      { X: -16, dir: -1, color: [255, 244, 214] },
      { X: -8, dir: -1, color: [255, 236, 190] },
      { X: 8, dir: 1, color: [255, 86, 74] },
      { X: 16, dir: 1, color: [255, 110, 90] },
    ];
    const zNear = 600;
    const zFar = 3600;
    const span = zFar - zNear;
    ctx.globalAlpha = Math.min(off[1].alpha, 1);

    // Street lamps along both kerbs
    for (let z = zNear; z < zFar; z += 90) {
      for (const X of [-AVENUE + 2, AVENUE - 2]) {
        const [x, y] = this.project(X, 0, z);
        const o = this.layerOffsetAt(z, off);
        const r = Math.max(0.8, (v.f / z) * 2.2);
        ctx.fillStyle = `rgba(255,214,140,${0.6 * (1 - z / zFar)})`;
        ctx.fillRect(x + o.x - r / 2, y + o.y - r / 2, r, r);
      }
    }

    for (const [li, lane] of lanes.entries()) {
      for (let k = 0; k < 9; k++) {
        const base = hash(li, k, 99) * span;
        const speed = 140 + hash(k, li, 5) * 90;
        const travelled = motion ? t * speed : 0;
        let z = lane.dir > 0 ? base + travelled : base - travelled;
        z = zNear + (((z % span) + span) % span);
        const [x, y] = this.project(lane.X, 3, z);
        const o = this.layerOffsetAt(z, off);
        const r = Math.max(0.9, (v.f / z) * 2.8);
        const fade = 1 - (z - zNear) / span;
        ctx.fillStyle = `rgba(${lane.color[0]},${lane.color[1]},${lane.color[2]},${0.25 + fade * 0.75})`;
        ctx.beginPath();
        ctx.arc(x + o.x, y + o.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private layerOffsetAt(z: number, off: { x: number; y: number }[]) {
    // Blend parallax smoothly between the layers so traffic stays on its road
    const t = Math.min(1, Math.max(0, (1500 - z) / 1100));
    const a = t < 0.5 ? off[0] : off[1];
    const b = t < 0.5 ? off[1] : off[2];
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  private drawPlane(t: number) {
    const { ctx, view: v } = this;
    const period = 38;
    const p = (t % period) / period;
    if (p > 0.6) return;
    const x = -40 + (v.W + 80) * (p / 0.6);
    const y = v.hy * 0.22 + Math.sin(p * 4) * 6 + this.scroll * 0.45;
    const blink = Math.floor(t * 2) % 2 === 0;
    ctx.fillStyle = "rgba(230,240,240,0.5)";
    ctx.fillRect(x - 6, y, 12, 1.2);
    ctx.fillStyle = blink ? "rgba(255,80,70,0.95)" : "rgba(255,80,70,0.25)";
    ctx.fillRect(x - 6, y - 0.5, 2, 2);
    ctx.fillStyle = !blink ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)";
    ctx.fillRect(x + 5, y - 0.5, 2, 2);
  }

  private drawShootingStar(now: number) {
    const { ctx, view: v } = this;
    if (!this.shooting && now - this.t0 > this.nextShooting) {
      this.shooting = { x: v.W * (0.2 + Math.random() * 0.6), y: v.hy * (0.05 + Math.random() * 0.3), vx: -0.5, vy: 0.22, t0: now };
      this.nextShooting = now - this.t0 + 9000 + Math.random() * 9000;
    }
    const s = this.shooting;
    if (!s) return;
    const p = (now - s.t0) / 900;
    if (p > 1) {
      this.shooting = undefined;
      return;
    }
    const x = s.x + s.vx * p * 400;
    const y = s.y + s.vy * p * 400 + this.scroll * 0.45;
    const g = ctx.createLinearGradient(x, y, x - s.vx * 120, y - s.vy * 120);
    g.addColorStop(0, `rgba(255,255,245,${1 - p})`);
    g.addColorStop(1, "rgba(255,255,245,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s.vx * 120, y - s.vy * 120);
    ctx.stroke();
  }
}

/* --------------------------------------------------------------- helpers */

function fillPoly(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** A heaped, moonlit cumulus with a speckled finish. */
function makeCloud(rng: Rng, width: number, dpr: number) {
  const height = width * 0.42;
  const c = document.createElement("canvas");
  c.width = Math.ceil(width * dpr);
  c.height = Math.ceil(height * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const base = height * 0.78;
  const puffs: { x: number; y: number; r: number }[] = [];
  const n = 7 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = height * (0.16 + 0.26 * Math.sin(Math.PI * t)) * (0.8 + rng() * 0.4);
    puffs.push({ x: width * (0.1 + t * 0.8), y: base - r * 0.7, r });
  }
  for (let i = 0; i < n - 2; i++) {
    puffs.push({ x: width * (0.16 + (i / (n - 3)) * 0.68), y: base - height * 0.08, r: height * (0.13 + rng() * 0.05) });
  }

  for (const p of puffs) {
    const g = ctx.createRadialGradient(p.x + p.r * 0.3, p.y - p.r * 0.45, p.r * 0.1, p.x, p.y, p.r);
    g.addColorStop(0, "#8fbcbc");
    g.addColorStop(0.55, "#4f838b");
    g.addColorStop(1, "#2f5e69");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadowed underside
  ctx.globalCompositeOperation = "source-atop";
  const shade = ctx.createLinearGradient(0, base - height * 0.25, 0, base + height * 0.2);
  shade.addColorStop(0, "rgba(22,52,62,0)");
  shade.addColorStop(1, "rgba(22,52,62,0.65)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  // Speckles
  ctx.fillStyle = "rgba(235,250,245,0.55)";
  for (let i = 0; i < width * 0.9; i++) {
    ctx.fillRect(rng() * width, rng() * height, 0.9, 0.9);
  }
  ctx.globalCompositeOperation = "source-over";
  return c;
}

"use client";

import { useEffect, useRef } from "react";
import { audio } from "./audio";

/*
  The city behind the whole page, painted on a fixed canvas.

  Scrolling is a descent: at the top you see the skyline against a blood-red dusk; as you
  scroll, the sky turns to night, the moon comes out, and the three tower layers rise past
  you at different speeds until you reach the wet street at the bottom.

  Performance: each tower layer is painted once into an offscreen canvas (in a dusk tint and a
  night tint that are crossfaded), so a frame is just a few image draws plus beams, a handful
  of twinkling windows, rain and the cursor glow.
*/

type Win = { x: number; y: number; w: number; h: number };
type Layer = {
  shift: number; // how far the layer rises over the whole scroll, in viewport heights
  dusk: HTMLCanvasElement;
  night: HTMLCanvasElement;
  mask: HTMLCanvasElement | null; // every window slot, lit or not, for the cursor glow
  windows: Win[]; // lit windows that can twinkle
  height: number; // CSS px
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function mix(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i] - v) * t);
}
const rgb = (c: number[], a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Sky keyframes by scroll progress: [top, middle, horizon]
const SKY: { p: number; c: number[][] }[] = [
  { p: 0.0, c: [[30, 4, 4], [104, 18, 10], [196, 62, 26]] },
  { p: 0.08, c: [[20, 6, 10], [62, 16, 22], [118, 40, 36]] },
  { p: 0.2, c: [[5, 8, 20], [14, 22, 48], [38, 54, 86]] },
  { p: 0.7, c: [[3, 4, 12], [8, 12, 28], [22, 30, 52]] },
  { p: 1.0, c: [[1, 2, 6], [4, 6, 14], [12, 16, 28]] },
];

function skyAt(p: number) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i];
    const b = SKY[i + 1];
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return a.c.map((c, j) => mix(c, b.c[j], t));
    }
  }
  return SKY[SKY.length - 1].c;
}

type Palette = { lit: string[]; face: [string, string]; shade: string; window: string[] };

const PALETTES: Record<"far" | "mid" | "near", { dusk: Palette; night: Palette }> = {
  far: {
    dusk: { lit: ["#e9b39d", "#b8675a"], face: ["#c98572", "#3a100c"], shade: "#260807", window: [] },
    night: { lit: ["#7d90b4", "#45567a"], face: ["#5e7096", "#0f1528"], shade: "#0a0f1e", window: [] },
  },
  mid: {
    dusk: {
      lit: ["#a86e5e", "#5e2a20"],
      face: ["#7f4638", "#120403"],
      shade: "#0c0302",
      window: ["#f2b548", "#ffd98a", "#f7e7c2"],
    },
    night: {
      lit: ["#4f6189", "#24304d"],
      face: ["#3a4a6c", "#04060c"],
      shade: "#020308",
      window: ["#f2b548", "#ffe7a8", "#bcd3ff", "#9fe6b8"],
    },
  },
  near: {
    dusk: { lit: ["#3a120d", "#140403"], face: ["#1c0806", "#000"], shade: "#000", window: ["#f2b548", "#ffd27a"] },
    night: {
      lit: ["#151c30", "#06080f"],
      face: ["#0a0e19", "#000"],
      shade: "#000",
      window: ["#f2b548", "#ffe1a0", "#bcd3ff"],
    },
  },
};

type Spec = {
  x: number;
  w: number;
  h: number;
  tiers: number;
  crown: "flat" | "steps" | "spire" | "arch" | "mast";
  lit: number; // share of windows lit
  seed: number;
};

function makeSpecs(width: number, kind: "far" | "mid" | "near", vh: number): Spec[] {
  const specs: Spec[] = [];
  const cfg = {
    far: { w: [34, 84], h: [0.6, 0.98], gap: [-6, 46] },
    mid: { w: [64, 140], h: [0.82, 1.12], gap: [-10, 44] },
    near: { w: [140, 280], h: [1.0, 1.66], gap: [10, 90] },
  }[kind];
  let x = rand(-80, -20);
  while (x < width + 40) {
    const w = rand(cfg.w[0], cfg.w[1]) * (width < 700 ? 0.7 : 1);
    specs.push({
      x,
      w,
      h: rand(cfg.h[0], cfg.h[1]) * vh,
      tiers: kind === "near" ? pick([1, 1, 2]) : pick([1, 2, 2, 3]),
      crown: pick(kind === "far" ? ["spire", "steps", "flat", "mast", "steps"] : ["flat", "steps", "spire", "arch", "flat", "mast"]),
      lit: kind === "near" ? rand(0.05, 0.16) : rand(0.06, 0.2),
      seed: Math.random(),
    });
    x += w + rand(cfg.gap[0], cfg.gap[1]);
  }
  // Paint tall ones first so shorter towers sit in front of them
  return specs.sort((a, b) => b.h - a.h);
}

function paintLayer(
  specs: Spec[],
  kind: "far" | "mid" | "near",
  pal: Palette,
  W: number,
  H: number,
  scale: number,
  collect: { windows: Win[]; slots: Win[] } | null,
) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(W * scale);
  c.height = Math.ceil(H * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);

  for (const s of specs) {
    // Re-seed per tower so the dusk and night versions paint identical buildings
    let seed = Math.floor(s.seed * 2 ** 31);
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const baseY = H;
    let tierW = s.w;
    let tierX = s.x;
    let top = baseY - s.h;
    const tiers: { x: number; w: number; top: number; bottom: number }[] = [];
    // Setbacks: each tier above the base is narrower, like a deco ziggurat
    const tierH = s.h / (s.tiers + 0.6);
    let bottom = baseY;
    for (let t = 0; t < s.tiers; t++) {
      const thisTop = t === s.tiers - 1 ? top : bottom - tierH * (t === 0 ? 1.6 : 1);
      tiers.push({ x: tierX, w: tierW, top: thisTop, bottom });
      bottom = thisTop;
      const inset = tierW * (0.12 + rnd() * 0.1);
      tierX += inset;
      tierW -= inset * 2;
    }
    top = tiers[tiers.length - 1].top;

    for (const t of tiers) {
      const litW = t.w * (0.55 + rnd() * 0.15);
      // Lit face: catches the sky light at the top and falls into black at the base
      const grad = g.createLinearGradient(0, t.top, 0, Math.min(t.bottom, t.top + s.h * 0.9));
      grad.addColorStop(0, pal.lit[0]);
      grad.addColorStop(0.35, pal.face[0]);
      grad.addColorStop(1, pal.face[1]);
      g.fillStyle = grad;
      g.fillRect(t.x, t.top, litW, t.bottom - t.top);
      // Shadow face
      g.fillStyle = pal.shade;
      g.fillRect(t.x + litW, t.top, t.w - litW, t.bottom - t.top);
      // Deco ribs: thin vertical pilasters down the lit face
      if (kind !== "near") {
        g.fillStyle = "rgba(0,0,0,0.22)";
        const ribs = Math.max(2, Math.floor(litW / 14));
        for (let r = 1; r < ribs; r++) g.fillRect(t.x + (litW / ribs) * r, t.top + 4, 1.2, t.bottom - t.top);
      }
      // Windows
      if (pal.window.length) {
        const cw = kind === "near" ? 8 : 4.5;
        const ch = kind === "near" ? 12 : 6.5;
        const gx = kind === "near" ? 24 : 12;
        const gy = kind === "near" ? 30 : 16;
        const cols = Math.floor((t.w - 12) / gx);
        const rows = Math.floor((t.bottom - t.top - 14) / gy);
        const ox = t.x + (t.w - cols * gx) / 2 + (gx - cw) / 2;
        for (let r = 0; r < rows; r++) {
          // Whole floors light up together sometimes, like offices working late
          const floorLit = rnd() < 0.035;
          for (let q = 0; q < cols; q++) {
            const wx = ox + q * gx;
            const wy = t.top + 10 + r * gy;
            if (wy + ch > H - 2) continue;
            const slot = { x: wx, y: wy, w: cw, h: ch };
            collect?.slots.push(slot);
            if (floorLit || rnd() < s.lit) {
              const col = pick(pal.window);
              const onShade = wx > t.x + litW;
              g.fillStyle = col;
              g.globalAlpha = onShade ? 0.75 : 0.95;
              g.fillRect(wx, wy, cw, ch);
              g.globalAlpha = 1;
              if (rnd() < 0.18) collect?.windows.push(slot);
            }
          }
        }
      }
    }

    // Crown
    const tt = tiers[tiers.length - 1];
    const cx = tt.x + tt.w / 2;
    g.fillStyle = pal.face[0];
    switch (s.crown) {
      case "steps": {
        let w = tt.w * 0.8;
        let y = top;
        for (let i = 0; i < 3; i++) {
          const h = tt.w * 0.12;
          g.fillStyle = i % 2 ? pal.lit[1] : pal.lit[0];
          g.fillRect(cx - w / 2, y - h, w, h);
          y -= h;
          w *= 0.68;
        }
        g.fillRect(cx - 1, y - tt.w * 0.5, 2, tt.w * 0.5);
        break;
      }
      case "spire": {
        g.fillStyle = pal.lit[0];
        g.beginPath();
        g.moveTo(cx - tt.w * 0.32, top);
        g.lineTo(cx, top - tt.w * 1.4);
        g.lineTo(cx + tt.w * 0.32, top);
        g.closePath();
        g.fill();
        g.fillStyle = pal.shade;
        g.beginPath();
        g.moveTo(cx, top - tt.w * 1.4);
        g.lineTo(cx + tt.w * 0.32, top);
        g.lineTo(cx + tt.w * 0.08, top);
        g.closePath();
        g.fill();
        break;
      }
      case "arch": {
        g.fillStyle = pal.lit[0];
        g.beginPath();
        g.ellipse(cx, top, tt.w * 0.42, tt.w * 0.36, 0, Math.PI, 0);
        g.fill();
        if (pal.window.length) {
          g.fillStyle = pal.window[0];
          g.globalAlpha = 0.8;
          g.beginPath();
          g.ellipse(cx, top, tt.w * 0.18, tt.w * 0.16, 0, Math.PI, 0);
          g.fill();
          g.globalAlpha = 1;
        }
        break;
      }
      case "mast": {
        g.fillStyle = pal.lit[1];
        g.fillRect(cx - tt.w * 0.14, top - tt.w * 0.35, tt.w * 0.28, tt.w * 0.35);
        g.fillRect(cx - 1.5, top - tt.w * 1.6, 3, tt.w * 1.3);
        break;
      }
      default:
        break;
    }
  }
  return c;
}

function makeMask(slots: Win[], W: number, H: number, scale: number) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(W * scale);
  c.height = Math.ceil(H * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  g.fillStyle = "#fff";
  for (const s of slots) g.fillRect(s.x - 0.5, s.y - 0.5, s.w + 1, s.h + 1);
  return c;
}

export default function CityCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const LAYER_SCALE = 0.85;
    let layers: Layer[] = [];
    const glow = document.createElement("canvas");
    const glowCtx = glow.getContext("2d")!;

    const build = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      glow.width = Math.ceil(W / 2);
      glow.height = Math.ceil(H / 2);
      const defs: { kind: "far" | "mid" | "near"; shift: number }[] = [
        { kind: "far", shift: 0.18 },
        { kind: "mid", shift: 0.5 },
        { kind: "near", shift: 1.2 },
      ];
      layers = defs.map(({ kind, shift }) => {
        const LH = H * (1 + shift);
        const specs = makeSpecs(W, kind, H);
        const collect = kind === "far" ? null : { windows: [] as Win[], slots: [] as Win[] };
        const night = paintLayer(specs, kind, PALETTES[kind].night, W, LH, LAYER_SCALE, collect);
        const dusk = paintLayer(specs, kind, PALETTES[kind].dusk, W, LH, LAYER_SCALE, null);
        const mask = collect ? makeMask(collect.slots, W, LH, LAYER_SCALE / 2) : null;
        return { shift, dusk, night, mask, windows: collect?.windows ?? [], height: LH };
      });
    };
    build();

    // ---------- Live state ----------
    let target = 0;
    let p = 0;
    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    readScroll();
    p = target;

    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: false };
    let rainBoost = 0;
    let rainTarget = 0;
    const onStation = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail.id;
      rainTarget = id === "storm" ? 1 : id === "window" ? 0.5 : id === "street" ? 0.3 : 0;
    };

    type Bolt = { pts: [number, number][]; life: number };
    let bolt: Bolt | null = null;
    let flash = 0;
    let nextAuto = performance.now() + rand(18000, 32000);

    const strike = (x: number, y: number) => {
      if (still) return;
      const pts: [number, number][] = [[x + rand(-60, 60), -10]];
      let cx = pts[0][0];
      let cy = -10;
      while (cy < y) {
        cy += rand(18, 42);
        cx += rand(-26, 26) + (x - cx) * 0.18;
        pts.push([cx, Math.min(cy, y)]);
      }
      bolt = { pts, life: 1 };
      flash = 0.26;
      audio.thunder(0.18 + Math.random() * 0.25);
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // Only strike when clicking the open city, not content or controls
      if (t.closest("a, button, input, label, .panel, .tower, .radio, .elevator, [data-no-strike]")) return;
      strike(e.clientX, e.clientY);
    };

    const rain: { x: number; y: number; v: number; l: number }[] = [];
    for (let i = 0; i < 260; i++) rain.push({ x: Math.random(), y: Math.random(), v: rand(0.9, 1.6), l: rand(10, 22) });

    // Twinkle: a few lit windows switch off and on again at random
    const off = new Map<string, { layer: number; win: Win; until: number }>();

    // A searchlight swept by the cursor, plus two that sweep on their own
    const beams = [
      { x: 0.22, base: -0.25, amp: 0.32, speed: 0.00021, phase: 0 },
      { x: 0.7, base: 0.2, amp: 0.36, speed: 0.00017, phase: 2.1 },
      { x: 0.48, base: 0, amp: 0, speed: 0, phase: 0, follow: true },
    ];

    const clouds = Array.from({ length: 7 }, (_, i) => ({
      x: Math.random(),
      y: 0.05 + i * 0.07 + Math.random() * 0.04,
      w: rand(0.25, 0.55),
      h: rand(10, 22),
      v: rand(0.000004, 0.000012),
    }));

    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = now - start;
      p += (target - p) * (still ? 1 : 0.085);
      rainBoost += (rainTarget - rainBoost) * 0.02;
      mouse.sx += (mouse.x - mouse.sx) * 0.18;
      mouse.sy += (mouse.y - mouse.sy) * 0.18;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Sky
      const sky = skyAt(p);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgb(sky[0]));
      g.addColorStop(0.55, rgb(sky[1]));
      g.addColorStop(1, rgb(sky[2]));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const night = Math.min(1, Math.max(0, (p - 0.12) / 0.3));

      // Moon
      const moonA = Math.min(1, Math.max(0, (p - 0.2) / 0.15)) * (1 - Math.max(0, (p - 0.85) / 0.15));
      if (moonA > 0) {
        const mx = W * 0.14;
        const my = H * (0.16 + p * 0.05);
        const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 160);
        halo.addColorStop(0, `rgba(220,232,240,${0.35 * moonA})`);
        halo.addColorStop(1, "rgba(220,232,240,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(mx - 170, my - 170, 340, 340);
        ctx.fillStyle = `rgba(232,240,246,${moonA})`;
        ctx.beginPath();
        ctx.arc(mx, my, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Long flat cloud bands, lit by the city from below
      for (const c of clouds) {
        c.x += c.v * (still ? 0 : 16);
        if (c.x > 1.2) c.x = -c.w;
        const y = c.y * H - p * H * 0.1;
        const col = night > 0.5 ? [70, 96, 140] : [226, 120, 84];
        ctx.fillStyle = rgb(col, 0.16 + 0.1 * (1 - night));
        ctx.beginPath();
        ctx.ellipse(c.x * W, y, c.w * W * 0.5, c.h, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Searchlights rise from behind the skyline, strongest at dusk
      const beamA = 0.2 * (1 - Math.max(0, (p - 0.3) / 0.4));
      if (beamA > 0.005 && !still) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const b of beams) {
          const ox = b.x * W;
          const oy = H * (0.92 - p * 0.3);
          let ang = b.base + Math.sin(t * b.speed + b.phase) * b.amp;
          if ("follow" in b && mouse.x > -999) ang = Math.atan2(mouse.sx - ox, oy - mouse.sy) * 0.8;
          const len = H * 1.4;
          const spread = 0.05;
          const tipL: [number, number] = [ox + Math.sin(ang - spread) * len, oy - Math.cos(ang - spread) * len];
          const tipR: [number, number] = [ox + Math.sin(ang + spread) * len, oy - Math.cos(ang + spread) * len];
          const bg = ctx.createLinearGradient(ox, oy, (tipL[0] + tipR[0]) / 2, (tipL[1] + tipR[1]) / 2);
          bg.addColorStop(0, `rgba(255,236,190,${beamA})`);
          bg.addColorStop(1, "rgba(255,236,190,0)");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(ox - 6, oy);
          ctx.lineTo(tipL[0], tipL[1]);
          ctx.lineTo(tipR[0], tipR[1]);
          ctx.lineTo(ox + 6, oy);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Tower layers, far to near
      layers.forEach((L, li) => {
        const y = -L.shift * H * p;
        ctx.globalAlpha = 1;
        ctx.drawImage(L.dusk, 0, y, W, L.height);
        if (night > 0) {
          ctx.globalAlpha = night;
          ctx.drawImage(L.night, 0, y, W, L.height);
          ctx.globalAlpha = 1;
        }
        // Haze between layers so distance reads
        if (li < layers.length - 1) {
          const hz = ctx.createLinearGradient(0, H * 0.35, 0, H);
          hz.addColorStop(0, rgb(sky[2], 0));
          hz.addColorStop(1, rgb(sky[2], li === 0 ? 0.32 : 0.16));
          ctx.fillStyle = hz;
          ctx.fillRect(0, 0, W, H);
        }
        // Twinkling windows
        if (!still && L.windows.length) {
          if (Math.random() < 0.25) {
            const win = pick(L.windows);
            off.set(`${li}:${win.x}:${win.y}`, { layer: li, win, until: t + rand(600, 5000) });
          }
          ctx.fillStyle = "#000";
          for (const [k, o] of off) {
            if (o.layer !== li) continue;
            if (o.until < t) {
              off.delete(k);
              continue;
            }
            ctx.fillRect(o.win.x, o.win.y + y, o.win.w, o.win.h);
          }
        }
      });

      // Cursor light: windows near the pointer glow warm, even the dark ones
      if (mouse.on && !still) {
        glowCtx.globalCompositeOperation = "source-over";
        glowCtx.clearRect(0, 0, glow.width, glow.height);
        const gx = mouse.sx / 2;
        const gy = mouse.sy / 2;
        const rg = glowCtx.createRadialGradient(gx, gy, 0, gx, gy, 95);
        rg.addColorStop(0, "rgba(255,214,130,0.95)");
        rg.addColorStop(0.5, "rgba(242,165,60,0.45)");
        rg.addColorStop(1, "rgba(242,165,60,0)");
        glowCtx.fillStyle = rg;
        glowCtx.fillRect(gx - 100, gy - 100, 200, 200);
        glowCtx.globalCompositeOperation = "destination-in";
        for (const L of layers) {
          if (!L.mask) continue;
          glowCtx.drawImage(L.mask, 0, (-L.shift * H * p) / 2, W / 2, L.height / 2);
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(glow, 0, 0, W, H);
        ctx.restore();
      }

      // The wet street rises into view at the bottom of the descent
      const street = Math.min(1, Math.max(0, (p - 0.82) / 0.18));
      if (street > 0) {
        const sh = H * 0.22 * street;
        const sy = H - sh;
        const sg = ctx.createLinearGradient(0, sy, 0, H);
        sg.addColorStop(0, "rgba(0,0,0,0.92)");
        sg.addColorStop(1, "#000");
        ctx.fillStyle = sg;
        ctx.fillRect(0, sy, W, sh);
        // Reflections of lit windows smeared on the wet asphalt
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 26; i++) {
          const rx = (((i * 137.5) % 100) / 100) * W;
          const flick = 0.5 + 0.5 * Math.sin(t * 0.002 + i);
          const rg = ctx.createLinearGradient(0, sy, 0, H);
          rg.addColorStop(0, `rgba(242,181,72,${0.16 * flick * street})`);
          rg.addColorStop(1, "rgba(242,181,72,0)");
          ctx.fillStyle = rg;
          ctx.fillRect(rx, sy + 4, 3 + (i % 3) * 2, sh);
        }
        ctx.restore();
        ctx.fillStyle = `rgba(242,181,72,${0.25 * street})`;
        ctx.fillRect(0, sy, W, 1);
      }

      // Vignette keeps the eye on the content and the edges in shadow
      const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${0.55 + 0.2 * p})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      // Rain: starts as you come down into the streets, heavier with the storm station
      const rainA = Math.min(1, Math.max(0, (p - 0.6) / 0.25)) * 0.55 + rainBoost * 0.45;
      if (rainA > 0.02 && !still) {
        ctx.strokeStyle = `rgba(190,205,230,${0.35 * rainA})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const n = Math.floor(rain.length * Math.min(1, rainA + 0.2));
        for (let i = 0; i < n; i++) {
          const d = rain[i];
          d.y += 0.012 * d.v;
          d.x += 0.0015 * d.v;
          if (d.y > 1.05) {
            d.y = -0.05;
            d.x = Math.random();
          }
          const x = (d.x % 1) * W;
          const y = d.y * H;
          ctx.moveTo(x, y);
          ctx.lineTo(x + d.l * 0.18, y + d.l);
        }
        ctx.stroke();
      }

      // Lightning: occasional strikes over the lower city, and on click
      if (!still && p > 0.5 && now > nextAuto) {
        strike(rand(W * 0.1, W * 0.9), rand(H * 0.3, H * 0.55));
        nextAuto = now + rand(22000, 40000);
      }
      if (bolt) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(220,230,255,${bolt.life})`;
        ctx.shadowColor = "rgba(160,190,255,0.9)";
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
        bolt.life -= 0.06;
        if (bolt.life <= 0) bolt = null;
      }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(200,215,255,${flash})`;
        ctx.fillRect(0, 0, W, H);
        flash *= 0.82;
      }

      if (!still) raf = requestAnimationFrame(frame);
    };

    const onScroll = () => {
      readScroll();
      if (still) requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!mouse.on) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
      }
      mouse.on = true;
    };
    const onLeave = () => {
      mouse.on = false;
    };
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        // Only rebuild when the width changes or the height changes a lot (not phone URL-bar jitter)
        if (Math.abs(window.innerWidth - W) > 2 || Math.abs(window.innerHeight - H) > 120) build();
        else {
          H = window.innerHeight;
          canvas.height = Math.round(H * dpr);
        }
        readScroll();
        if (still) requestAnimationFrame(frame);
      }, 150);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) raf = requestAnimationFrame(frame);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    window.addEventListener("click", onClick);
    window.addEventListener("noir:station", onStation);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);
    canvas.dataset.ready = "true";

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("click", onClick);
      window.removeEventListener("noir:station", onStation);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="city" aria-hidden="true" />;
}

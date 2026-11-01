import { drawBolt, drawRain, glow, makeBolt, makeRain, type Ctx, type SceneFactory } from "./kit";

/*
  A painted plate brought to life. The artwork is split offline into a back layer (sky, moon,
  distant city) and a front layer (near buildings, with transparency), plus a mask of its lit
  windows. At runtime we add depth (layers drift at different speeds with scroll and pointer),
  light (windows twinkle and glow near the cursor, the moon breathes, fog drifts), weather
  (lightning behind the skyline, rain), and per-plate moves like a slow look-up spin or a dark
  alley lit by a single lamp.
*/

const cache = new Map<string, HTMLImageElement>();
function img(src: string) {
  let el = cache.get(src);
  if (!el) {
    el = new Image();
    el.decoding = "async";
    el.src = src;
    cache.set(src, el);
  }
  return el;
}
const ready = (el?: HTMLImageElement) => !!el && el.complete && el.naturalWidth > 0;

export type Box = [number, number, number, number]; // normalized x, y, w, h

export type PlateOpts = {
  back: string; // full painting, or the back layer when `front` is given
  front?: string; // near layer with alpha
  win?: string; // white-on-transparent mask of lit windows
  boxes?: Box[]; // lit windows that may twinkle
  focus?: [number, number]; // which part of the painting stays in view when cropped
  focusNarrow?: [number, number]; // the same, for phone-width screens
  zoom?: number; // overscan so parallax never shows an edge
  shift?: { back: number; front: number }; // px the layers travel across the scroll
  pointer?: { back: number; front: number }; // px the layers lean with the pointer
  moon?: { x: number; y: number; r: number; color?: string };
  fog?: { color: string; top: number; bottom: number; alpha: number };
  lightning?: boolean;
  rain?: number; // number of drops
  rainAlpha?: number;
  spin?: { from: number; to: number; zoomFrom: number; zoomTo: number }; // degrees across scroll
  windowGlow?: string; // rgb for the cursor glow
  alley?: {
    lamp: [number, number]; // normalized position of the lamp head
    pool: [number, number]; // where its light lands
    darkness: number;
    neon?: Box; // a sign that flickers
  };
  steam?: [number, number][]; // vents (normalized)
  vignette?: number;
  tint?: string; // overall colour wash, e.g. "rgba(20,0,0,0.2)"
};

type Xf = { x: number; y: number; s: number };

export function plate(o: PlateOpts): SceneFactory {
  const boxes = (o.boxes ?? []).filter(([, , bw, bh]) => bw * bh < 0.00018 && bw * bh > 0.000004);
  return (w, h) => {
    const back = img(o.back);
    const front = o.front ? img(o.front) : undefined;
    const win = o.win ? img(o.win) : undefined;
    const zoom = o.zoom ?? 1.12;
    const shift = o.shift ?? { back: 30, front: 90 };
    const pointer = o.pointer ?? { back: 6, front: 16 };
    // On narrow screens a plate can ask to be framed differently (e.g. keep the lamp in view)
    const [fx, fy] = (w < 700 && o.focusNarrow) || o.focus || [0.5, 0.5];

    const glowC = document.createElement("canvas");
    glowC.width = Math.ceil(w / 2);
    glowC.height = Math.ceil(h / 2);
    const glowG = glowC.getContext("2d")!;
    const darkC = document.createElement("canvas");
    darkC.width = Math.ceil(w / 2);
    darkC.height = Math.ceil(h / 2);
    const darkG = darkC.getContext("2d")!;

    const drops = o.rain ? makeRain(o.rain, 9) : [];
    const steam = (o.steam ?? []).map(([x, y]) => ({
      x,
      y,
      puffs: Array.from({ length: 14 }, (_, i) => ({ age: i / 14, sx: (Math.random() - 0.5) * 0.4 })),
    }));
    const off = new Map<number, number>();
    let bolt: { pts: [number, number][]; life: number } | null = null;
    let flash = 0;
    let autoAt = 12000 + Math.random() * 10000;
    let lampFlicker = 1;
    let neonOn = 1;

    // Where the painting sits for a given scroll and pointer
    const place = (iw: number, ih: number, s: { progress: number; px: number; py: number }, layer: "back" | "front"): Xf => {
      const sc = Math.max(w / iw, h / ih) * zoom;
      const dw = iw * sc;
      const dh = ih * sc;
      const slackX = dw - w;
      const slackY = dh - h;
      const t = s.progress - 0.5;
      const sy = (layer === "back" ? shift.back : shift.front) * t;
      const pp = layer === "back" ? pointer.back : pointer.front;
      const x = -slackX * fx - s.px * pp;
      const y = -slackY * fy - sy - s.py * pp * 0.6;
      // Keep the painting covering the frame
      return {
        x: Math.min(0, Math.max(w - dw, x)),
        y: Math.min(0, Math.max(h - dh, y)),
        s: sc,
      };
    };

    const strike = (x: number, y: number) => {
      bolt = { pts: makeBolt(x, y), life: 1 };
      flash = 1;
      window.dispatchEvent(new CustomEvent("noir:thunder"));
    };

    return {
      click(x, y, s) {
        if (!o.lightning || s.still) return;
        strike(x, Math.min(y, h * 0.55));
      },
      draw(ctx: Ctx, s) {
        if (!ready(back)) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);
          return;
        }
        const iw = back.naturalWidth;
        const ih = back.naturalHeight;

        // ---------- Spinning look-up view ----------
        if (o.spin) {
          const t = s.progress;
          const ang = ((o.spin.from + (o.spin.to - o.spin.from) * t) * Math.PI) / 180 + (s.still ? 0 : Math.sin(s.t * 0.00012) * 0.01);
          const z = o.spin.zoomFrom + (o.spin.zoomTo - o.spin.zoomFrom) * t;
          const diag = Math.hypot(w, h);
          const sc = (Math.max(diag / iw, diag / ih) * z);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);
          ctx.save();
          ctx.translate(w / 2 + s.px * pointer.front, h / 2 + s.py * pointer.front);
          ctx.rotate(ang);
          ctx.scale(sc, sc);
          ctx.drawImage(back, -iw / 2, -ih / 2);
          // twinkling windows in the rotated frame
          if (boxes.length && !s.still) {
            if (Math.random() < 0.25) off.set(Math.floor(Math.random() * boxes.length), s.t + 400 + Math.random() * 3500);
            ctx.fillStyle = "rgba(40,16,4,0.72)";
            for (const [i, until] of off) {
              if (until < s.t) {
                off.delete(i);
                continue;
              }
              const [bx, by, bw, bh] = boxes[i];
              ctx.fillRect(-iw / 2 + bx * iw, -ih / 2 + by * ih, bw * iw, bh * ih);
            }
          }
          ctx.restore();
          drawFinish(ctx, s);
          return;
        }

        // ---------- Back layer ----------
        const bx = place(iw, ih, s, "back");
        ctx.drawImage(back, bx.x, bx.y, iw * bx.s, ih * bx.s);

        // The moon breathes a little
        if (o.moon) {
          const mx = bx.x + o.moon.x * iw * bx.s;
          const my = bx.y + o.moon.y * ih * bx.s;
          const mr = o.moon.r * iw * bx.s;
          const pulse = s.still ? 1 : 0.85 + 0.15 * Math.sin(s.t * 0.0011);
          glow(ctx, mx, my, mr * 2.6, o.moon.color ?? "230,245,220", 0.16 * pulse);
        }

        // Lightning sits behind the near buildings so they stand out against it
        if (o.lightning) {
          if (flash > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(200,225,255,${flash * 0.3})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
          }
          if (bolt) {
            drawBolt(ctx, bolt.pts, bolt.life);
            bolt.life -= s.dt / 260;
            if (bolt.life <= 0) bolt = null;
          }
          flash *= Math.pow(0.86, s.dt / 16);
          if (!s.still && s.t > autoAt) {
            strike(w * (0.2 + Math.random() * 0.6), h * (0.2 + Math.random() * 0.2));
            autoAt = s.t + 18000 + Math.random() * 20000;
          }
        }

        // Fog drifting between the layers
        if (o.fog && !s.still) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          for (let i = 0; i < 4; i++) {
            const y = h * (o.fog.top + ((o.fog.bottom - o.fog.top) * (i + 0.5)) / 4);
            const x = (((s.t * 0.000012 * (i % 2 ? 1 : -1.4) + i * 0.31) % 1.6) + 1.6) % 1.6;
            const gx = (x - 0.3) * w;
            const gr = ctx.createRadialGradient(gx, y, 0, gx, y, w * 0.45);
            gr.addColorStop(0, `rgba(${o.fog.color},${o.fog.alpha})`);
            gr.addColorStop(1, `rgba(${o.fog.color},0)`);
            ctx.fillStyle = gr;
            ctx.save();
            ctx.translate(gx, y);
            ctx.scale(1, 0.18);
            ctx.translate(-gx, -y);
            ctx.fillRect(gx - w * 0.45, y - w * 0.45, w * 0.9, w * 0.9);
            ctx.restore();
          }
          ctx.restore();
        }

        // ---------- Front layer ----------
        let fxf = bx;
        if (front && ready(front)) {
          fxf = place(iw, ih, s, "front");
          ctx.drawImage(front, fxf.x, fxf.y, iw * fxf.s, ih * fxf.s);
        }

        // Twinkling windows
        if (boxes.length && !s.still) {
          if (Math.random() < 0.25) off.set(Math.floor(Math.random() * boxes.length), s.t + 500 + Math.random() * 4000);
          ctx.fillStyle = "rgba(8,6,5,0.78)";
          for (const [i, until] of off) {
            if (until < s.t) {
              off.delete(i);
              continue;
            }
            const [x, y, bw, bh] = boxes[i];
            ctx.fillRect(fxf.x + x * iw * fxf.s, fxf.y + y * ih * fxf.s, bw * iw * fxf.s, bh * ih * fxf.s);
          }
        }

        // Cursor light on the windows
        if (win && ready(win) && s.mx >= 0 && !s.still) {
          glowG.globalCompositeOperation = "source-over";
          glowG.clearRect(0, 0, glowC.width, glowC.height);
          const gx = s.mx / 2;
          const gy = s.my / 2;
          const gr = glowG.createRadialGradient(gx, gy, 0, gx, gy, 90);
          gr.addColorStop(0, `rgba(${o.windowGlow ?? "255,220,150"},1)`);
          gr.addColorStop(0.5, `rgba(${o.windowGlow ?? "255,200,120"},0.45)`);
          gr.addColorStop(1, `rgba(${o.windowGlow ?? "255,200,120"},0)`);
          glowG.fillStyle = gr;
          glowG.fillRect(gx - 95, gy - 95, 190, 190);
          glowG.globalCompositeOperation = "destination-in";
          glowG.drawImage(win, fxf.x / 2, fxf.y / 2, (iw * fxf.s) / 2, (ih * fxf.s) / 2);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(glowC, 0, 0, w, h);
          ctx.restore();
        }

        // ---------- Dark alley: one lamp, and the cursor as a flashlight ----------
        if (o.alley) {
          const A = o.alley;
          const lx = fxf.x + A.lamp[0] * iw * fxf.s;
          const ly = fxf.y + A.lamp[1] * ih * fxf.s;
          const plx = fxf.x + A.pool[0] * iw * fxf.s;
          const ply = fxf.y + A.pool[1] * ih * fxf.s;
          if (!s.still) {
            // The lamp mostly holds steady and sometimes stutters
            const r = Math.random();
            lampFlicker += ((r < 0.012 ? 0.35 : r < 0.02 ? 0.7 : 1) - lampFlicker) * (r < 0.02 ? 1 : 0.08);
            if (o.alley.neon) neonOn = Math.random() < 0.015 ? 1 - neonOn : neonOn;
          }
          const k = 0.5;
          darkG.globalCompositeOperation = "source-over";
          darkG.clearRect(0, 0, darkC.width, darkC.height);
          darkG.fillStyle = `rgba(0,0,0,${A.darkness})`;
          darkG.fillRect(0, 0, darkC.width, darkC.height);
          darkG.globalCompositeOperation = "destination-out";
          const hole = (x: number, y: number, r: number, a: number, sy = 1) => {
            darkG.save();
            darkG.translate(x * k, y * k);
            darkG.scale(1, sy);
            const g = darkG.createRadialGradient(0, 0, 0, 0, 0, r * k);
            g.addColorStop(0, `rgba(0,0,0,${a})`);
            g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
            g.addColorStop(1, "rgba(0,0,0,0)");
            darkG.fillStyle = g;
            darkG.fillRect(-r * k, -r * k, r * 2 * k, r * 2 * k);
            darkG.restore();
          };
          const unit = Math.min(w, h);
          hole(lx, ly, unit * 0.16, 0.95 * lampFlicker);
          hole(plx, ply, unit * 0.42, 0.9 * lampFlicker, 0.42);
          // a cone joining the two
          darkG.save();
          darkG.globalAlpha = 0.55 * lampFlicker;
          const cone = darkG.createLinearGradient(lx * k, ly * k, plx * k, ply * k);
          cone.addColorStop(0, "rgba(0,0,0,1)");
          cone.addColorStop(1, "rgba(0,0,0,0.2)");
          darkG.fillStyle = cone;
          darkG.beginPath();
          darkG.moveTo((lx - unit * 0.015) * k, ly * k);
          darkG.lineTo((plx - unit * 0.3) * k, ply * k);
          darkG.lineTo((plx + unit * 0.3) * k, ply * k);
          darkG.lineTo((lx + unit * 0.015) * k, ly * k);
          darkG.closePath();
          darkG.fill();
          darkG.restore();
          if (s.mx >= 0) hole(s.mx, s.my, unit * 0.2, 0.75);
          if (A.neon && neonOn) {
            const [nx, ny, nw, nh] = A.neon;
            hole(fxf.x + (nx + nw / 2) * iw * fxf.s, fxf.y + (ny + nh / 2) * ih * fxf.s, unit * 0.12, 0.7);
          }
          ctx.drawImage(darkC, 0, 0, w, h);
          // Warm light from the lamp itself, falling in a soft cone onto the pavement
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const shaft = ctx.createLinearGradient(lx, ly, plx, ply);
          shaft.addColorStop(0, `rgba(255,214,140,${0.22 * lampFlicker})`);
          shaft.addColorStop(1, "rgba(255,190,110,0)");
          ctx.fillStyle = shaft;
          ctx.beginPath();
          ctx.moveTo(lx - unit * 0.012, ly);
          ctx.lineTo(plx - unit * 0.26, ply + unit * 0.05);
          ctx.lineTo(plx + unit * 0.22, ply + unit * 0.05);
          ctx.lineTo(lx + unit * 0.012, ly);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          glow(ctx, lx, ly, unit * 0.1, "255,214,140", 0.9 * lampFlicker);
          ctx.save();
          ctx.translate(plx, ply);
          ctx.scale(1, 0.35);
          glow(ctx, 0, 0, unit * 0.32, "255,190,110", 0.22 * lampFlicker);
          ctx.restore();
          if (A.neon && neonOn) {
            const [nx, ny, nw, nh] = A.neon;
            glow(ctx, fxf.x + (nx + nw / 2) * iw * fxf.s, fxf.y + (ny + nh / 2) * ih * fxf.s, nw * iw * fxf.s * 0.9, "255,60,70", 0.35);
          }
        }

        // Steam from vents
        if (steam.length && !s.still) {
          ctx.save();
          for (const v of steam) {
            const vx = fxf.x + v.x * iw * fxf.s;
            const vy = fxf.y + v.y * ih * fxf.s;
            for (const p of v.puffs) {
              p.age += s.dt / 5200;
              if (p.age > 1) {
                p.age -= 1;
                p.sx = (Math.random() - 0.5) * 0.4;
              }
              const a = Math.sin(p.age * Math.PI) * 0.07;
              const r = 30 + p.age * 110;
              const gx = vx + p.sx * r * 2 + Math.sin(p.age * 6 + s.t * 0.001) * 8;
              const gy = vy - p.age * h * 0.3;
              const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
              g.addColorStop(0, `rgba(200,200,215,${a})`);
              g.addColorStop(1, "rgba(200,200,215,0)");
              ctx.fillStyle = g;
              ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
            }
          }
          ctx.restore();
        }

        drawFinish(ctx, s);
      },
    };

    function drawFinish(ctx: Ctx, s: { still: boolean; dt: number }) {
      if (o.rain && !s.still) drawRain(ctx, drops, w, h, s.dt, o.rainAlpha ?? 0.22);
      if (o.tint) {
        ctx.fillStyle = o.tint;
        ctx.fillRect(0, 0, w, h);
      }
      const v = o.vignette ?? 0.55;
      if (v > 0) {
        const vg = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(0,0,0,${v})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }
    }
  };
}

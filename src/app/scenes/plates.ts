import {
  clip,
  cursorWindows,
  dissolve,
  drawRain,
  drawTwinkles,
  figure,
  glow,
  hatch,
  layer,
  lgrad,
  makeRain,
  moon,
  rng,
  speckle,
  stars,
  tower,
  vgrad,
  type Ctx,
  type SceneFactory,
  type TowerSpec,
  type Win,
} from "./kit";

type Pal = Pick<TowerSpec, "lit" | "side" | "sideW" | "hatch" | "hatchA" | "rib" | "winRate" | "winColors" | "speck">;

const FAR: Pal = {
  lit: ["#7d5ba6", "#553b86"],
  side: ["#4a3479", "#352766"],
  sideW: 0.35,
  hatch: "190,150,220",
  hatchA: 0.08,
  winRate: 0.05,
  winColors: ["#ffc98a", "#ffe0b0"],
};
const MID: Pal = {
  lit: ["#5b54d6", "#2e2a86"],
  side: ["#2a2577", "#17144a"],
  sideW: 0.34,
  hatch: "150,145,255",
  hatchA: 0.16,
  rib: "190,185,255",
  winRate: 0.08,
  winColors: ["#ffc979", "#ffe2a8", "#ffd49a"],
  speck: "220,215,255",
};
const NEAR: Pal = {
  lit: ["#2c2786", "#110f40"],
  side: ["#19165e", "#0a0829"],
  sideW: 0.32,
  hatch: "130,120,255",
  hatchA: 0.13,
  winRate: 0.11,
  winColors: ["#ffc979", "#ffe2a8"],
  speck: "200,195,255",
};

const CROWNS: TowerSpec["crown"][] = ["flat", "steps", "spire", "dome", "fins", "mast", "steps", "needle"];

/** A row of towers along a base line. */
function band(
  g: Ctx,
  from: number,
  to: number,
  base: number,
  pal: Pal,
  rnd: () => number,
  o: { wmin: number; wmax: number; hmin: number; hmax: number; gmin: number; gmax: number; scale: number },
  out?: { lit: Win[]; slots: Win[] },
) {
  const specs: { x: number; w: number; h: number }[] = [];
  let x = from;
  while (x < to) {
    const w = o.wmin + rnd() * (o.wmax - o.wmin);
    specs.push({ x, w, h: o.hmin + rnd() * (o.hmax - o.hmin) });
    x += w + o.gmin + rnd() * (o.gmax - o.gmin);
  }
  specs.sort((a, b) => b.h - a.h);
  for (const s of specs) {
    tower(
      g,
      { ...pal, x: s.x, base, w: s.w, h: s.h, tiers: 1 + Math.floor(rnd() * 3), crown: CROWNS[Math.floor(rnd() * CROWNS.length)], winScale: o.scale },
      rnd,
      out,
    );
  }
}

function haze(g: Ctx, LW: number, y0: number, y1: number, rgb: string, a: number) {
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = vgrad(g, y0, y1, [
    [0, `rgba(${rgb},0)`],
    [1, `rgba(${rgb},${a})`],
  ]);
  g.fillRect(0, 0, LW, y1 + 10);
  g.restore();
}

/** Plates fade in from the page at the top and out to it at the bottom. */
function edges(w: number, h: number, dpr: number, top: number, bottom: number) {
  const d1 = dissolve(w, top, dpr, undefined, 9);
  const d2 = dissolve(w, bottom, dpr, undefined, 13);
  return (ctx: Ctx) => {
    ctx.save();
    ctx.translate(0, top);
    ctx.scale(1, -1);
    ctx.drawImage(d1, 0, 0, w, top);
    ctx.restore();
    ctx.drawImage(d2, 0, h - bottom, w, bottom);
  };
}

/* =====================================================================================
   Plate II, the avenue: an elevated train crosses a viaduct in front of the skyline.
   ===================================================================================== */
export const avenue: SceneFactory = (w, h, dpr) => {
  const r = rng(31);
  const M = 40;
  const E = 50;
  const LW = w + M * 2;
  const LH = h + E;
  const k = Math.min(1.2, Math.max(0.7, w / 1440));

  const [sky, sg] = layer(w, h, dpr);
  sg.fillStyle = vgrad(sg, 0, h, [
    [0, "#0e1029"],
    [0.3, "#1a1850"],
    [0.6, "#3c2d78"],
    [0.82, "#8a4c8a"],
    [1, "#d27a7c"],
  ]);
  sg.fillRect(0, 0, w, h);
  const tw = stars(sg, w, h, r, Math.round((w * h) / 1300), h * 0.6);
  // a thin crescent
  const cx = w * 0.82;
  const cy = h * 0.2;
  glow(sg, cx, cy, 60, "255,236,205", 0.12);
  sg.fillStyle = "#fbe9cc";
  sg.beginPath();
  sg.arc(cx, cy, 10 * k + 2, 0, Math.PI * 2);
  sg.fill();
  sg.globalCompositeOperation = "destination-out";
  sg.beginPath();
  sg.arc(cx + 5 * k, cy - 3 * k, 10 * k + 2, 0, Math.PI * 2);
  sg.fill();
  sg.globalCompositeOperation = "source-over";
  // repaint the sky under the cut so it isn't a hole
  sg.globalCompositeOperation = "destination-over";
  sg.fillStyle = "#1a1850";
  sg.fillRect(cx - 20, cy - 20, 40, 40);
  sg.globalCompositeOperation = "source-over";

  const [far, fg] = layer(LW, LH, dpr);
  band(fg, -10, LW, LH - 4, FAR, r, { wmin: 16 * k, wmax: 40 * k, hmin: h * 0.2, hmax: h * 0.5, gmin: -4, gmax: 8, scale: 0.7 * k }, undefined);
  haze(fg, LW, LH - h * 0.45, LH, "210,110,140", 0.6);

  const midOut = { lit: [] as Win[], slots: [] as Win[] };
  const [mid, mg] = layer(LW, LH, dpr);
  band(mg, -10, LW, LH, MID, r, { wmin: 30 * k, wmax: 70 * k, hmin: h * 0.28, hmax: h * 0.72, gmin: 8, gmax: 40, scale: 0.85 * k }, midOut);
  haze(mg, LW, LH - h * 0.4, LH, "18,14,64", 0.75);

  // the viaduct: a deck on arches, in front of the city
  const deckY = h * 0.66 + E / 2;
  const deckH = 9 * k + 3;
  const [via, vg] = layer(LW, LH, dpr);
  {
    vg.fillStyle = vgrad(vg, deckY, deckY + deckH, [
      [0, "#3f38b0"],
      [1, "#1d1960"],
    ]);
    vg.fillRect(0, deckY, LW, deckH);
    vg.fillStyle = "#8f88ff";
    vg.globalAlpha = 0.6;
    vg.fillRect(0, deckY, LW, 0.8);
    vg.globalAlpha = 1;
    // railing
    vg.strokeStyle = "rgba(150,145,255,0.5)";
    vg.lineWidth = 0.6;
    vg.beginPath();
    for (let x = 0; x < LW; x += 6) {
      vg.moveTo(x, deckY);
      vg.lineTo(x, deckY - 4 * k);
    }
    vg.moveTo(0, deckY - 4 * k);
    vg.lineTo(LW, deckY - 4 * k);
    vg.stroke();
    // arches below the deck
    const span = 70 * k;
    vg.fillStyle = "#15124a";
    for (let x = -span / 2; x < LW + span; x += span) {
      vg.beginPath();
      vg.moveTo(x - span / 2, deckY + deckH);
      vg.lineTo(x - span / 2, LH);
      vg.lineTo(x - span / 2 + 10 * k, LH);
      vg.lineTo(x - span / 2 + 10 * k, deckY + deckH + 24 * k);
      vg.quadraticCurveTo(x + 5 * k, deckY + deckH - 2, x + span / 2, deckY + deckH + 24 * k);
      vg.lineTo(x + span / 2, LH);
      vg.lineTo(x + span / 2 + 0.1, LH);
      vg.lineTo(x + span / 2 + 0.1, deckY + deckH);
      vg.closePath();
      vg.fill();
    }
    clip(
      vg,
      (c) => c.rect(0, deckY + deckH, LW, LH),
      () => hatch(vg, 0, deckY + deckH, LW, LH - deckY, 2.4, "120,110,240", 0.12, 0, 0.5),
    );
  }

  const nearOut = { lit: [] as Win[], slots: [] as Win[] };
  const [near, ng] = layer(LW, LH, dpr);
  band(ng, -20, LW, LH, NEAR, r, { wmin: 70 * k, wmax: 150 * k, hmin: h * 0.12, hmax: h * 0.3, gmin: 10, gmax: 60, scale: 1.1 * k }, nearOut);

  const [mask, mk] = layer(LW, LH, 1);
  mk.fillStyle = "#fff";
  for (const s of nearOut.slots) mk.fillRect(s.x - 0.4, s.y - 0.4, s.w + 0.8, s.h + 0.8);
  const buf = layer(w, h, dpr);
  const edge = edges(w, h, dpr, h * 0.16, h * 0.22);

  // the train: a string of cars with lit window strips
  const cars = 6;
  const carW = 58 * k;
  const carH = 11 * k + 2;
  const trainW = cars * (carW + 3);
  const loop = 15000;

  return {
    draw(ctx: Ctx, s) {
      const p = s.progress - 0.5;
      const ox = (f: number) => -M - s.px * f;
      const oy = (f: number) => -E / 2 - p * f;
      ctx.drawImage(sky, 0, 0, w, h);
      if (!s.still) drawTwinkles(ctx, tw, s.t);
      ctx.drawImage(far, ox(6), oy(14), LW, LH);
      ctx.drawImage(mid, ox(14), oy(30), LW, LH);
      const vx = ox(22);
      const vy = oy(44);
      ctx.drawImage(via, vx, vy, LW, LH);

      // train runs left to right along the deck
      const u = s.still ? 0.45 : ((s.t % loop) / loop) * (LW + trainW * 2) - trainW;
      const ty = vy + deckY - carH - 1;
      for (let i = 0; i < cars; i++) {
        const x = vx + u + i * (carW + 3);
        if (x > w + 20 || x + carW < -20) continue;
        ctx.fillStyle = lgrad(ctx, 0, ty, 0, ty + carH, [
          [0, "#7d78f2"],
          [1, "#2b2689"],
        ]);
        ctx.beginPath();
        ctx.roundRect(x, ty, carW, carH, [3, 3, 1, 1]);
        ctx.fill();
        ctx.fillStyle = "#ffdca0";
        for (let wv = 0; wv < 7; wv++) ctx.fillRect(x + 5 + wv * ((carW - 10) / 7), ty + carH * 0.25, (carW - 10) / 7 - 2.5, carH * 0.36);
        glow(ctx, x + carW / 2, ty + carH * 0.45, carW * 0.6, "255,200,130", 0.08);
      }
      const head = vx + u + trainW - 3;
      if (head > -20 && head < w + 40) {
        glow(ctx, head + 2, ty + carH * 0.6, 28, "255,240,210", 0.6);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = lgrad(ctx, head, 0, head + 140 * k, 0, [
          [0, "rgba(255,236,200,0.22)"],
          [1, "rgba(255,236,200,0)"],
        ]);
        ctx.beginPath();
        ctx.moveTo(head, ty + carH * 0.45);
        ctx.lineTo(head + 140 * k, ty - 6);
        ctx.lineTo(head + 140 * k, ty + carH + 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const nx = ox(36);
      const ny = oy(70);
      ctx.drawImage(near, nx, ny, LW, LH);
      if (s.mx >= 0 && !s.still) cursorWindows(ctx, buf, mask, s.mx, s.my, nx, ny, w, h, LW, LH);
      edge(ctx);
    },
  };
};

/* =====================================================================================
   Plate III, the bridge: a deco suspension bridge over the river, traffic crossing,
   lamps and the moon shivering on the water.
   ===================================================================================== */
export const bridge: SceneFactory = (w, h, dpr) => {
  const r = rng(41);
  const M = 40;
  const E = 50;
  const LW = w + M * 2;
  const LH = h + E;
  const k = Math.min(1.2, Math.max(0.7, w / 1440));
  const waterY = h * 0.66;

  const [sky, sg] = layer(w, h, dpr);
  sg.fillStyle = vgrad(sg, 0, waterY, [
    [0, "#0e1029"],
    [0.4, "#211c5a"],
    [0.75, "#5a3584"],
    [1, "#c9677e"],
  ]);
  sg.fillRect(0, 0, w, waterY + 2);
  const tw = stars(sg, w, h, r, Math.round((w * h) / 1300), waterY * 0.8);
  const mX = w * 0.2;
  const mY = h * 0.2;
  moon(sg, mX, mY, 13 * k + 2);
  // water: the sky, darker and banded
  sg.fillStyle = vgrad(sg, waterY, h, [
    [0, "#4a2c74"],
    [0.3, "#241c5e"],
    [1, "#0e1029"],
  ]);
  sg.fillRect(0, waterY, w, h - waterY);
  clip(
    sg,
    (c) => c.rect(0, waterY, w, h - waterY),
    () => {
      hatch(sg, 0, waterY, w, h - waterY, 2.2, "170,150,255", 0.1, 0, 0.5);
      speckle(sg, 0, waterY, w, h - waterY, 5, "230,220,255", 0.05, 0.5, r);
    },
  );

  const [far, fg] = layer(LW, LH, dpr);
  const shoreY = waterY + E / 2;
  band(fg, -10, LW, shoreY, FAR, r, { wmin: 14 * k, wmax: 36 * k, hmin: h * 0.1, hmax: h * 0.36, gmin: -4, gmax: 10, scale: 0.65 * k });
  haze(fg, LW, shoreY - h * 0.3, shoreY, "220,110,140", 0.6);
  const midOut = { lit: [] as Win[], slots: [] as Win[] };
  band(fg, LW * 0.45, LW, shoreY, MID, r, { wmin: 24 * k, wmax: 52 * k, hmin: h * 0.16, hmax: h * 0.46, gmin: 6, gmax: 30, scale: 0.75 * k }, midOut);

  // bridge geometry, in layer coordinates
  const deckY = waterY - h * 0.1 + E / 2;
  const tA = LW * 0.24;
  const tB = LW * 0.74;
  const towerTop = h * 0.14 + E / 2;
  const towerW = 22 * k + 6;
  const [br, bg] = layer(LW, LH, dpr);
  const lamps: { x: number; y: number }[] = [];
  {
    // cables: a deep curve between the towers, half-curves out to the banks
    const cable = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
      bg.beginPath();
      bg.moveTo(x0, y0);
      bg.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
      bg.stroke();
    };
    bg.strokeStyle = "#a59fff";
    bg.lineWidth = 1.4;
    cable(tA + towerW / 2, towerTop + 6, tB + towerW / 2, towerTop + 6, deckY - towerTop - 14);
    cable(-60, deckY - 4, tA + towerW / 2, towerTop + 6, 30);
    cable(tB + towerW / 2, towerTop + 6, LW + 60, deckY - 4, 30);
    // suspenders, measured from the curve
    bg.strokeStyle = "rgba(165,159,255,0.55)";
    bg.lineWidth = 0.6;
    const curveY = (x: number) => {
      const x0 = tA + towerW / 2;
      const x1 = tB + towerW / 2;
      const t = (x - x0) / (x1 - x0);
      const y0 = towerTop + 6;
      const c = Math.max(y0, y0) + (deckY - towerTop - 14);
      return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * c + t * t * y0;
    };
    bg.beginPath();
    for (let x = tA + towerW; x < tB; x += 9 * k) {
      bg.moveTo(x, curveY(x));
      bg.lineTo(x, deckY);
    }
    bg.stroke();
    // deck
    bg.fillStyle = vgrad(bg, deckY, deckY + 10 * k, [
      [0, "#5a52d8"],
      [1, "#1d1962"],
    ]);
    bg.fillRect(-10, deckY, LW + 20, 10 * k + 2);
    bg.fillStyle = "#c2bdff";
    bg.globalAlpha = 0.7;
    bg.fillRect(-10, deckY, LW + 20, 0.8);
    bg.globalAlpha = 1;
    // deco towers: stepped, with an arch cut through
    for (const tx of [tA, tB]) {
      const tw2 = towerW;
      bg.fillStyle = vgrad(bg, towerTop, waterY + E / 2 + 30, [
        [0, "#7a73f0"],
        [1, "#221e70"],
      ]);
      bg.beginPath();
      bg.moveTo(tx, waterY + E / 2 + 30);
      bg.lineTo(tx, towerTop + 18);
      bg.lineTo(tx + tw2 * 0.18, towerTop + 18);
      bg.lineTo(tx + tw2 * 0.18, towerTop + 8);
      bg.lineTo(tx + tw2 * 0.34, towerTop + 8);
      bg.lineTo(tx + tw2 * 0.34, towerTop);
      bg.lineTo(tx + tw2 * 0.66, towerTop);
      bg.lineTo(tx + tw2 * 0.66, towerTop + 8);
      bg.lineTo(tx + tw2 * 0.82, towerTop + 8);
      bg.lineTo(tx + tw2 * 0.82, towerTop + 18);
      bg.lineTo(tx + tw2, towerTop + 18);
      bg.lineTo(tx + tw2, waterY + E / 2 + 30);
      bg.closePath();
      bg.fill();
      // shadow side
      bg.fillStyle = "rgba(20,16,70,0.55)";
      bg.fillRect(tx + tw2 * 0.62, towerTop + 18, tw2 * 0.38, waterY + E / 2 + 12 - towerTop - 18);
      // portal arch
      bg.save();
      bg.globalCompositeOperation = "destination-out";
      bg.beginPath();
      const aw = tw2 * 0.5;
      bg.moveTo(tx + (tw2 - aw) / 2, deckY);
      bg.lineTo(tx + (tw2 - aw) / 2, towerTop + 52 * k);
      bg.arc(tx + tw2 / 2, towerTop + 52 * k, aw / 2, Math.PI, 0);
      bg.lineTo(tx + (tw2 + aw) / 2, deckY);
      bg.closePath();
      bg.fill();
      bg.restore();
      clip(
        bg,
        (c) => c.rect(tx, towerTop, tw2, waterY + E / 2 + 30 - towerTop),
        () => hatch(bg, tx, towerTop, tw2, waterY - towerTop + E, 2.4, "200,195,255", 0.18, 0, 0.5),
      );
      // red beacons on top
      lamps.push({ x: tx + tw2 / 2, y: towerTop - 2 });
    }
    // pier footings in the water
    bg.fillStyle = "#16124a";
    for (const tx of [tA, tB]) bg.fillRect(tx - 6, waterY + E / 2 + 4, towerW + 12, 26);
  }
  // deck lamps
  const deckLamps: number[] = [];
  for (let x = 20; x < LW; x += 48 * k) deckLamps.push(x);

  const [mask, mk] = layer(LW, LH, 1);
  mk.fillStyle = "#fff";
  for (const s of midOut.slots) mk.fillRect(s.x - 0.4, s.y - 0.4, s.w + 0.8, s.h + 0.8);
  const buf = layer(w, h, dpr);
  const edge = edges(w, h, dpr, h * 0.16, h * 0.22);

  const cars = Array.from({ length: 22 }, () => ({ u: r(), v: 0.03 + r() * 0.04, dir: r() < 0.5 ? 1 : -1 }));

  return {
    draw(ctx: Ctx, s) {
      const p = s.progress - 0.5;
      const ox = (f: number) => -M - s.px * f;
      const oy = (f: number) => -E / 2 - p * f;
      ctx.drawImage(sky, 0, 0, w, h);
      if (!s.still) drawTwinkles(ctx, tw, s.t);

      // the moon's trail on the water, broken and shivering
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let y = waterY + 4; y < h * 0.98; y += 3.2) {
        const d = (y - waterY) / (h - waterY);
        const wob = s.still ? 0 : Math.sin(y * 0.35 + s.t * 0.003) * 6 * (0.4 + d);
        const len = (28 + d * 60) * k * (0.6 + 0.4 * Math.sin(y * 1.7 + s.t * 0.002));
        ctx.fillStyle = `rgba(255,230,200,${0.32 * (1 - d * 0.7)})`;
        ctx.fillRect(mX - len / 2 + wob, y, len, 1.1);
      }
      ctx.restore();

      const fx = ox(10);
      const fy = oy(18);
      ctx.drawImage(far, fx, fy, LW, LH);
      if (s.mx >= 0 && !s.still) cursorWindows(ctx, buf, mask, s.mx, s.my, fx, fy, w, h, LW, LH);

      const bx = ox(24);
      const by = oy(34);
      ctx.drawImage(br, bx, by, LW, LH);

      // lamps on the deck, and their reflections in the river
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const lx of deckLamps) {
        const x = bx + lx;
        if (x < -20 || x > w + 20) continue;
        const y = by + deckY - 5 * k;
        ctx.fillStyle = "#ffe2a8";
        ctx.fillRect(x - 0.8, y, 1.6, 1.6);
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 10 * k);
        gr.addColorStop(0, "rgba(255,210,140,0.7)");
        gr.addColorStop(1, "rgba(255,210,140,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(x - 12 * k, y - 12 * k, 24 * k, 24 * k);
        for (let yy = waterY + 6; yy < waterY + h * 0.26; yy += 3) {
          const d = (yy - waterY) / (h * 0.26);
          const wob = s.still ? 0 : Math.sin(yy * 0.5 + s.t * 0.004 + lx) * 2.5;
          ctx.fillStyle = `rgba(255,200,130,${0.22 * (1 - d)})`;
          ctx.fillRect(x - 2 + wob, yy, 4, 1);
        }
      }
      ctx.restore();

      // traffic: headlights one way, tail lights the other
      if (!s.still) {
        for (const c of cars) {
          c.u = (c.u + ((c.dir * c.v * s.dt) / 1000) * 0.4 + 1) % 1;
          const x = bx + c.u * LW;
          const y = by + deckY - 2.2 * k;
          if (x < -10 || x > w + 10) continue;
          const col = c.dir > 0 ? "255,246,225" : "255,80,70";
          ctx.fillStyle = `rgba(${col},1)`;
          ctx.fillRect(x, y, 2.4 * k, 1.4);
          glow(ctx, x + 1, y + 0.5, 6 * k, col, 0.5);
        }
      }
      // tower beacons
      for (const L of lamps) {
        const on = s.still || Math.sin(s.t * 0.003 + L.x) > 0.3;
        ctx.fillStyle = on ? "#ff6b6b" : "#5a1f2a";
        ctx.beginPath();
        ctx.arc(bx + L.x, by + L.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (on && !s.still) glow(ctx, bx + L.x, by + L.y, 10, "255,80,80", 0.8);
      }
      edge(ctx);
    },
  };
};

/* =====================================================================================
   Plate IV, the grid: the city seen from high above at night, blocks in perspective,
   streets full of moving headlights and tail lights.
   ===================================================================================== */
export const grid: SceneFactory = (w, h, dpr) => {
  const r = rng(51);
  const k = Math.min(1.2, Math.max(0.7, w / 1440));
  const horizon = h * 0.12;
  const f = h * 1.05;
  const camH = 2.6;
  const cx = w / 2;
  const P = (x: number, z: number, y = 0) => [cx + (x * f) / z, horizon + ((camH - y) * f) / z] as const;
  const Z0 = 2.2;
  const Z1 = 30;
  const BLK = 0.62;
  const ST = 0.2;
  const cols = 16;

  const [base, g] = layer(w, h, dpr);
  g.fillStyle = vgrad(g, 0, horizon + 4, [
    [0, "#0e1029"],
    [0.55, "#2c2268"],
    [1, "#c46c84"],
  ]);
  g.fillRect(0, 0, w, horizon + 4);
  stars(g, w, horizon, r, Math.round(w / 5), horizon * 0.8);
  // the ground between blocks is the street: dark, but it glows where the lights are
  g.fillStyle = vgrad(g, horizon, h, [
    [0, "#5a3a7c"],
    [0.1, "#231a5a"],
    [1, "#0d0b2c"],
  ]);
  g.fillRect(0, horizon, w, h - horizon);
  // sodium glow along every street, drawn under the blocks
  g.save();
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  for (let i = -cols; i <= cols + 1; i++) {
    const x = i * (BLK + ST) - BLK / 2 - ST / 2;
    const [ax, ay] = P(x, Z0);
    const [bx, by] = P(x, Z1);
    g.strokeStyle = lgrad(g, ax, ay, bx, by, [
      [0, "rgba(255,170,90,0.5)"],
      [1, "rgba(255,170,90,0.08)"],
    ]);
    g.lineWidth = 3.5 * k;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  }
  for (let z = Z0 + 0.3 - ST / 2; z < Z1; z += BLK + ST) {
    const [ax, ay] = P(-cols * (BLK + ST), z);
    const [bx, by] = P(cols * (BLK + ST), z);
    g.strokeStyle = `rgba(255,170,90,${Math.max(0.06, 0.5 - z / 40)})`;
    g.lineWidth = Math.max(0.6, (7 * k) / z);
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  }
  g.restore();

  type Block = { x0: number; x1: number; z0: number; z1: number; hgt: number };
  const blocks: Block[] = [];
  for (let z = Z0 + 0.3; z < Z1; z += BLK + ST) {
    for (let i = -cols; i <= cols; i++) {
      const x0 = i * (BLK + ST) - BLK / 2;
      // a few towers rise high; most blocks are low
      const tall = r() < 0.12;
      const hgt = tall ? 0.6 + r() * 1.4 : 0.08 + r() * 0.35;
      // some blocks are split into two buildings
      if (r() < 0.4) {
        const mid = x0 + BLK * (0.35 + r() * 0.3);
        blocks.push({ x0, x1: mid - 0.03, z0: z, z1: z + BLK, hgt });
        blocks.push({ x0: mid, x1: x0 + BLK, z0: z, z1: z + BLK, hgt: 0.08 + r() * 0.5 });
      } else blocks.push({ x0, x1: x0 + BLK, z0: z, z1: z + BLK, hgt });
    }
  }
  blocks.sort((a, b) => b.z0 - a.z0 || Math.abs((b.x0 + b.x1) / 2) - Math.abs((a.x0 + a.x1) / 2));
  const poly = (pts: readonly (readonly [number, number])[]) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  for (const b of blocks) {
    const A = P(b.x0, b.z0, b.hgt);
    const B = P(b.x1, b.z0, b.hgt);
    const C = P(b.x1, b.z1, b.hgt);
    const D = P(b.x0, b.z1, b.hgt);
    const a0 = P(b.x0, b.z0, 0);
    const b0 = P(b.x1, b.z0, 0);
    const near = Math.max(0, 1 - (b.z0 - Z0) / 14);
    // the face toward us
    g.fillStyle = vgrad(g, A[1], a0[1], [
      [0, "#3a33a6"],
      [1, "#14114a"],
    ]);
    poly([A, B, b0, a0]);
    g.fill();
    if (near > 0.05) {
      // window grid on the front face
      const rows = Math.max(1, Math.round((a0[1] - A[1]) / (7 * k)));
      const colsW = Math.max(2, Math.round((B[0] - A[0]) / (6 * k)));
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < colsW; cc++) {
          if (r() > 0.16) continue;
          const u0 = (cc + 0.3) / colsW;
          const v0 = (rr + 0.3) / rows;
          const x = A[0] + (B[0] - A[0]) * u0;
          const y = A[1] + (a0[1] - A[1]) * v0;
          g.fillStyle = r() < 0.85 ? "#ffcd84" : "#fff0cf";
          g.fillRect(x, y, Math.max(0.7, ((B[0] - A[0]) / colsW) * 0.45), Math.max(0.7, ((a0[1] - A[1]) / rows) * 0.42));
        }
      }
    }
    // the side face toward the centre line
    const sx = (b.x0 + b.x1) / 2 > 0 ? b.x0 : b.x1;
    g.fillStyle = "#1d1964";
    poly([P(sx, b.z0, b.hgt), P(sx, b.z1, b.hgt), P(sx, b.z1, 0), P(sx, b.z0, 0)]);
    g.fill();
    // roof, catching the sky
    g.fillStyle = vgrad(g, D[1], A[1], [
      [0, "#3f38ad"],
      [1, "#5149c8"],
    ]);
    poly([A, B, C, D]);
    g.fill();
    g.fillStyle = "rgba(190,185,255,0.5)";
    g.fillRect(Math.min(A[0], B[0]), A[1] - 0.4, Math.abs(B[0] - A[0]), 0.8);
    if (near > 0.2) {
      clip(
        g,
        (c) => {
          c.moveTo(A[0], A[1]);
          c.lineTo(B[0], B[1]);
          c.lineTo(C[0], C[1]);
          c.lineTo(D[0], D[1]);
          c.closePath();
        },
        () => speckle(g, Math.min(A[0], D[0]), D[1], Math.abs(B[0] - A[0]) + 4, A[1] - D[1] + 2, 10, "220,215,255", 0.08, 0.55, r),
      );
    }
  }
  g.fillStyle = vgrad(g, horizon, horizon + h * 0.3, [
    [0, "rgba(190,100,140,0.6)"],
    [1, "rgba(190,100,140,0)"],
  ]);
  g.fillRect(0, horizon, w, h * 0.3);

  // traffic, drawn on top: only visible in the street gaps between blocks
  type Car = { lane: number; u: number; v: number; dir: number; avenue: boolean };
  const carsList: Car[] = [];
  for (let i = 0; i < 220; i++) {
    const avenue = r() < 0.55;
    carsList.push({ lane: avenue ? Math.floor(r() * (cols * 2 + 2)) - cols : Math.floor(r() * 30), u: r(), v: 0.02 + r() * 0.04, dir: r() < 0.5 ? 1 : -1, avenue });
  }
  const d2 = dissolve(w, h * 0.2, dpr, undefined, 21);
  const d1 = dissolve(w, h * 0.1, dpr, undefined, 22);

  return {
    draw(ctx: Ctx, s) {
      ctx.drawImage(base, 0, 0, w, h);
      if (!s.still) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const c of carsList) {
          c.u = (c.u + ((c.dir * c.v * s.dt) / 1000) * 0.5 + 1) % 1;
          let x: number;
          let z: number;
          if (c.avenue) {
            x = c.lane * (BLK + ST) - BLK / 2 - ST / 2 + (c.dir > 0 ? -ST * 0.2 : ST * 0.2);
            z = Z0 + c.u * (Z1 - Z0);
          } else {
            z = Z0 + 0.3 + c.lane * (BLK + ST) - ST / 2 + (c.dir > 0 ? -ST * 0.18 : ST * 0.18);
            x = (c.u - 0.5) * (cols * 2 + 1) * (BLK + ST);
          }
          const [px, py] = P(x, z, 0.01);
          if (py < horizon || py > h || px < -10 || px > w + 10) continue;
          const size = Math.max(0.7, (9 * k) / z);
          const toward = c.avenue ? c.dir < 0 : c.dir > 0;
          const col = toward ? "255,244,220" : "255,72,60";
          const a = Math.min(1, 0.35 + 3 / z);
          const gr = ctx.createRadialGradient(px, py, 0, px, py, size * 3.5);
          gr.addColorStop(0, `rgba(${col},${a})`);
          gr.addColorStop(0.3, `rgba(${col},${a * 0.5})`);
          gr.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = gr;
          ctx.fillRect(px - size * 3.5, py - size * 3.5, size * 7, size * 7);
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(0, h * 0.1);
      ctx.scale(1, -1);
      ctx.drawImage(d1, 0, 0, w, h * 0.1);
      ctx.restore();
      ctx.drawImage(d2, 0, h - h * 0.2, w, h * 0.2);
    },
  };
};

/* =====================================================================================
   Plate V, the alley: brick walls closing in, a sliver of skyline and the moon at the end,
   rain, steam, wet ground, and one gooseneck lamp with a figure beneath it.
   ===================================================================================== */
export const alley: SceneFactory = (w, h, dpr) => {
  const r = rng(61);
  const narrow = w < 720;
  const vpX = narrow ? w * 0.62 : w * 0.66;
  const vpY = h * 0.44;
  const k = Math.min(1.3, Math.max(0.75, w / 1440));
  // alley opening at the far end
  const farL = vpX - w * 0.06;
  const farR = vpX + w * 0.06;
  const farTop = vpY - h * 0.28;
  const farBot = vpY + h * 0.06;

  const [base, g] = layer(w, h, dpr);
  // sky at the end of the alley
  g.fillStyle = vgrad(g, farTop - 40, farBot, [
    [0, "#14123a"],
    [0.55, "#3a2a72"],
    [1, "#b0607e"],
  ]);
  g.fillRect(0, 0, w, h);
  const tw = stars(g, w, h, r, 120, farBot);
  moon(g, vpX - w * 0.02, farTop + h * 0.06, 7 * k + 2);
  // a sliver of skyline between the walls
  band(g, farL - 40, farR + 40, farBot, FAR, r, { wmin: 8 * k, wmax: 18 * k, hmin: h * 0.06, hmax: h * 0.2, gmin: -2, gmax: 4, scale: 0.5 });
  // ground
  g.fillStyle = vgrad(g, farBot, h, [
    [0, "#2a2160"],
    [0.4, "#171345"],
    [1, "#0b0a26"],
  ]);
  g.beginPath();
  g.moveTo(farL, farBot);
  g.lineTo(farR, farBot);
  g.lineTo(w * 1.2, h);
  g.lineTo(-w * 0.2, h);
  g.closePath();
  g.fill();
  // cobble/asphalt lines converging on the vanishing point
  clip(
    g,
    (c) => {
      c.moveTo(farL, farBot);
      c.lineTo(farR, farBot);
      c.lineTo(w * 1.2, h);
      c.lineTo(-w * 0.2, h);
      c.closePath();
    },
    () => {
      g.strokeStyle = "rgba(140,130,255,0.09)";
      g.lineWidth = 0.6;
      g.beginPath();
      for (let x = -w; x < w * 2; x += 14) {
        g.moveTo(vpX, vpY);
        g.lineTo(x, h);
      }
      for (let i = 1; i < 40; i++) {
        const t = Math.pow(i / 40, 2.2);
        const y = farBot + (h - farBot) * t;
        g.moveTo(0, y);
        g.lineTo(w, y);
      }
      g.stroke();
      speckle(g, 0, farBot, w, h - farBot, 6, "210,205,255", 0.05, 0.45, r);
    },
  );

  // walls: left and right, bricks drawn as lines converging on the vanishing point
  const wall = (left: boolean) => {
    const x0 = left ? 0 : w;
    const xf = left ? farL : farR;
    const path = (c: Ctx) => {
      c.moveTo(x0, 0);
      c.lineTo(xf, farTop);
      c.lineTo(xf, farBot);
      c.lineTo(x0, h);
      c.closePath();
    };
    g.fillStyle = lgrad(g, x0, 0, xf, 0, left
      ? [
          [0, "#120f3a"],
          [1, "#2c2470"],
        ]
      : [
          [0, "#1a1550"],
          [1, "#3a2f86"],
        ]);
    g.beginPath();
    path(g);
    g.fill();
    clip(g, path, () => {
      g.strokeStyle = left ? "rgba(120,110,240,0.16)" : "rgba(150,135,255,0.2)";
      g.lineWidth = 0.6;
      g.beginPath();
      // brick courses: lines from the near edge to the vanishing point
      for (let y = -h; y < h * 2; y += 9 * k) {
        g.moveTo(x0, y);
        g.lineTo(vpX, vpY);
      }
      g.stroke();
      speckle(g, Math.min(x0, xf), 0, Math.abs(xf - x0), h, 7, "200,190,255", 0.05, 0.4, r);
    });
  };
  wall(true);
  wall(false);

  // windows on the walls, in perspective
  const winQuads: { pts: [number, number][]; lit: boolean }[] = [];
  const onWall = (left: boolean, t: number, v: number) => {
    // t: 0 near edge .. 1 far end; v: 0 top .. 1 bottom of the wall at that depth
    const x0 = left ? 0 : w;
    const xf = left ? farL : farR;
    const e = Math.pow(t, 0.55);
    const x = x0 + (xf - x0) * e;
    const top = 0 + (farTop - 0) * e;
    const bot = h + (farBot - h) * e;
    return [x, top + (bot - top) * v] as [number, number];
  };
  for (const left of [true, false]) {
    for (let t = 0.12; t < 0.9; t += 0.16) {
      for (let v = 0.12; v < 0.6; v += 0.14) {
        const t2 = t + 0.06;
        const pts: [number, number][] = [onWall(left, t, v), onWall(left, t2, v), onWall(left, t2, v + 0.07), onWall(left, t, v + 0.07)];
        winQuads.push({ pts, lit: r() < 0.22 });
      }
    }
  }
  for (const q of winQuads) {
    g.fillStyle = q.lit ? "#ffcd84" : "rgba(8,6,30,0.75)";
    g.beginPath();
    q.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  }
  // fire escape on the right wall: landings and ladders
  g.strokeStyle = "rgba(12,10,40,0.95)";
  g.lineWidth = 1.2;
  for (let v = 0.18; v < 0.62; v += 0.15) {
    const a = onWall(false, 0.18, v);
    const b = onWall(false, 0.42, v);
    g.beginPath();
    g.moveTo(a[0] - 26 * k, a[1]);
    g.lineTo(b[0] - 14 * k, b[1]);
    g.stroke();
    g.beginPath();
    g.moveTo(a[0] - 26 * k, a[1] - 8 * k);
    g.lineTo(b[0] - 14 * k, b[1] - 6 * k);
    g.stroke();
    const c = onWall(false, 0.3, v);
    const d = onWall(false, 0.36, v + 0.15);
    g.beginPath();
    g.moveTo(c[0] - 20 * k, c[1]);
    g.lineTo(d[0] - 17 * k, d[1]);
    g.stroke();
  }

  // the lamp: a gooseneck arm from the right wall
  const lampBase = onWall(false, 0.34, 0.44);
  const lamp = { x: lampBase[0] - 46 * k, y: lampBase[1] + 4 * k };
  g.strokeStyle = "#0c0a2c";
  g.lineWidth = 2.4 * k;
  g.beginPath();
  g.moveTo(lampBase[0], lampBase[1]);
  g.quadraticCurveTo(lampBase[0] - 12 * k, lampBase[1] - 26 * k, lamp.x, lamp.y - 4 * k);
  g.stroke();
  g.fillStyle = "#0c0a2c";
  g.beginPath();
  g.moveTo(lamp.x - 8 * k, lamp.y);
  g.lineTo(lamp.x + 8 * k, lamp.y);
  g.lineTo(lamp.x + 4 * k, lamp.y - 6 * k);
  g.lineTo(lamp.x - 4 * k, lamp.y - 6 * k);
  g.closePath();
  g.fill();
  const pool = { x: lamp.x - 10 * k, y: h * 0.86 };
  // the figure stands at the edge of the pool of light
  const fig = { x: pool.x - 20 * k, y: pool.y - 6 * k };
  // overall darkness, then the lamp's light will be added each frame
  g.fillStyle = "rgba(4,4,18,0.45)";
  g.fillRect(0, 0, w, h);

  const drops = makeRain(narrow ? 160 : 320, 7);
  const steam = { x: farL + (vpX - farL) * 0.3, y: farBot + (h - farBot) * 0.25 };
  const puffs = Array.from({ length: 16 }, (_, i) => ({ age: i / 16, sx: (r() - 0.5) * 0.6 }));
  const ripples: { x: number; y: number; t: number }[] = [];
  let flick = 1;
  const d2 = dissolve(w, h * 0.14, dpr, undefined, 33);
  const d1 = dissolve(w, h * 0.12, dpr, undefined, 34);

  return {
    draw(ctx: Ctx, s) {
      ctx.drawImage(base, 0, 0, w, h);
      if (!s.still) drawTwinkles(ctx, tw, s.t);
      // the lamp mostly holds and sometimes stutters
      if (!s.still) {
        const q = Math.random();
        const target = q < 0.008 ? 0.25 : q < 0.016 ? 0.6 : 1;
        flick += (target - flick) * (q < 0.016 ? 1 : 0.1);
      }
      const L = flick;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // the cone
      const cone = ctx.createLinearGradient(lamp.x, lamp.y, pool.x, pool.y);
      cone.addColorStop(0, `rgba(255,214,150,${0.28 * L})`);
      cone.addColorStop(1, "rgba(255,200,130,0.02)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lamp.x - 6 * k, lamp.y);
      ctx.lineTo(pool.x - 130 * k, pool.y + 20 * k);
      ctx.lineTo(pool.x + 120 * k, pool.y + 20 * k);
      ctx.lineTo(lamp.x + 6 * k, lamp.y);
      ctx.closePath();
      ctx.fill();
      // the pool on the wet ground
      ctx.save();
      ctx.translate(pool.x, pool.y);
      ctx.scale(1, 0.22);
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 170 * k);
      pg.addColorStop(0, `rgba(255,205,140,${0.5 * L})`);
      pg.addColorStop(1, "rgba(255,205,140,0)");
      ctx.fillStyle = pg;
      ctx.fillRect(-180 * k, -180 * k, 360 * k, 360 * k);
      ctx.restore();
      // the reflection of the lamp, a long shivering streak
      for (let y = pool.y - 10 * k; y < h; y += 3) {
        const d = (y - pool.y) / (h - pool.y + 1);
        const wob = s.still ? 0 : Math.sin(y * 0.4 + s.t * 0.004) * 3;
        ctx.fillStyle = `rgba(255,214,150,${0.35 * L * (1 - Math.abs(d))})`;
        ctx.fillRect(lamp.x - 3 + wob, y, 6, 1.2);
      }
      ctx.restore();
      glow(ctx, lamp.x, lamp.y + 1, 26 * k, "255,226,170", 0.95 * L);
      glow(ctx, lamp.x, lamp.y + 1, 90 * k, "255,200,130", 0.18 * L);
      ctx.fillStyle = `rgba(255,240,210,${L})`;
      ctx.fillRect(lamp.x - 5 * k, lamp.y - 1, 10 * k, 2);

      // the figure, lit from above
      figure(ctx, fig.x, fig.y, 2.4 * k, "#07061c", "rgba(4,4,18,0.6)", -1);

      // steam from a grate
      if (!s.still) {
        for (const p of puffs) {
          p.age += s.dt / 6000;
          if (p.age > 1) {
            p.age -= 1;
            p.sx = (Math.random() - 0.5) * 0.6;
          }
          const a = Math.sin(p.age * Math.PI) * 0.06;
          const rr = (20 + p.age * 90) * k;
          const gx = steam.x + p.sx * rr + Math.sin(p.age * 5 + s.t * 0.0008) * 10;
          const gy = steam.y - p.age * h * 0.35;
          const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
          gr.addColorStop(0, `rgba(200,195,235,${a})`);
          gr.addColorStop(1, "rgba(200,195,235,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
        }
        // rain, and rings where drops land in the light
        drawRain(ctx, drops, w, h, s.dt, 0.18);
        if (Math.random() < 0.35) ripples.push({ x: pool.x + (Math.random() - 0.5) * 220 * k, y: pool.y + (Math.random() - 0.5) * 30 * k, t: 0 });
        ctx.save();
        ctx.lineWidth = 0.7;
        for (let i = ripples.length - 1; i >= 0; i--) {
          const q = ripples[i];
          q.t += s.dt / 700;
          if (q.t > 1) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(255,220,170,${0.45 * (1 - q.t) * L})`;
          ctx.beginPath();
          ctx.ellipse(q.x, q.y, 2 + q.t * 9 * k, (2 + q.t * 9 * k) * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      // top and bottom dissolves
      ctx.save();
      ctx.translate(0, h * 0.12);
      ctx.scale(1, -1);
      ctx.drawImage(d1, 0, 0, w, h * 0.12);
      ctx.restore();
      ctx.drawImage(d2, 0, h - h * 0.14, w, h * 0.14);
    },
  };
};

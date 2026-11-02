import {
  clip,
  cloud,
  cursorWindows,
  dissolve,
  drawTwinkles,
  figure,
  glow,
  hatch,
  layer,
  moon,
  rng,
  speckle,
  stars,
  tower,
  vgrad,
  waterTower,
  type Ctx,
  type SceneFactory,
  type TowerSpec,
  type Twinkle,
  type Win,
} from "./kit";

/**
 * Plate I, the rooftop. A figure stands at the edge of a roof looking out at the city; a
 * towering cloud catches the city's glow from below; the moon sits high on the left above the
 * name. The cloud drifts and glitters, stars and windows twinkle, a beacon blinks, and
 * windows warm up around the cursor.
 */
export const rooftop: SceneFactory = (w, h, dpr) => {
  const r = rng(21);
  const M = 50;
  const E = 90;
  const LW = w + M * 2;
  const LH = h + E;
  const narrow = w < 720;
  const k = narrow ? 0.7 : Math.min(1.25, Math.max(0.8, w / 1440));

  // ---------- sky ----------
  const [sky, sg] = layer(w, h, dpr);
  sg.fillStyle = vgrad(sg, 0, h, [
    [0, "#0a0a24"],
    [0.32, "#17164a"],
    [0.56, "#33286c"],
    [0.74, "#6e3f86"],
    [0.88, "#c06a82"],
    [1, "#f09a76"],
  ]);
  sg.fillRect(0, 0, w, h);
  const tw: Twinkle[] = stars(sg, w, h, r, Math.round((w * h) / 1600), h * 0.7);
  const moonX = narrow ? w * 0.78 : w * 0.31;
  const moonY = h * (narrow ? 0.12 : 0.15);
  moon(sg, moonX, moonY, 9 * k + 2);
  // city glow on the horizon
  glow(sg, w * 0.7, h * 1.02, w * 0.6, "255,150,110", 0.3);

  // ---------- cloud (its own layer so it can drift) ----------
  const cW = narrow ? w * 0.95 : w * 0.46;
  const cH = narrow ? h * 0.5 : h * 0.66;
  const cX = narrow ? w * 0.62 : w * 0.74;
  const cBase = h * (narrow ? 0.7 : 0.8);
  const [cl, cg] = layer(LW, LH, dpr);
  const puffs = cloud(cg, cX + M, cBase + E / 2, cW, cH, r);
  // sparkle points on the lit side of the cloud, re-lit each frame
  const sparks: Twinkle[] = [];
  for (let i = 0; i < 260; i++) {
    const p = puffs[Math.floor(r() * puffs.length)];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * p.r * 0.95;
    const y = p.y + Math.abs(Math.sin(a)) * d * 0.9;
    sparks.push({ x: p.x + Math.cos(a) * d, y, r: 0.5 + r() * 0.7, ph: r() * 6.28, sp: 0.8 + r() * 2.2, a: 0.5 + r() * 0.5, rgb: "255,238,220" });
  }

  // ---------- far skyline: a low violet band with pink haze ----------
  const [far, fg] = layer(LW, LH, dpr);
  {
    const base = LH - E * 0.2;
    let x = -10;
    while (x < LW) {
      const tw2 = (16 + r() * 34) * k;
      const th = h * (0.1 + r() * 0.2);
      tower(
        fg,
        {
          x,
          base,
          w: tw2,
          h: th,
          tiers: 1 + Math.floor(r() * 3),
          crown: (["flat", "steps", "spire", "needle", "mast"] as const)[Math.floor(r() * 5)],
          lit: ["#7f5ca8", "#5a3f8c"],
          side: ["#4c357c", "#3a2b6a"],
          sideW: 0.35,
          hatch: "190,150,220",
          hatchA: 0.08,
          winRate: 0.06,
          winColors: ["#ffc98a", "#ffe0b0"],
          winScale: 0.6 * k + 0.2,
        },
        r,
      );
      x += tw2 + (-4 + r() * 10) * k;
    }
    fg.fillStyle = vgrad(fg, base - h * 0.32, base, [
      [0, "rgba(220,120,140,0)"],
      [1, "rgba(220,120,140,0.55)"],
    ]);
    fg.fillRect(0, 0, LW, LH);
  }

  // ---------- mid towers: the blue-violet deco cluster ----------
  const midOut = { lit: [] as Win[], slots: [] as Win[] };
  const [mid, mg] = layer(LW, LH, dpr);
  {
    const base = LH;
    const specs: { x: number; w: number; h: number; c: TowerSpec["crown"]; tiers: number }[] = [];
    let x = narrow ? -20 : w * 0.34;
    while (x < LW) {
      const tw2 = (34 + r() * 52) * k;
      specs.push({
        x,
        w: tw2,
        h: h * (0.2 + r() * 0.3),
        c: (["flat", "steps", "spire", "dome", "fins", "mast", "steps"] as const)[Math.floor(r() * 7)],
        tiers: 1 + Math.floor(r() * 3),
      });
      x += tw2 + (6 + r() * 30) * k;
    }
    // two signature towers rising into the cloud
    if (!narrow) {
      specs.push({ x: w * 0.82 + M, w: 60 * k, h: h * 0.62, c: "steps", tiers: 3 });
      specs.push({ x: w * 0.56 + M, w: 44 * k, h: h * 0.52, c: "needle", tiers: 3 });
      specs.push({ x: w * 0.69 + M, w: 52 * k, h: h * 0.44, c: "dome", tiers: 2 });
    } else {
      specs.push({ x: w * 0.55, w: 46 * k, h: h * 0.42, c: "steps", tiers: 3 });
    }
    specs.sort((a, b) => b.h - a.h);
    for (const s of specs) {
      tower(
        mg,
        {
          x: s.x,
          base,
          w: s.w,
          h: s.h,
          tiers: s.tiers,
          crown: s.c,
          lit: ["#5b54d6", "#2e2a86"],
          side: ["#2a2577", "#17144a"],
          sideW: 0.34,
          hatch: "150,145,255",
          hatchA: 0.16,
          rib: "190,185,255",
          winRate: 0.08,
          winColors: ["#ffc979", "#ffe2a8", "#ffd49a"],
          winScale: k,
          speck: "220,215,255",
        },
        r,
        midOut,
      );
    }
    // the base of the cluster sinks into evening haze
    mg.save();
    mg.globalCompositeOperation = "source-atop";
    mg.fillStyle = vgrad(mg, base - h * 0.3, base, [
      [0, "rgba(20,16,70,0)"],
      [1, "rgba(20,16,70,0.7)"],
    ]);
    mg.fillRect(0, 0, LW, LH);
    mg.restore();
  }

  // ---------- near: the roof the figure stands on ----------
  const nearOut = { lit: [] as Win[], slots: [] as Win[] };
  const [near, ng] = layer(LW, LH, dpr);
  const roofY = h * (narrow ? 0.82 : 0.8) + E / 2;
  const roofX0 = narrow ? w * 0.2 + M : w * 0.47 + M;
  const figX = narrow ? w * 0.52 + M : w * 0.63 + M;
  {
    // lower rooftops on the left so the name has open sky behind it
    let x = -10;
    const lowBase = LH;
    while (x < roofX0 - 20) {
      const tw2 = (60 + r() * 90) * k;
      tower(
        ng,
        {
          x,
          base: lowBase,
          w: tw2,
          h: h * (0.06 + r() * 0.1),
          tiers: 1,
          crown: "flat",
          lit: ["#3a3299", "#1b1754"],
          side: ["#1e1a5c", "#0f0d36"],
          sideW: 0.3,
          hatch: "140,130,255",
          hatchA: 0.14,
          winRate: 0.12,
          winColors: ["#ffc979", "#ffe2a8"],
          winScale: k * 1.1,
          speck: "210,205,255",
        },
        r,
        nearOut,
      );
      x += tw2 + (8 + r() * 40) * k;
    }
    // the main roof: a parapet, a hatched roof deck seen at a low angle, and the facade below
    const deck = 10 * k + 4;
    ng.fillStyle = vgrad(ng, roofY - deck, roofY, [
      [0, "#6f68ea"],
      [1, "#4a43c4"],
    ]);
    ng.fillRect(roofX0, roofY - deck, LW - roofX0, deck);
    clip(
      ng,
      (c) => c.rect(roofX0, roofY - deck, LW - roofX0, deck),
      () => {
        hatch(ng, roofX0, roofY - deck, LW - roofX0, deck, 1.8, "200,195,255", 0.22, 0, 0.5);
        speckle(ng, roofX0, roofY - deck, LW - roofX0, deck, 14, "235,232,255", 0.1, 0.7, r);
      },
    );
    ng.fillStyle = "#c9c4ff";
    ng.globalAlpha = 0.7;
    ng.fillRect(roofX0, roofY - deck, LW - roofX0, 0.9);
    ng.globalAlpha = 1;
    // facade
    ng.fillStyle = vgrad(ng, roofY, LH, [
      [0, "#231f74"],
      [1, "#0c0a30"],
    ]);
    ng.fillRect(roofX0, roofY, LW - roofX0, LH - roofY);
    clip(
      ng,
      (c) => c.rect(roofX0, roofY, LW - roofX0, LH - roofY),
      () => {
        hatch(ng, roofX0, roofY, LW - roofX0, LH - roofY, 2.4, "150,140,255", 0.14, 0, 0.5);
        speckle(ng, roofX0, roofY, LW - roofX0, LH - roofY, 4, "220,215,255", 0.05, 0.5, r);
      },
    );
    // facade windows in a regular grid
    const gx = 13 * k;
    const gy = 16 * k;
    for (let y = roofY + gy * 0.8; y < LH - 6; y += gy) {
      for (let x2 = roofX0 + gx * 0.6; x2 < LW - 6; x2 += gx) {
        const slot = { x: x2, y, w: 4 * k, h: 6.5 * k, c: "" };
        nearOut.slots.push(slot);
        if (r() < 0.1) {
          const c = r() < 0.8 ? "#ffcd84" : "#fff0cf";
          ng.fillStyle = c;
          ng.fillRect(slot.x, slot.y, slot.w, slot.h);
          nearOut.lit.push({ ...slot, c });
        }
      }
    }
    // rooftop furniture
    waterTower(ng, roofX0 + (LW - roofX0) * 0.78, roofY - deck + 1, 1.5 * k, "#6d66e6", "#2b2680", "rgba(20,16,70,0.6)");
    ng.fillStyle = "#2b2680";
    ng.fillRect(roofX0 + (LW - roofX0) * 0.5, roofY - deck - 8 * k, 14 * k, 8 * k);
    ng.fillStyle = "#6d66e6";
    ng.fillRect(roofX0 + (LW - roofX0) * 0.5, roofY - deck - 8 * k, 9 * k, 8 * k);
    // antenna
    const antX = roofX0 + (LW - roofX0) * 0.93;
    ng.fillStyle = "#2b2680";
    ng.fillRect(antX, roofY - deck - 70 * k, 1.6, 70 * k);
    ng.strokeStyle = "rgba(43,38,128,0.9)";
    ng.lineWidth = 0.6;
    ng.beginPath();
    ng.moveTo(antX + 0.8, roofY - deck - 60 * k);
    ng.lineTo(antX - 16 * k, roofY - deck);
    ng.moveTo(antX + 0.8, roofY - deck - 60 * k);
    ng.lineTo(antX + 14 * k, roofY - deck);
    ng.stroke();
    // the figure, at the edge, its shadow falling right across the deck (moon on the left)
    figure(ng, figX, roofY - deck + 1, 1.25 * k + 0.35, "#0d0b2c", "rgba(14,10,52,0.6)", 1);
  }
  const antenna = { x: roofX0 + (LW - roofX0) * 0.93 + 0.8, y: roofY - (10 * k + 4) - 70 * k };

  // window mask for the cursor glow
  const [mask, mk] = layer(LW, LH, 1);
  mk.fillStyle = "#fff";
  for (const s of [...midOut.slots, ...nearOut.slots]) mk.fillRect(s.x - 0.4, s.y - 0.4, s.w + 0.8, s.h + 0.8);
  const glowBuf = layer(w, h, 1);
  const dis = dissolve(w, h * 0.16, dpr);
  const flick = [...nearOut.lit, ...midOut.lit];
  const off = new Map<number, number>();

  return {
    draw(ctx: Ctx, s) {
      const p = s.progress - 0.5;
      const ox = (f: number) => -M - s.px * f;
      const oy = (f: number) => -E / 2 - p * f - s.py * f * 0.4;

      ctx.drawImage(sky, 0, 0, w, h);
      if (!s.still) drawTwinkles(ctx, tw, s.t);

      ctx.drawImage(far, ox(6), oy(20), LW, LH);

      // the cloud drifts slowly and breathes
      const drift = s.still ? 0 : Math.sin(s.t * 0.00006) * 12;
      const cx = ox(12) + drift;
      const cy = oy(36);
      ctx.drawImage(cl, cx, cy, LW, LH);
      if (!s.still) drawTwinkles(ctx, sparks, s.t, cx, cy);

      const mx = ox(22);
      const my = oy(60);
      ctx.drawImage(mid, mx, my, LW, LH);
      const nx = ox(36);
      const ny = oy(110);
      ctx.drawImage(near, nx, ny, LW, LH);

      // windows switch off and on here and there
      if (!s.still && flick.length) {
        if (Math.random() < 0.18) off.set(Math.floor(Math.random() * flick.length), s.t + 600 + Math.random() * 4000);
        for (const [i, until] of off) {
          if (until < s.t) {
            off.delete(i);
            continue;
          }
          const wv = flick[i];
          const isNear = i < nearOut.lit.length;
          ctx.fillStyle = isNear ? "#241f78" : "#2a2580";
          ctx.fillRect((isNear ? nx : mx) + wv.x, (isNear ? ny : my) + wv.y, wv.w, wv.h);
        }
      }

      // the beacon on the antenna
      if (!s.still) {
        const on = Math.sin(s.t * 0.0035) > 0.55;
        if (on) glow(ctx, nx + antenna.x, ny + antenna.y, 9, "255,70,70", 0.95);
        ctx.fillStyle = on ? "#ff6b6b" : "#6b1f2a";
        ctx.beginPath();
        ctx.arc(nx + antenna.x, ny + antenna.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (s.mx >= 0 && !s.still) cursorWindows(ctx, glowBuf, mask, s.mx, s.my, nx, ny, w, h, LW, LH);

      ctx.drawImage(dis, 0, h - h * 0.16, w, h * 0.16);
    },
  };
};

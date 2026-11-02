"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { Stage } from "./Stages";

/* A small real-time duel: you against a rival wizard, with mana, cooldowns,
   a shield that reflects spells when timed well, and one effect per spell tier
   drawn on a canvas layered over the arena. */

type Side = "p" | "e";
type Phase = "idle" | "playing" | "won" | "lost";

const SPELLS = [
  { n: "Spark", tier: "Common", c: "#e6faff", c2: "#7fdcff", dmg: 5, mana: 6, cd: 0.35 },
  { n: "Frost Shard", tier: "Rare", c: "#dff8ff", c2: "#3cc4ff", dmg: 9, mana: 14, cd: 1.0 },
  { n: "Arcane Orb", tier: "Epic", c: "#f0dcff", c2: "#b06cff", dmg: 14, mana: 24, cd: 1.8 },
  { n: "Thunder Lance", tier: "Legendary", c: "#fffbe0", c2: "#ffd84a", dmg: 20, mana: 34, cd: 3 },
  { n: "Meteor", tier: "Mythic", c: "#ffe0ee", c2: "#ff5aa8", dmg: 28, mana: 48, cd: 5 },
  { n: "Celestial Ruin", tier: "Insane", c: "#ffe6e8", c2: "#ff2a3d", dmg: 45, mana: 80, cd: 10 },
];

type Proj = {
  side: Side;
  s: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  reflected: boolean;
};
type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number };
type Ring = { x: number; y: number; r: number; grow: number; life: number; max: number; color: string; width: number };
type Beam = { pts: number[]; life: number; max: number; color: string; width: number };
type Txt = { x: number; y: number; text: string; color: string; life: number; size: number };
type Pending = { at: number; target: Side; s: number; attacker: Side };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeGame() {
  return {
    php: 100,
    ehp: 100,
    mana: 100,
    cds: [0, 0, 0, 0, 0, 0],
    shield: 0,
    shieldAge: 9,
    shieldCd: 0,
    enemyNext: 2.4,
    tell: -1,
    insane: 0,
    shake: 0,
    clock: 0,
    projs: [] as Proj[],
    parts: [] as Part[],
    rings: [] as Ring[],
    beams: [] as Beam[],
    txts: [] as Txt[],
    pending: [] as Pending[],
  };
}

function Wizard({
  side,
  tipRef,
  bodyRef,
  wrapRef,
}: {
  side: Side;
  tipRef: React.RefObject<SVGCircleElement | null>;
  bodyRef: React.RefObject<SVGCircleElement | null>;
  wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={`wd-wiz wd-${side}`} ref={wrapRef}>
      <svg viewBox="0 0 100 140" aria-hidden="true">
        <ellipse cx="50" cy="134" rx="28" ry="5" className="wd-shadow" />
        <path d="M30 60 Q16 100 12 132 L78 132 Q74 96 64 60 Z" className="wd-cloak" />
        <path d="M35 62 L27 132 L71 132 L63 62 Z" className="wd-robe" />
        <path d="M33 92 L67 92 L68 98 L32 98 Z" className="wd-belt" />
        <path d="M49 62 L49 132" className="wd-seam" />
        <circle cx="49" cy="50" r="10.5" className="wd-skin" />
        <circle cx="54" cy="49" r="1.6" className="wd-eye" />
        <path d="M26 45 Q50 36 74 45 L72 49 Q50 41 28 49 Z" className="wd-hat" />
        <path d="M36 43 Q46 10 70 3 Q60 16 62 43 Z" className="wd-hat" />
        <path d="M38 40 Q50 37 61 40" className="wd-band" />
        <g className="wd-arm">
          <path d="M57 64 Q70 74 79 68" className="wd-sleeve" />
          <circle cx="79" cy="68" r="3.6" className="wd-skin" />
          <path d="M75 100 L84 30" className="wd-staff" />
          <path d="M84 18 L89 27 L84 36 L79 27 Z" className="wd-crystal" />
          <circle cx="84" cy="27" r="2" ref={tipRef} className="wd-anchor" />
        </g>
        <circle cx="49" cy="80" r="2" ref={bodyRef} className="wd-anchor" />
      </svg>
      <span className="wd-shield" />
    </div>
  );
}

export function DuelStage({ image }: { image?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cine, setCine] = useState(false);
  const [imgOk, setImgOk] = useState(Boolean(image));
  const g = useRef(makeGame());
  const phaseRef = useRef<Phase>("idle");

  const arena = useRef<HTMLDivElement>(null);
  const shakeBox = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pTip = useRef<SVGCircleElement>(null);
  const eTip = useRef<SVGCircleElement>(null);
  const pBody = useRef<SVGCircleElement>(null);
  const eBody = useRef<SVGCircleElement>(null);
  const pWiz = useRef<HTMLDivElement>(null);
  const eWiz = useRef<HTMLDivElement>(null);
  const pHp = useRef<HTMLElement>(null);
  const eHp = useRef<HTMLElement>(null);
  const mp = useRef<HTMLElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const shieldBtn = useRef<HTMLButtonElement>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Everything below runs inside one effect so the loop and the input handlers share state through refs.
  const api = useRef<{ cast: (s: number) => void; shield: () => void } | null>(null);

  useEffect(() => {
    const end = (p: Phase) => {
      phaseRef.current = p;
      setPhase(p);
    };
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const box = arena.current!;
    let w = 0;
    let h = 0;
    const resize = () => {
      // Layout size, not the on-screen rect, so the panel's flip-in animation can't skew it
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pt = (el: Element | null) => {
      const a = box.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2 - a.left, y: r.top + r.height / 2 - a.top } : { x: 0, y: 0 };
    };
    const tip = (s: Side) => pt(s === "p" ? pTip.current : eTip.current);
    const body = (s: Side) => pt(s === "p" ? pBody.current : eBody.current);
    const other = (s: Side): Side => (s === "p" ? "e" : "p");

    const sparks = (x: number, y: number, n: number, color: string, speed = 220, size = 3, grav = 0) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = rand(0.3, 1) * speed;
        const life = rand(0.35, 0.8);
        g.current.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: rand(0.6, 1.4) * size, color, grav });
      }
    };
    const ring = (x: number, y: number, color: string, grow = 260, width = 3, life = 0.45) =>
      g.current.rings.push({ x, y, r: 4, grow, life, max: life, color, width });
    const text = (x: number, y: number, t: string, color: string, size = 20) =>
      g.current.txts.push({ x, y, text: t, color, life: 0.95, size });
    const jag = (x1: number, y1: number, x2: number, y2: number, steps: number, amp: number) => {
      const pts: number[] = [x1, y1];
      for (let i = 1; i < steps; i++) {
        const k = i / steps;
        pts.push(x1 + (x2 - x1) * k + rand(-amp, amp) * 0.3, y1 + (y2 - y1) * k + rand(-amp, amp));
      }
      pts.push(x2, y2);
      return pts;
    };
    const flash = (el: HTMLElement | null, cls: string) => {
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    };

    const hit = (target: Side, s: number, attacker: Side, reflected = false) => {
      const G = g.current;
      if (phaseRef.current !== "playing") return;
      const b = body(target);
      const sp = SPELLS[s];
      if (target === "p" && G.shield > 0) {
        ring(b.x, b.y, "#8fd6ff", 180, 4);
        sparks(b.x, b.y, 18, "#bff3ff", 260);
        text(b.x, b.y - 50, "Blocked", "#bff3ff", 18);
        audio.blip(6);
        return;
      }
      const dmg = Math.round(sp.dmg * (attacker === "e" ? 0.8 : 1) * (reflected ? 0.7 : 1) * rand(0.9, 1.1));
      if (target === "p") G.php = Math.max(0, G.php - dmg);
      else G.ehp = Math.max(0, G.ehp - dmg);
      sparks(b.x, b.y, 14 + s * 10, sp.c2, 200 + s * 60, 2.6 + s * 0.5);
      sparks(b.x, b.y, 6 + s * 3, "#ffffff", 140, 2);
      ring(b.x, b.y, sp.c2, 160 + s * 70, 2 + s);
      text(b.x + rand(-14, 14), b.y - 46, `-${dmg}`, sp.c2, 20 + s * 4);
      G.shake = Math.max(G.shake, 3 + s * 3.2);
      flash(target === "p" ? pWiz.current : eWiz.current, "is-hit");
      audio.hit(s >= 4);
      if (G.ehp <= 0) {
        sparks(b.x, b.y, 80, "#ffd84a", 420, 3.5);
        end("won");
        audio.rankUp();
      } else if (G.php <= 0) {
        end("lost");
        audio.back();
      }
    };

    const cast = (side: Side, s: number) => {
      const G = g.current;
      const from = tip(side);
      const to = body(other(side));
      const sp = SPELLS[s];
      flash(side === "p" ? pWiz.current : eWiz.current, "is-cast");
      sparks(from.x, from.y, 8 + s * 2, sp.c2, 120, 2);
      if (s === 3) {
        G.beams.push({ pts: jag(from.x, from.y, to.x, to.y, 14, 26), life: 0.32, max: 0.32, color: sp.c2, width: 4 });
        G.beams.push({ pts: jag(from.x, from.y, to.x, to.y, 10, 18), life: 0.22, max: 0.22, color: "#ffffff", width: 2 });
        G.pending.push({ at: G.clock + 0.06, target: other(side), s, attacker: side });
        audio.hit();
        return;
      }
      if (s === 4) {
        // Meteor: falls from the sky above the target
        const sx = to.x + (side === "p" ? -1 : 1) * w * 0.18;
        const sy = -30;
        const T = 0.6;
        G.projs.push({ side, s, x: sx, y: sy, vx: (to.x - sx) / T, vy: (to.y - sy) / T, t: 0, reflected: false });
        audio.blip(1);
        return;
      }
      const speed = [920, 760, 520][s] ?? 600;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      G.projs.push({ side, s, x: from.x, y: from.y, vx: (dx / d) * speed, vy: (dy / d) * speed, t: 0, reflected: false });
      audio.blip(s + 2);
    };

    const playerCast = (s: number) => {
      const G = g.current;
      if (phaseRef.current !== "playing" || G.insane > 0) return;
      const sp = SPELLS[s];
      if (G.cds[s] > 0 || G.mana < sp.mana) {
        flash(btns.current[s], "is-denied");
        return;
      }
      G.mana -= sp.mana;
      G.cds[s] = sp.cd;
      if (s === 5) {
        G.insane = 1.25;
        setCine(true);
        audio.confirm();
        return;
      }
      cast("p", s);
    };

    const shield = () => {
      const G = g.current;
      if (phaseRef.current !== "playing" || G.shieldCd > 0) return;
      G.shield = 0.7;
      G.shieldAge = 0;
      G.shieldCd = 1.6;
      flash(pWiz.current, "is-shield");
      audio.blip(0);
    };
    api.current = { cast: playerCast, shield };

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      const G = g.current;
      const playing = phaseRef.current === "playing";
      const slow = G.insane > 0 ? 0.18 : 1;
      const dt = real * slow;
      G.clock += dt;

      if (playing) {
        G.mana = Math.min(100, G.mana + 13 * dt);
        G.cds = G.cds.map((c) => Math.max(0, c - dt));
        G.shield = Math.max(0, G.shield - dt);
        G.shieldAge += dt;
        G.shieldCd = Math.max(0, G.shieldCd - dt);

        // Rival AI: telegraphs with a red staff glow, then casts
        G.enemyNext -= dt;
        if (G.tell < 0 && G.enemyNext < 0.42) {
          const roll = Math.random();
          G.tell = roll < 0.4 ? 0 : roll < 0.68 ? 1 : roll < 0.88 ? 2 : 3;
          eWiz.current?.setAttribute("data-tell", String(G.tell));
        }
        if (G.enemyNext <= 0 && G.tell >= 0) {
          cast("e", G.tell);
          G.tell = -1;
          eWiz.current?.removeAttribute("data-tell");
          G.enemyNext = rand(1.1, 2.3) * (G.ehp < 40 ? 0.8 : 1);
        }
      }

      // Insane cutscene: charge, then a beam across the arena
      if (G.insane > 0) {
        const t = tip("p");
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = rand(90, 170);
          const life = 0.5;
          G.parts.push({ x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 2, life, max: life, size: rand(1.5, 3.5), color: Math.random() < 0.5 ? "#ff2a3d" : "#ffd1d6", grav: 0 });
        }
        G.insane -= real;
        if (G.insane <= 0) {
          G.insane = 0;
          setCine(false);
          const e = body("e");
          G.beams.push({ pts: [t.x, t.y, w + 60, e.y], life: 0.7, max: 0.7, color: "#ff2a3d", width: 34 });
          G.beams.push({ pts: [t.x, t.y, w + 60, e.y], life: 0.6, max: 0.6, color: "#ffffff", width: 12 });
          for (let k = 0; k < 4; k++) ring(e.x, e.y, k % 2 ? "#ffffff" : "#ff2a3d", 300 + k * 120, 5, 0.6 + k * 0.1);
          flash(arena.current, "is-flash");
          G.shake = 24;
          hit("e", 5, "p");
        }
      }

      for (let i = G.pending.length - 1; i >= 0; i--) {
        const p = G.pending[i];
        if (G.clock >= p.at) {
          G.pending.splice(i, 1);
          hit(p.target, p.s, p.attacker);
        }
      }

      // Projectiles
      for (let i = G.projs.length - 1; i >= 0; i--) {
        const p = G.projs[i];
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const sp = SPELLS[p.s];
        const wob = p.s === 2 ? Math.sin(p.t * 16) * 9 : 0;
        // trails
        const n = p.s === 4 ? 4 : p.s === 2 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const life = p.s === 4 ? rand(0.3, 0.6) : rand(0.18, 0.35);
          G.parts.push({
            x: p.x + rand(-3, 3),
            y: p.y + wob + rand(-3, 3),
            vx: -p.vx * 0.08 + rand(-30, 30),
            vy: -p.vy * 0.08 + rand(-30, 30) - (p.s === 4 ? 40 : 0),
            life,
            max: life,
            size: p.s === 4 ? rand(3, 6) : rand(1.5, 3),
            color: Math.random() < 0.5 ? sp.c2 : sp.c,
            grav: 0,
          });
        }
        const target = other(p.side);
        const b = body(target);
        if (Math.hypot(b.x - p.x, b.y - (p.y + wob)) < (p.s === 4 ? 30 : 24)) {
          // Perfect block (shield raised within 0.25s) reflects bolts back at the caster
          if (target === "p" && G.shield > 0 && G.shieldAge < 0.25 && p.s <= 2 && !p.reflected) {
            const e = body("e");
            const sp2 = Math.hypot(p.vx, p.vy) * 1.15;
            const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
            p.side = "p";
            p.reflected = true;
            p.vx = ((e.x - p.x) / d) * sp2;
            p.vy = ((e.y - p.y) / d) * sp2;
            ring(p.x, p.y, "#ffffff", 220, 3);
            text(b.x, b.y - 58, "Perfect! Reflected", "#ffd84a", 18);
            audio.confirm();
            continue;
          }
          G.projs.splice(i, 1);
          if (p.s === 4) {
            sparks(b.x, b.y + 10, 40, "#ff8a3d", 380, 4, 300);
            ring(b.x, b.y + 20, "#ff8a3d", 340, 6, 0.6);
          }
          hit(target, p.s, p.reflected ? "p" : p.side, p.reflected);
        } else if (p.x < -80 || p.x > w + 80 || p.y > h + 80) {
          G.projs.splice(i, 1);
        }
      }

      // Draw
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = G.parts.length - 1; i >= 0; i--) {
        const q = G.parts[i];
        q.life -= dt;
        if (q.life <= 0) {
          G.parts.splice(i, 1);
          continue;
        }
        q.vy += q.grav * dt;
        q.vx *= 0.97;
        q.vy *= 0.97;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const k = q.life / q.max;
        ctx.globalAlpha = k;
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of G.projs) {
        const sp = SPELLS[p.s];
        const wob = p.s === 2 ? Math.sin(p.t * 16) * 9 : 0;
        const x = p.x;
        const y = p.y + wob;
        const r = [6, 8, 12, 0, 16][p.s] ?? 8;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.25, sp.c);
        grad.addColorStop(0.55, sp.c2);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        if (p.s === 1) {
          // frost shard: a diamond pointing along its path
          const a = Math.atan2(p.vy, p.vx);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(0, 6);
          ctx.lineTo(-10, 0);
          ctx.lineTo(0, -6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        if (p.s === 2) {
          for (let m = 0; m < 3; m++) {
            const a = p.t * 9 + (m * Math.PI * 2) / 3;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      for (let i = G.beams.length - 1; i >= 0; i--) {
        const b = G.beams[i];
        b.life -= real;
        if (b.life <= 0) {
          G.beams.splice(i, 1);
          continue;
        }
        const k = b.life / b.max;
        ctx.globalAlpha = k * (0.75 + Math.random() * 0.25);
        ctx.strokeStyle = b.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = b.color;
        ctx.shadowBlur = b.width * 1.5;
        ctx.lineWidth = b.width * (0.6 + k * 0.4);
        ctx.beginPath();
        ctx.moveTo(b.pts[0], b.pts[1]);
        for (let j = 2; j < b.pts.length; j += 2) ctx.lineTo(b.pts[j], b.pts[j + 1]);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      for (let i = G.rings.length - 1; i >= 0; i--) {
        const r = G.rings[i];
        r.life -= real;
        if (r.life <= 0) {
          G.rings.splice(i, 1);
          continue;
        }
        r.r += r.grow * real;
        ctx.globalAlpha = r.life / r.max;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = G.txts.length - 1; i >= 0; i--) {
        const t = G.txts[i];
        t.life -= real;
        if (t.life <= 0) {
          G.txts.splice(i, 1);
          continue;
        }
        t.y -= 46 * real;
        const k = t.life / 0.95;
        const pop = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.font = `italic 900 ${Math.round(t.size * pop)}px Archivo, "Arial Narrow", sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(2,6,40,0.9)";
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      // Screen shake and HUD
      G.shake *= 0.86;
      if (shakeBox.current) {
        const s = calm ? 0 : G.shake;
        shakeBox.current.style.transform = s > 0.3 ? `translate(${rand(-s, s)}px, ${rand(-s, s) * 0.6}px)` : "";
      }
      pHp.current?.style.setProperty("--v", String(G.php / 100));
      eHp.current?.style.setProperty("--v", String(G.ehp / 100));
      mp.current?.style.setProperty("--v", String(G.mana / 100));
      pWiz.current?.toggleAttribute("data-shield", G.shield > 0);
      btns.current.forEach((b, i) => {
        if (!b) return;
        b.style.setProperty("--cd", String(G.cds[i] / SPELLS[i].cd));
        b.dataset.ready = String(playing && G.cds[i] <= 0 && G.mana >= SPELLS[i].mana);
      });
      if (shieldBtn.current) {
        shieldBtn.current.style.setProperty("--cd", String(G.shieldCd / 1.6));
        shieldBtn.current.dataset.ready = String(playing && G.shieldCd <= 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Keyboard: 1-6 cast, Space shields (only while a duel is running)
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        api.current?.cast(Number(e.key) - 1);
      } else if (e.key === " ") {
        e.preventDefault();
        api.current?.shield();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const start = () => {
    g.current = makeGame();
    setCine(false);
    eWiz.current?.removeAttribute("data-tell");
    go("playing");
    audio.confirm();
  };

  return (
    <Stage
      hint="Duel a rival wizard: cast, shield, and time a block to reflect"
      note="Spell tiers up to Insane, and Insane cutscenes that play right in the arena, come from the real game."
    >
      <div className="wd" data-phase={phase} data-cine={cine}>
        <div className="wd-arena" ref={arena}>
          <div className="wd-shake" ref={shakeBox}>
            {image && imgOk && (
              // Hosted on Roblox's CDN; the painted sky behind it shows if it ever fails.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="wd-bg" src={image} alt="" loading="lazy" onError={() => setImgOk(false)} />
            )}
            <div className="wd-sky" aria-hidden="true" />
            <Wizard side="p" tipRef={pTip} bodyRef={pBody} wrapRef={pWiz} />
            <Wizard side="e" tipRef={eTip} bodyRef={eBody} wrapRef={eWiz} />
            <canvas className="wd-fx" ref={canvas} aria-hidden="true" />
          </div>

          <div className="wd-hud">
            <div className="wd-side">
              <span className="wd-name">You</span>
              <span className="wd-meter wd-hp" ref={pHp}>
                <i />
              </span>
              <span className="wd-meter wd-mp" ref={mp}>
                <i />
              </span>
            </div>
            <span className="wd-vs">VS</span>
            <div className="wd-side wd-side-r">
              <span className="wd-name">Rival</span>
              <span className="wd-meter wd-hp" ref={eHp}>
                <i />
              </span>
            </div>
          </div>

          <div className="wd-cine" aria-hidden="true">
            <i />
            <i />
            <b>Insane · Celestial Ruin</b>
          </div>

          {phase !== "playing" && (
            <div className="wd-overlay" key={phase}>
              <span className="wd-overlay-kicker">{phase === "idle" ? "Training grounds" : "Duel over"}</span>
              <h4 data-phase={phase}>{phase === "idle" ? "Wizard Duel" : phase === "won" ? "Victory" : "Defeated"}</h4>
              <p>
                {phase === "idle"
                  ? "Cast with the buttons or keys 1 to 6. Shield with Space, and raise it right as a spell lands to reflect it."
                  : phase === "won"
                    ? "The rival is down. Try winning without taking a hit."
                    : "Watch for the red glow on the rival's staff, then shield."}
              </p>
              <button className="hg-btn" onClick={start}>
                {phase === "idle" ? "Start duel" : "Rematch"}
              </button>
            </div>
          )}
        </div>

        <div className="wd-spells">
          {SPELLS.map((s, i) => (
            <button
              key={s.n}
              ref={(el) => {
                btns.current[i] = el;
              }}
              className="wd-spell"
              data-tier={i}
              style={{ "--c": s.c2 } as React.CSSProperties}
              onClick={() => api.current?.cast(i)}
              aria-label={`${s.n}, ${s.tier}, ${s.mana} mana`}
            >
              <kbd>{i + 1}</kbd>
              <b>{s.n}</b>
              <small>{s.mana} MP</small>
              <i className="wd-cd" />
            </button>
          ))}
          <button className="wd-spell wd-shield-btn" ref={shieldBtn} onClick={() => api.current?.shield()}>
            <kbd>SPC</kbd>
            <b>Shield</b>
            <small>Block, reflect</small>
            <i className="wd-cd" />
          </button>
        </div>
      </div>
    </Stage>
  );
}

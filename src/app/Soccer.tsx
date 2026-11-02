"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";

/* Penalty shootout: aim with the pointer, click to start the power meter, click again
   to shoot. More power is harder to save but less accurate, and top corners beat the
   keeper if you can hit them. Five kicks per shootout. */

type Kick = "goal" | "save" | "miss";
type Phase = "aim" | "power" | "flight" | "result" | "over";

const GOAL = { x1: 92, x2: 308, y1: 44, y2: 150 }; // inside of the frame, in SVG units
const SPOT = { x: 200, y: 236 };
const KICKS = 5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function SoccerGame({ onScore }: { onScore: () => void }) {
  const [phase, setPhase] = useState<Phase>("aim");
  const [aim, setAim] = useState({ x: 200, y: 92 });
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [msg, setMsg] = useState<{ text: string; kind: Kick | "info"; n: number }>({
    text: "Move over the goal to aim, then click.",
    kind: "info",
    n: 0,
  });
  const [dive, setDive] = useState<"idle" | "l" | "c" | "r" | "hl" | "hr">("idle");
  const [ripple, setRipple] = useState<{ x: number; y: number; n: number } | null>(null);

  const svg = useRef<SVGSVGElement>(null);
  const ball = useRef<SVGGElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const power = useRef(0);
  const phaseRef = useRef<Phase>("aim");
  const raf = useRef(0);
  const timers = useRef<number[]>([]);

  const set = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const placeBall = (x: number, y: number, r: number, spin: number) => {
    ball.current?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(r / 9).toFixed(3)}) rotate(${spin.toFixed(0)})`);
  };

  const toSvg = (e: React.PointerEvent | React.MouseEvent) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const toScreen = (x: number, y: number) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(x, y).matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const onMove = (e: React.PointerEvent) => {
    if (phaseRef.current !== "aim") return;
    const p = toSvg(e);
    if (!p) return;
    setAim({ x: Math.max(70, Math.min(330, p.x)), y: Math.max(26, Math.min(160, p.y)) });
  };

  const startPower = () => {
    set("power");
    setMsg({ text: "Click again to lock the power.", kind: "info", n: Date.now() });
    audio.blip(2);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = ((now - t0) / 900) % 2;
      power.current = t < 1 ? t : 2 - t;
      meter.current?.style.setProperty("--p", power.current.toFixed(3));
      if (phaseRef.current === "power") raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const shoot = () => {
    cancelAnimationFrame(raf.current);
    set("flight");
    const pw = power.current;
    // Power trades accuracy for speed; overhit shots sail over the bar
    const spread = 6 + pw * pw * 30;
    const fx = aim.x + rand(-spread, spread);
    let fy = aim.y + rand(-spread, spread) * 0.7;
    if (pw > 0.9) fy -= rand(18, 46);
    const speed = 0.3 + pw * 0.7;
    const dur = 900 - pw * 480;

    // Keeper reads the shot sometimes, otherwise guesses
    const zone = fx < 165 ? "l" : fx > 235 ? "r" : "c";
    const guess = Math.random() < 0.4 ? zone : (["l", "c", "r"] as const)[Math.floor(Math.random() * 3)];
    const high = fy < 92;
    const keeperX = guess === "l" ? 138 : guess === "r" ? 262 : 200;
    const reach = 30 + (1 - speed) * 34;
    const inFrame = fx > GOAL.x1 && fx < GOAL.x2 && fy > GOAL.y1 && fy < GOAL.y2;
    const post = !inFrame && (Math.abs(fx - GOAL.x1) < 5 || Math.abs(fx - GOAL.x2) < 5 || Math.abs(fy - GOAL.y1) < 5) && fy < GOAL.y2 + 4;
    const topCorner = fy < 64 && (fx < 128 || fx > 272);
    const saved = inFrame && !topCorner && Math.abs(fx - keeperX) < reach && !(guess !== "c" && fy < 58);
    const result: Kick = !inFrame ? "miss" : saved ? "save" : "goal";

    audio.hit();
    later(() => setDive(guess === "c" ? "c" : high ? (guess === "l" ? "hl" : "hr") : guess), 110);

    // Fly the ball along an arc, shrinking with distance
    const t0 = performance.now();
    const cx = (SPOT.x + fx) / 2 + (fx - SPOT.x) * 0.15;
    const cy = Math.min(SPOT.y, fy) - 40 - pw * 30;
    const endX = result === "save" ? keeperX + (fx - keeperX) * 0.5 : fx;
    const endY = result === "save" ? fy : fy;
    const fly = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 2);
      const x = (1 - e) * (1 - e) * SPOT.x + 2 * (1 - e) * e * cx + e * e * endX;
      const y = (1 - e) * (1 - e) * SPOT.y + 2 * (1 - e) * e * cy + e * e * endY;
      placeBall(x, y, 9 - e * 4.2, e * 900);
      if (k < 1) raf.current = requestAnimationFrame(fly);
      else land(result, fx, fy, post);
    };
    raf.current = requestAnimationFrame(fly);
  };

  const land = (result: Kick, fx: number, fy: number, post: boolean) => {
    set("result");
    const next = [...kicks, result];
    setKicks(next);
    if (result === "goal") {
      setRipple({ x: fx, y: fy, n: Date.now() });
      setMsg({ text: "GOAL!", kind: "goal", n: Date.now() });
      const s = toScreen(fx, fy);
      burst(s.x, s.y, 26);
      audio.rankUp();
      onScore();
    } else if (result === "save") {
      setMsg({ text: "Saved! The keeper read it.", kind: "save", n: Date.now() });
      // parry it away
      const t0 = performance.now();
      const dir = fx < 200 ? -1 : 1;
      const parry = (now: number) => {
        const k = Math.min(1, (now - t0) / 500);
        placeBall(fx + dir * k * 80, fy + k * 70 - Math.sin(k * Math.PI) * 30, 4.8 + k * 1.2, 900 + k * 400);
        if (k < 1) raf.current = requestAnimationFrame(parry);
      };
      raf.current = requestAnimationFrame(parry);
      audio.hit();
    } else {
      setMsg({ text: post ? "Off the post!" : fy < GOAL.y1 ? "Over the bar!" : "Wide!", kind: "miss", n: Date.now() });
      audio.back();
    }
    later(() => {
      setDive("idle");
      setRipple(null);
      placeBall(SPOT.x, SPOT.y, 9, 0);
      if (next.length >= KICKS) {
        const goals = next.filter((k) => k === "goal").length;
        set("over");
        setMsg({
          text: `${goals}/${KICKS}. ${goals === 5 ? "Perfect shootout." : goals >= 4 ? "Clinical." : goals >= 3 ? "You win it." : "The keeper had your number."}`,
          kind: goals >= 3 ? "goal" : "save",
          n: Date.now(),
        });
      } else {
        set("aim");
        setMsg({ text: `Kick ${next.length + 1} of ${KICKS}. Aim, click, click.`, kind: "info", n: Date.now() });
      }
    }, 1500);
  };

  const onClick = (e: React.MouseEvent) => {
    if (phaseRef.current === "aim") {
      const p = toSvg(e);
      if (p) setAim({ x: Math.max(70, Math.min(330, p.x)), y: Math.max(26, Math.min(160, p.y)) });
      startPower();
    } else if (phaseRef.current === "power") shoot();
  };

  const reset = () => {
    setKicks([]);
    set("aim");
    setMsg({ text: "New shootout. Move over the goal to aim, then click.", kind: "info", n: Date.now() });
    audio.confirm();
  };

  const goals = kicks.filter((k) => k === "goal").length;

  return (
    <div className="hg sc2" data-phase={phase}>
      <svg
        ref={svg}
        className="sc2-scene"
        viewBox="0 0 400 260"
        onPointerMove={onMove}
        onClick={onClick}
        role="img"
        aria-label="Penalty kick. Click to aim, click again to shoot."
      >
        <defs>
          <pattern id="sc2-net" width="9" height="9" patternUnits="userSpaceOnUse">
            <path d="M0 0 L9 9 M9 0 L0 9" className="sc2-netline" />
          </pattern>
          <pattern id="sc2-crowd" width="14" height="12" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.6" fill="#3a4fb8" />
            <circle cx="11" cy="9" r="2.6" fill="#1d2a78" />
          </pattern>
          <linearGradient id="sc2-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#13824a" />
            <stop offset="1" stopColor="#0b5e34" />
          </linearGradient>
        </defs>

        {/* stands and pitch */}
        {/* drawn wider than the viewBox so wide panels show more stadium instead of empty bars */}
        <rect x="-400" y="-200" width="1200" height="260" fill="#0a1450" />
        <rect x="-400" y="-200" width="1200" height="258" fill="url(#sc2-crowd)" opacity="0.8" />
        <rect x="-400" y="54" width="1200" height="10" fill="#e5172f" />
        <text x="200" y="62" className="sc2-board">NOURELDIN.DEV · NOURELDIN.DEV · NOURELDIN.DEV · NOURELDIN.DEV · NOURELDIN.DEV</text>
        <rect x="-400" y="64" width="1200" height="400" fill="url(#sc2-grass)" />
        {[-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <polygon
            key={i}
            points={`${-120 + i * 110},260 ${-50 + i * 110},260 ${110 + i * 36},64 ${128 + i * 36},64`}
            fill="rgba(255,255,255,0.04)"
          />
        ))}
        <path d="M-400 150 L800 150" className="sc2-line" opacity="0.5" />
        <path d="M40 260 L96 150 L304 150 L360 260" className="sc2-line" />
        <path d="M124 150 L118 172 L282 172 L276 150" className="sc2-line" />
        <ellipse cx={SPOT.x} cy={SPOT.y + 6} rx="5" ry="2" fill="#fff" opacity="0.9" />

        {/* goal: back netting, frame */}
        <g className="sc2-goal" data-shake={!!ripple} key={ripple?.n ?? "g"}>
          <path d="M92 44 L110 58 L290 58 L308 44 Z" fill="url(#sc2-net)" opacity="0.6" />
          <rect x="92" y="44" width="216" height="106" fill="url(#sc2-net)" />
          <path d="M92 150 L110 140 L110 58 M308 150 L290 140 L290 58" className="sc2-depth" />
        </g>
        {ripple && <circle key={ripple.n} cx={ripple.x} cy={ripple.y} r="4" className="sc2-ripple" />}
        <path d="M89 152 L89 41 L311 41 L311 152" className="sc2-frame" />

        {/* keeper */}
        <g transform="translate(200 150)">
          <g className="sc2-keeper" data-dive={dive}>
          <g className="sc2-keeper-body">
            <rect x="-7" y="-26" width="5" height="26" rx="2" fill="#111" />
            <rect x="2" y="-26" width="5" height="26" rx="2" fill="#111" />
            <rect x="-9" y="-36" width="18" height="12" rx="3" fill="#1a1a1a" />
            <path d="M-11 -58 Q0 -62 11 -58 L10 -34 L-10 -34 Z" fill="#ffd84a" />
            <path d="M-11 -56 L-23 -70 M11 -56 L23 -70" className="sc2-arm" />
            <circle cx="-24" cy="-71" r="4.5" fill="#3cff8a" />
            <circle cx="24" cy="-71" r="4.5" fill="#3cff8a" />
            <circle cx="0" cy="-66" r="6.5" fill="#d9a77d" />
            <path d="M-6.5 -68 Q0 -76 6.5 -68" fill="#2a1a10" />
          </g>
          </g>
        </g>

        {/* aim reticle */}
        {(phase === "aim" || phase === "power") && (
          <g className="sc2-aim" transform={`translate(${aim.x} ${aim.y})`}>
            <circle r="10" />
            <circle r="3" className="sc2-aim-dot" />
            <path d="M-16 0 L-12 0 M12 0 L16 0 M0 -16 L0 -12 M0 12 L0 16" />
          </g>
        )}

        {/* ball */}
        <g ref={ball} className="sc2-ball" transform={`translate(${SPOT.x} ${SPOT.y})`}>
          <ellipse cx="0" cy="10" rx="8" ry="2.4" fill="rgba(0,0,0,0.35)" />
          <circle r="9" fill="#fff" stroke="#222" strokeWidth="0.8" />
          <path d="M0 -4 L3.8 -1.2 L2.4 3.2 L-2.4 3.2 L-3.8 -1.2 Z" fill="#1b1b1b" />
          <path d="M0 -9 L0 -4 M7.6 -3 L3.8 -1.2 M5 7.2 L2.4 3.2 M-5 7.2 L-2.4 3.2 M-7.6 -3 L-3.8 -1.2" stroke="#1b1b1b" strokeWidth="1" />
        </g>

        <text x="200" y="120" className="sc2-callout" data-kind={msg.kind} key={msg.n}>
          {phase === "result" ? { goal: "GOAL!", save: "SAVED!", miss: "MISS!", info: "" }[msg.kind] : ""}
        </text>
      </svg>

      <div className="sc2-hud">
        <div className="sc2-power" ref={meter} data-on={phase === "power"} aria-hidden="true">
          <span>Power</span>
          <div>
            <i />
          </div>
        </div>
        <ol className="sc2-kicks" aria-label={`${goals} goals from ${kicks.length} kicks`}>
          {Array.from({ length: KICKS }, (_, i) => (
            <li key={i} data-k={kicks[i] ?? "none"} />
          ))}
        </ol>
      </div>
      <div className="gm-row">
        <p className="hg-flash" data-kind={msg.kind === "goal" ? "good" : msg.kind === "info" ? "idle" : "bad"} key={msg.n} aria-live="polite">
          {msg.text}
        </p>
        {phase === "over" && (
          <button className="hg-btn" onClick={reset}>
            New shootout
          </button>
        )}
      </div>
    </div>
  );
}

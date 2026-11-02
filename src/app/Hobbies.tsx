"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";

type GameProps = { onScore: () => void };

/** Short-lived message that replays its pop-in animation every time it changes. */
function useFlash() {
  const [flash, setFlash] = useState<{ text: string; kind: "good" | "bad"; n: number } | null>(null);
  const show = (text: string, kind: "good" | "bad") => setFlash({ text, kind, n: Date.now() });
  return [flash, show] as const;
}

function Flash({ flash, idle }: { flash: ReturnType<typeof useFlash>[0]; idle: string }) {
  return (
    <p className="hg-flash" data-kind={flash?.kind ?? "idle"} key={flash?.n ?? 0} aria-live="polite">
      {flash?.text ?? idle}
    </p>
  );
}

const useTimers = () => {
  const t = useRef<number[]>([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  return (fn: () => void, ms: number) => t.current.push(window.setTimeout(fn, ms));
};

/* ---------- Gaming: hit the critical window ---------- */

export function GamingGame({ onScore }: GameProps) {
  const bar = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const [combo, setCombo] = useState(0);
  const [flash, show] = useFlash();

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 820) % 2;
      pos.current = t < 1 ? t : 2 - t;
      bar.current?.style.setProperty("--p", pos.current.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const strike = (e: React.MouseEvent) => {
    const p = pos.current;
    if (p > 0.42 && p < 0.58) {
      setCombo((c) => c + 1);
      show(combo >= 2 ? `${combo + 1} hit combo! One more!` : "Critical! One more!", "good");
      burst(e.clientX, e.clientY, 14);
      audio.hit(true);
      onScore();
    } else {
      setCombo(0);
      show(p < 0.42 ? "Too early. Miss!" : "Too late. Miss!", "bad");
      audio.back();
    }
  };

  return (
    <div className="hg hg-gaming">
      <div className="gm-bar" ref={bar}>
        <span className="gm-zone" />
        <span className="gm-needle" />
      </div>
      <div className="gm-row">
        <button className="hg-btn gm-attack" onClick={strike}>
          Attack
        </button>
        <span className="gm-combo">
          Combo <b>{combo}</b>
        </span>
      </div>
      <Flash flash={flash} idle="Hit Attack when the needle is inside the window." />
    </div>
  );
}

/* ---------- Rock climbing: follow the route before you pump out ---------- */

const ROUTE = [
  { x: 32, y: 84 },
  { x: 62, y: 70 },
  { x: 38, y: 56 },
  { x: 66, y: 42 },
  { x: 42, y: 28 },
  { x: 58, y: 13 },
];
const DECOYS = [
  { x: 14, y: 72 },
  { x: 84, y: 60 },
  { x: 18, y: 42 },
  { x: 84, y: 28 },
  { x: 52, y: 48 },
  { x: 26, y: 18 },
];

export function ClimbingGame({ onScore }: GameProps) {
  const [at, setAt] = useState(-1);
  const [pump, setPump] = useState(1);
  const [flash, show] = useFlash();
  const later = useTimers();
  const climbing = at >= 0 && at < ROUTE.length - 1;

  const fall = (text: string) => {
    setAt(-1);
    setPump(1);
    show(text, "bad");
    audio.back();
  };

  useEffect(() => {
    if (!climbing) return;
    const id = window.setInterval(() => setPump((p) => Math.max(0, p - 0.03)), 100);
    return () => clearInterval(id);
  }, [climbing]);

  useEffect(() => {
    if (pump <= 0 && climbing) fall("Pumped out! Fell off the wall.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pump, climbing]);

  const grab = (i: number, e: React.MouseEvent) => {
    if (at === ROUTE.length - 1) return;
    if (i !== at + 1) return fall("Wrong hold. Slipped!");
    setAt(i);
    setPump((p) => Math.min(1, p + 0.1));
    audio.blip(i + 1);
    if (i === ROUTE.length - 1) {
      show("Sent it! Top out.", "good");
      burst(e.clientX, e.clientY, 18);
      audio.hit(true);
      onScore();
      later(() => {
        setAt(-1);
        setPump(1);
      }, 1400);
    }
  };

  const me = at >= 0 ? ROUTE[at] : { x: 50, y: 97 };

  return (
    <div className="hg hg-climb">
      <div className="cl-wall">
        {DECOYS.map((d, i) => (
          <button
            key={`d${i}`}
            className="cl-hold"
            data-kind="decoy"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            onClick={(e) => grab(-9, e)}
            aria-label="Off-route hold"
          />
        ))}
        {ROUTE.map((h, i) => (
          <button
            key={`r${i}`}
            className="cl-hold"
            data-kind="route"
            data-next={i === at + 1}
            data-done={i <= at}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            onClick={(e) => grab(i, e)}
            aria-label={`Route hold ${i + 1}`}
          />
        ))}
        <span className="cl-me" style={{ left: `${me.x}%`, top: `${me.y}%` }} aria-hidden="true" />
        <span className="cl-top" aria-hidden="true">TOP</span>
      </div>
      <div className="cl-side">
        <span className="cl-label">Grip</span>
        <div className="cl-pump">
          <i style={{ "--v": pump } as React.CSSProperties} />
        </div>
      </div>
      <Flash flash={flash} idle="Climb the blue holds from the bottom before your grip runs out." />
    </div>
  );
}

/* ---------- Soccer: beat the keeper ---------- */

export function SoccerGame({ onScore }: GameProps) {
  const [shot, setShot] = useState<{ c: number; r: number } | null>(null);
  const [keeper, setKeeper] = useState<number | null>(null);
  const [tally, setTally] = useState({ goals: 0, shots: 0 });
  const [flash, show] = useFlash();
  const later = useTimers();

  const shoot = (c: number, r: number) => {
    if (shot) return;
    setShot({ c, r });
    audio.hit();
    const dive = Math.floor(Math.random() * 3);
    later(() => setKeeper(dive), 80);
    later(() => {
      const goal = dive !== c;
      setTally((t) => ({ goals: t.goals + (goal ? 1 : 0), shots: t.shots + 1 }));
      if (goal) {
        show("GOAL!", "good");
        audio.rankUp();
        onScore();
      } else {
        show("Saved! The keeper guessed right.", "bad");
        audio.back();
      }
    }, 520);
    later(() => {
      setShot(null);
      setKeeper(null);
    }, 1500);
  };

  const ballStyle = shot
    ? { left: `${18 + shot.c * 32}%`, bottom: `${shot.r === 0 ? 62 : 40}%`, "--z": 0.55 }
    : { left: "50%", bottom: "4%", "--z": 1 };

  return (
    <div className="hg hg-soccer">
      <div className="sc-pitch">
        <div className="sc-goal">
          {[0, 1].map((r) =>
            [0, 1, 2].map((c) => (
              <button
                key={`${c}${r}`}
                className="sc-target"
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
                onClick={() => shoot(c, r)}
                disabled={!!shot}
                aria-label={`Shoot ${r === 0 ? "high" : "low"} ${["left", "centre", "right"][c]}`}
              />
            )),
          )}
          <span className="sc-keeper" data-dive={keeper ?? "none"} aria-hidden="true">
            <i />
          </span>
        </div>
        <span className="sc-ball" style={ballStyle as React.CSSProperties} aria-hidden="true" />
      </div>
      <p className="sc-tally">
        <b>{tally.goals}</b> goals from <b>{tally.shots}</b> shots
      </p>
      <Flash flash={flash} idle="Pick a corner of the goal to take a penalty." />
    </div>
  );
}

/* ---------- Fashion: build a fit and get it rated ---------- */

const TOPS = [
  { n: "White tee", c: "#f4f4f4", kind: "tee" },
  { n: "Black hoodie", c: "#18181c", kind: "hoodie" },
  { n: "Navy jacket", c: "#16246e", kind: "jacket" },
  { n: "Cream knit", c: "#ece2cc", kind: "knit" },
  { n: "Red tee", c: "#d8152c", kind: "tee" },
];
const BOTTOMS = [
  { n: "Black jeans", c: "#141416", kind: "jeans" },
  { n: "Blue denim", c: "#4470ad", kind: "jeans" },
  { n: "Khaki chinos", c: "#c4ad80", kind: "chinos" },
  { n: "Grey cargos", c: "#7b828c", kind: "cargo" },
];
const SHOES = [
  { n: "White sneakers", c: "#f6f6f6" },
  { n: "Black boots", c: "#161616" },
  { n: "Red runners", c: "#d8152c" },
];

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

function rateFit(t: number, b: number, s: number) {
  const top = TOPS[t];
  const bottom = BOTTOMS[b];
  const shoe = SHOES[s];
  let score = 6;
  if (Math.abs(lum(top.c) - lum(bottom.c)) > 0.3) score += 2;
  const reds = [top.c, shoe.c].filter((c) => c === "#d8152c").length;
  if (reds === 1) score += 1;
  if (reds === 2) score += 2;
  if (Math.abs(lum(shoe.c) - lum(top.c)) < 0.12 || Math.abs(lum(shoe.c) - lum(bottom.c)) < 0.12) score += 1;
  if (top.kind === "knit" && bottom.kind === "chinos") score -= 2;
  if (top.kind === "jacket" && bottom.kind === "jeans" && b === 1) score -= 1;
  return Math.max(4, Math.min(10, score));
}
const VERDICT: Record<number, string> = {
  10: "10/10. Runway ready.",
  9: "9/10. Clean.",
  8: "8/10. Drip confirmed.",
  7: "7/10. Solid, needs one more pop.",
  6: "6/10. Safe. Try more contrast.",
  5: "5/10. Bold choice.",
  4: "4/10. Let's not.",
};

export function FashionGame({ onScore }: GameProps) {
  const [pick, setPick] = useState({ t: 1, b: 3, s: 0 });
  const [flash, show] = useFlash();
  const top = TOPS[pick.t];
  const bottom = BOTTOMS[pick.b];
  const shoe = SHOES[pick.s];

  const cycle = (k: "t" | "b" | "s", dir: 1 | -1) => {
    const len = k === "t" ? TOPS.length : k === "b" ? BOTTOMS.length : SHOES.length;
    setPick((p) => ({ ...p, [k]: (p[k] + dir + len) % len }));
    audio.blip(k === "t" ? 1 : k === "b" ? 3 : 5);
  };

  const check = (e: React.MouseEvent) => {
    const r = rateFit(pick.t, pick.b, pick.s);
    show(VERDICT[r], r >= 8 ? "good" : "bad");
    if (r >= 8) {
      burst(e.clientX, e.clientY, 14);
      audio.rankUp();
      onScore();
    } else audio.back();
  };

  const rows: { k: "t" | "b" | "s"; label: string; name: string }[] = [
    { k: "t", label: "Top", name: top.n },
    { k: "b", label: "Bottom", name: bottom.n },
    { k: "s", label: "Shoes", name: shoe.n },
  ];

  return (
    <div className="hg hg-fashion">
      <svg className="fs-fig" viewBox="0 0 120 220" aria-label={`${top.n}, ${bottom.n}, ${shoe.n}`} role="img">
        <circle cx="60" cy="24" r="15" className="fs-skin" />
        <rect x="54" y="37" width="12" height="9" className="fs-skin" />
        {/* legs */}
        <path
          d={bottom.kind === "cargo" ? "M34 112 L30 196 L56 196 L60 132 L64 196 L90 196 L86 112 Z" : "M36 112 L34 196 L56 196 L60 132 L64 196 L86 196 L84 112 Z"}
          fill={bottom.c}
          className="fs-piece"
        />
        {bottom.kind === "cargo" && <path d="M30 150 h12 v16 h-12 Z M78 150 h12 v16 h-12 Z" className="fs-detail" />}
        {/* torso and arms */}
        <path
          d={
            top.kind === "tee"
              ? "M30 46 L90 46 L106 76 L94 82 L86 68 L86 116 L34 116 L34 68 L26 82 L14 76 Z"
              : "M30 46 L90 46 L104 110 L92 112 L86 70 L86 118 L34 118 L34 70 L28 112 L16 110 Z"
          }
          fill={top.c}
          className="fs-piece"
        />
        {top.kind === "hoodie" && <path d="M44 46 Q60 70 76 46 M52 58 L52 76 M68 58 L68 76" className="fs-detail" />}
        {top.kind === "jacket" && <path d="M60 46 L60 118 M48 46 L60 62 L72 46" className="fs-detail" />}
        {top.kind === "knit" && <path d="M34 108 L86 108 M34 112 L86 112" className="fs-detail" />}
        {/* shoes */}
        <path d="M30 196 L58 196 L58 206 L24 206 Q24 198 30 196 Z M62 196 L90 196 Q96 198 96 206 L62 206 Z" fill={shoe.c} className="fs-piece" />
      </svg>
      <div className="fs-controls">
        {rows.map((r) => (
          <div className="fs-row" key={r.k}>
            <button className="fs-arrow" onClick={() => cycle(r.k, -1)} aria-label={`Previous ${r.label}`}>
              ◀
            </button>
            <span className="fs-name">
              <small>{r.label}</small>
              {r.name}
            </span>
            <button className="fs-arrow" onClick={() => cycle(r.k, 1)} aria-label={`Next ${r.label}`}>
              ▶
            </button>
          </div>
        ))}
        <button className="hg-btn" onClick={check}>
          Fit check
        </button>
        <Flash flash={flash} idle="Mix a fit, then get it rated. 8 or higher ranks up." />
      </div>
    </div>
  );
}

/* ---------- Day trading: paper-money candlestick chart ---------- */

type Candle = { o: number; h: number; l: number; c: number };
const nextCandle = (prev: number): Candle => {
  const o = prev;
  const c = Math.max(20, o + (Math.random() - 0.48) * 3.2);
  return { o, c, h: Math.max(o, c) + Math.random() * 1.2, l: Math.min(o, c) - Math.random() * 1.2 };
};
const seedCandles = () => {
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < 30; i++) {
    const k = nextCandle(p);
    out.push(k);
    p = k.c;
  }
  return out;
};
const SHARES = 50;

export function TradingGame({ onScore }: GameProps) {
  const [candles, setCandles] = useState<Candle[]>(seedCandles);
  const [entry, setEntry] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [flash, show] = useFlash();

  useEffect(() => {
    const id = window.setInterval(
      () => setCandles((cs) => [...cs.slice(-29), nextCandle(cs[cs.length - 1].c)]),
      650,
    );
    return () => clearInterval(id);
  }, []);

  const price = candles[candles.length - 1].c;
  const lo = Math.min(...candles.map((k) => k.l), entry ?? Infinity);
  const hi = Math.max(...candles.map((k) => k.h), entry ?? -Infinity);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo || 1)) * 124;
  const open = entry !== null ? (price - entry) * SHARES : 0;

  const trade = (e: React.MouseEvent) => {
    if (entry === null) {
      setEntry(price);
      show(`Bought ${SHARES} shares at $${price.toFixed(2)}`, "good");
      audio.blip(4);
      return;
    }
    const pnl = (price - entry) * SHARES;
    setTotal((t) => t + pnl);
    setEntry(null);
    if (pnl > 0) {
      show(`Sold for +$${pnl.toFixed(2)}. Green day.`, "good");
      burst(e.clientX, e.clientY, 14);
      audio.rankUp();
      onScore();
    } else {
      show(`Sold for -$${Math.abs(pnl).toFixed(2)}. Plan the exit next time.`, "bad");
      audio.back();
    }
  };

  return (
    <div className="hg hg-trade">
      <div className="tr-head">
        <span className="tr-ticker">NOUR</span>
        <span className="tr-price">${price.toFixed(2)}</span>
        <span className="tr-pnl" data-up={open >= 0}>
          {entry !== null ? `${open >= 0 ? "+" : "-"}$${Math.abs(open).toFixed(2)} open` : "No position"}
        </span>
      </div>
      <svg className="tr-chart" viewBox="0 0 300 140" preserveAspectRatio="none" aria-label="Price chart" role="img">
        {entry !== null && <line className="tr-entry" x1="0" x2="300" y1={y(entry)} y2={y(entry)} />}
        {candles.map((k, i) => {
          const x = 5 + i * 9.8;
          const up = k.c >= k.o;
          return (
            <g key={i} className="tr-candle" data-up={up}>
              <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} />
              <rect x={x - 3} width="6" y={y(Math.max(k.o, k.c))} height={Math.max(1, Math.abs(y(k.o) - y(k.c)))} />
            </g>
          );
        })}
      </svg>
      <div className="tr-row">
        <button className="hg-btn" data-kind={entry === null ? "buy" : "sell"} onClick={trade}>
          {entry === null ? "Buy" : "Sell"}
        </button>
        <span className="tr-total" data-up={total >= 0}>
          Session {total >= 0 ? "+" : "-"}${Math.abs(total).toFixed(2)}
        </span>
      </div>
      <Flash flash={flash} idle="Paper money, fake ticker. Buy low, sell high, close in profit to rank up." />
    </div>
  );
}

/* ---------- Harry Potter: type a spell to cast it ---------- */

const SPELLS: Record<string, string> = {
  lumos: "Lumos! Light at the tip of the wand.",
  nox: "Nox. Lights out.",
  "wingardium leviosa": "Wingardium Leviosa! The feather floats.",
  expelliarmus: "Expelliarmus! Disarmed.",
  protego: "Protego! Shield up.",
};

export function PotterGame({ onScore }: GameProps) {
  const [text, setText] = useState("");
  const [light, setLight] = useState(false);
  const [fx, setFx] = useState<{ spell: string; n: number } | null>(null);
  const [learned, setLearned] = useState<string[]>([]);
  const [flash, show] = useFlash();

  const cast = (raw: string) => {
    const spell = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!spell) return;
    setText("");
    if (!(spell in SPELLS)) {
      show(spell.includes("levio") ? "Close. Check the pronunciation." : "Nothing happened.", "bad");
      audio.back();
      return;
    }
    if (spell === "lumos") setLight(true);
    if (spell === "nox") setLight(false);
    setFx({ spell, n: Date.now() });
    show(SPELLS[spell], "good");
    audio.hit(spell === "expelliarmus");
    if (!learned.includes(spell)) {
      setLearned((l) => [...l, spell]);
      audio.rankUp();
      onScore();
    }
  };

  return (
    <div className="hg hg-potter">
      <div className="hp-scene" data-light={light} data-fx={fx?.spell ?? "none"} key={fx?.n ?? 0}>
        <svg className="hp-wand" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M14 108 L92 30" className="hp-stick" />
          <path d="M14 108 L30 92" className="hp-grip" />
          <circle cx="94" cy="28" r="5" className="hp-tip" />
        </svg>
        <span className="hp-glow" aria-hidden="true" />
        <svg className="hp-feather" viewBox="0 0 40 80" aria-hidden="true">
          <path d="M20 4 C 34 20, 32 52, 20 72 C 8 52, 6 20, 20 4 Z" />
          <path d="M20 10 L20 78" className="hp-quill" />
        </svg>
        <span className="hp-bolt" aria-hidden="true" />
        <svg className="hp-enemy" viewBox="0 0 60 60" aria-hidden="true">
          <path d="M8 52 L50 10" />
        </svg>
        <span className="hp-shield" aria-hidden="true" />
      </div>
      <form
        className="hp-form"
        onSubmit={(e) => {
          e.preventDefault();
          cast(text);
        }}
      >
        <input
          className="hp-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a spell and press Enter"
          aria-label="Type a spell"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="hg-btn" type="submit">
          Cast
        </button>
      </form>
      <div className="hp-book">
        {Object.keys(SPELLS).map((s) => (
          <button key={s} className="hp-chip" data-learned={learned.includes(s)} onClick={() => cast(s)}>
            {s}
          </button>
        ))}
      </div>
      <Flash flash={flash} idle="Every new spell you cast ranks this up." />
    </div>
  );
}

/* ---------- Community: fill the room ---------- */

export function CommunityGame({ onScore }: GameProps) {
  const [count, setCount] = useState(0);
  const [flash, show] = useFlash();

  const promote = (e: React.MouseEvent) => {
    if (count >= 100) {
      setCount(0);
      show("New event. Doors open.", "good");
      audio.confirm();
      return;
    }
    const next = Math.min(100, count + 7 + Math.floor(Math.random() * 9));
    setCount(next);
    burst(e.clientX, e.clientY, 8);
    audio.bubble();
    const milestone = Math.floor(next / 25) > Math.floor(count / 25);
    if (milestone) {
      audio.rankUp();
      onScore();
    }
    show(next >= 100 ? "Full house! 100 people showed up." : `${next} people and counting.`, "good");
  };

  return (
    <div className="hg hg-community">
      <div className="cm-room" aria-label={`${count} of 100 attendees`} role="img">
        {Array.from({ length: 100 }, (_, i) => (
          <i key={i} data-in={i < count} style={{ "--k": i % 10 } as React.CSSProperties} />
        ))}
      </div>
      <div className="gm-row">
        <button className="hg-btn" onClick={promote}>
          {count >= 100 ? "Run another event" : "Promote the event"}
        </button>
        <span className="gm-combo">
          <b>{count}</b> / 100
        </span>
      </div>
      <Flash flash={flash} idle="Promote the bi-weekly event and fill the room." />
    </div>
  );
}

export const GAMES: Record<string, (p: GameProps) => React.ReactElement> = {
  gaming: GamingGame,
  climbing: ClimbingGame,
  soccer: SoccerGame,
  fashion: FashionGame,
  trading: TradingGame,
  potter: PotterGame,
  community: CommunityGame,
};

"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";
import { FashionGame } from "./Fashion";
import { SoccerGame } from "./Soccer";

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

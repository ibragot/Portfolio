"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";

/** Frame shared by every playable demo: a label strip, the toy itself, and a footnote. */
export function Stage({
  hint,
  note,
  className = "",
  children,
}: {
  hint: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`stage ${className}`}>
      <div className="stage-top">
        <span className="stage-label">Try it</span>
        <span className="stage-hint">{hint}</span>
      </div>
      <div className="stage-body">{children}</div>
      {note && <p className="stage-note">{note}</p>}
    </div>
  );
}

/* ================= AI Movie Recommender: a 2D taste map ================= */

type Film = { t: string; yr: number; v: [number, number] };

// x: feel-good (-) to intense (+); y: grounded (-) to fantastical (+)
const FILMS: Film[] = [
  { t: "Toy Story", yr: 1995, v: [-0.8, 0.55] },
  { t: "The Matrix", yr: 1999, v: [0.75, 0.75] },
  { t: "Titanic", yr: 1997, v: [-0.3, -0.75] },
  { t: "Pulp Fiction", yr: 1994, v: [0.85, -0.5] },
  { t: "Spirited Away", yr: 2001, v: [-0.5, 0.9] },
  { t: "The Dark Knight", yr: 2008, v: [0.85, 0.2] },
  // Candidates the demo can recommend
  { t: "Shrek", yr: 2001, v: [-0.9, 0.7] },
  { t: "Fight Club", yr: 1999, v: [0.9, -0.25] },
  { t: "Forrest Gump", yr: 1994, v: [-0.45, -0.6] },
  { t: "Jurassic Park", yr: 1993, v: [0.3, 0.55] },
  { t: "Inception", yr: 2010, v: [0.5, 0.75] },
  { t: "Finding Nemo", yr: 2003, v: [-0.85, 0.4] },
  { t: "Gladiator", yr: 2000, v: [0.6, -0.35] },
  { t: "Interstellar", yr: 2014, v: [0.15, 0.9] },
  { t: "The Shawshank Redemption", yr: 1994, v: [0.1, -0.85] },
  { t: "The Lion King", yr: 1994, v: [-0.65, 0.25] },
];
const RATEABLE = 6;
const toMap = (v: readonly [number, number], k = 78) => [100 + v[0] * k, 100 - v[1] * k] as const;

export function RecommenderStage() {
  const [votes, setVotes] = useState<Record<number, 1 | -1>>({});

  let ux = 0;
  let uy = 0;
  for (const [i, s] of Object.entries(votes)) {
    ux += FILMS[+i].v[0] * s;
    uy += FILMS[+i].v[1] * s;
  }
  const len = Math.hypot(ux, uy);
  const user = len > 0.001 ? ([ux / len, uy / len] as const) : null;
  const picks = user
    ? FILMS.map((f, i) => ({ f, i, cos: (f.v[0] * user[0] + f.v[1] * user[1]) / Math.hypot(...f.v) }))
        .filter((p) => p.i >= RATEABLE)
        .sort((a, b) => b.cos - a.cos)
        .slice(0, 3)
    : [];
  const pickIds = new Set(picks.map((p) => p.i));
  const [yx, yy] = user ? toMap(user, 70) : [100, 100];

  const vote = (i: number, s: 1 | -1) => {
    audio.blip(s === 1 ? 4 : 1);
    setVotes((prev) => {
      const next = { ...prev };
      if (next[i] === s) delete next[i];
      else next[i] = s;
      return next;
    });
  };

  return (
    <Stage
      hint="Rate a few movies and watch your taste move"
      note="Demo with 2 dimensions and 16 movies. The real model learns 64 dimensions from 100,836 ratings."
    >
      <div className="rec">
        <ul className="rec-rate">
          {FILMS.slice(0, RATEABLE).map((f, i) => (
            <li key={f.t} data-vote={votes[i] ?? 0}>
              <span className="rec-title">
                {f.t} <small>{f.yr}</small>
              </span>
              <button
                className="rec-btn"
                data-kind="like"
                aria-label={`Like ${f.t}`}
                aria-pressed={votes[i] === 1}
                onClick={() => vote(i, 1)}
              >
                ♥
              </button>
              <button
                className="rec-btn"
                data-kind="nah"
                aria-label={`Dislike ${f.t}`}
                aria-pressed={votes[i] === -1}
                onClick={() => vote(i, -1)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className="rec-out">
          <svg className="rec-map" viewBox="0 0 200 200" role="img" aria-label="Taste map of movies">
            <line className="rec-axis" x1="100" y1="10" x2="100" y2="190" />
            <line className="rec-axis" x1="10" y1="100" x2="190" y2="100" />
            <text className="rec-axis-label" x="12" y="96">feel-good</text>
            <text className="rec-axis-label" x="188" y="96" textAnchor="end">intense</text>
            <text className="rec-axis-label" x="104" y="16">fantastical</text>
            <text className="rec-axis-label" x="104" y="190">grounded</text>
            {picks.map((p) => {
              const [x, y] = toMap(p.f.v);
              return <line key={p.i} className="rec-link" x1={yx} y1={yy} x2={x} y2={y} />;
            })}
            {FILMS.map((f, i) => {
              const [x, y] = toMap(f.v);
              const state =
                votes[i] === 1 ? "like" : votes[i] === -1 ? "nah" : pickIds.has(i) ? "pick" : "idle";
              return (
                <circle key={f.t} className="rec-dot" data-state={state} cx={x} cy={y} r={state === "pick" ? 5.5 : 3.6}>
                  <title>{f.t}</title>
                </circle>
              );
            })}
            <g className="rec-you" style={{ transform: `translate(${yx}px, ${yy}px)` }} data-on={!!user}>
              <circle r="7" />
              <text y="-11" textAnchor="middle">
                YOU
              </text>
            </g>
          </svg>
          <ol className="rec-picks" aria-live="polite">
            {user ? (
              picks.map((p, k) => {
                const m = Math.round(((p.cos + 1) / 2) * 100);
                return (
                  <li key={p.i} style={{ "--m": m / 100, "--k": k } as React.CSSProperties}>
                    <span>{p.f.t}</span>
                    <b>{m}%</b>
                    <i />
                  </li>
                );
              })
            ) : (
              <li className="rec-empty">Rate a movie to get your top 3</li>
            )}
          </ol>
        </div>
      </div>
    </Stage>
  );
}

/* ================= Tilawah: word-by-word recitation feedback ================= */

const VERSE = [
  { ar: "بِسْمِ", tr: "bismi", score: 97 },
  { ar: "ٱللَّهِ", tr: "allāhi", score: 94 },
  { ar: "ٱلرَّحْمَٰنِ", tr: "ar-raḥmāni", score: 92 },
  { ar: "ٱلرَّحِيمِ", tr: "ar-raḥīm", score: 78 },
];

export function TilawahStage() {
  const [phase, setPhase] = useState<"idle" | "listen" | "done">("idle");
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const recite = () => {
    timers.current.forEach(clearTimeout);
    setPhase("listen");
    setStep(0);
    audio.confirm();
    timers.current = VERSE.map((_, k) =>
      window.setTimeout(() => {
        setStep(k + 1);
        audio.blip(k + 2);
      }, 750 * (k + 1)),
    );
    timers.current.push(
      window.setTimeout(() => {
        setPhase("done");
        audio.rankUp();
      }, 750 * VERSE.length + 350),
    );
  };

  const avg = Math.round(VERSE.reduce((s, w) => s + w.score, 0) / VERSE.length);

  return (
    <Stage
      hint="Press recite and watch every word get scored"
      note="Simulated feedback for this demo. The real app transcribes your voice with Azure Speech and scores it with Gemini."
    >
      <div className="tl" data-phase={phase}>
        <p className="tl-verse" dir="rtl" lang="ar">
          {VERSE.map((w, i) => {
            const state =
              i < step ? (w.score >= 90 ? "good" : "fix") : i === step && phase === "listen" ? "now" : "idle";
            return (
              <span key={w.ar} className="tl-word" data-state={state}>
                <span className="tl-ar">{w.ar}</span>
                <span className="tl-tr" dir="ltr">
                  {w.tr}
                </span>
                <span className="tl-score" dir="ltr">
                  {i < step ? `${w.score}%` : " "}
                </span>
              </span>
            );
          })}
        </p>
        <p className="tl-trans">In the name of God, the Most Compassionate, the Most Merciful.</p>
        <div className="tl-row">
          <button className="tl-mic" onClick={recite} disabled={phase === "listen"}>
            <span className="tl-mic-dot" aria-hidden="true" />
            {phase === "listen" ? "Listening" : phase === "done" ? "Recite again" : "Recite"}
          </button>
          <div className="tl-wave" aria-hidden="true">
            {Array.from({ length: 30 }, (_, i) => (
              <i
                key={i}
                style={{ "--d": `${(i * 137) % 900}ms`, "--h": 0.25 + ((i * 53) % 75) / 100 } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        {phase === "done" && (
          <div className="tl-result" role="status">
            <b>{avg}%</b>
            <span>
              accuracy. Tip for <span lang="ar">ٱلرَّحِيمِ</span>: stretch the long ī before the stop (madd), 2 to 6
              counts.
            </span>
          </div>
        )}
      </div>
    </Stage>
  );
}

/* ================= MSA Library: one catalog, many shelves ================= */

const ORGS = ["MSA", "Org B", "Org C"];
const BOOKS = [
  { t: "The Sealed Nectar", org: 0, c: "#e5172f", h: 92 },
  { t: "Riyad as-Salihin", org: 0, c: "#0f8a5f", h: 100 },
  { t: "Fortress of the Muslim", org: 0, c: "#ffd84a", h: 78 },
  { t: "Purification of the Heart", org: 1, c: "#3cc4ff", h: 96 },
  { t: "In the Footsteps of the Prophet", org: 1, c: "#ff5aa8", h: 100 },
  { t: "Reclaim Your Heart", org: 1, c: "#ffffff", h: 84 },
  { t: "Don't Be Sad", org: 2, c: "#b06cff", h: 88 },
  { t: "The Book of Assistance", org: 2, c: "#ff8a3d", h: 94 },
  { t: "Stories of the Prophets", org: 2, c: "#1d55e8", h: 100 },
];

export function LibraryStage() {
  const [loans, setLoans] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);

  const query = q.trim().toLowerCase();
  const matches = query ? BOOKS.map((b, i) => (b.t.toLowerCase().includes(query) ? i : -1)).filter((i) => i >= 0) : [];
  const matchOrgs = new Set(matches.map((i) => BOOKS[i].org));

  const toggle = (i: number, e: React.MouseEvent) => {
    const b = BOOKS[i];
    const out = !loans.includes(i);
    setLoans((l) => (out ? [...l, i] : l.filter((x) => x !== i)));
    setToast({ text: out ? `Borrowed "${b.t}" from ${ORGS[b.org]}` : `Returned "${b.t}" to ${ORGS[b.org]}`, n: Date.now() });
    if (out) {
      burst(e.clientX, e.clientY, 8);
      audio.confirm();
    } else audio.back();
  };

  return (
    <Stage
      hint="Search the shared catalog and borrow a book"
      note="Every organization keeps its own shelf. Everyone searches one catalog."
    >
      <div className="lib">
        <div className="lib-top">
          <input
            className="lib-search"
            type="search"
            placeholder="Search all shelves"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search all shelves"
          />
          <span className="lib-count">
            {query
              ? `${matches.length} match${matches.length === 1 ? "" : "es"} across ${matchOrgs.size} org${matchOrgs.size === 1 ? "" : "s"}`
              : `${BOOKS.length - loans.length} of ${BOOKS.length} available`}
          </span>
        </div>
        <div className="lib-shelves">
          {ORGS.map((org, o) => (
            <div className="lib-shelf" key={org}>
              <div className="lib-books">
                {BOOKS.map((b, i) =>
                  b.org !== o ? null : (
                    <button
                      key={b.t}
                      className="lib-book"
                      data-loan={loans.includes(i)}
                      data-dim={!!query && !matches.includes(i)}
                      data-hit={!!query && matches.includes(i)}
                      aria-pressed={loans.includes(i)}
                      aria-label={`${b.t}, ${org}${loans.includes(i) ? ", on loan" : ""}`}
                      style={{ "--c": b.c, "--h": `${b.h}%` } as React.CSSProperties}
                      onClick={(e) => toggle(i, e)}
                    >
                      <span>{b.t}</span>
                    </button>
                  ),
                )}
              </div>
              <span className="lib-org">{org}</span>
            </div>
          ))}
        </div>
        <p className="lib-toast" aria-live="polite" key={toast?.n}>
          {toast?.text ?? "Click a spine to borrow it, click again to return it."}
        </p>
      </div>
    </Stage>
  );
}

/* ================= Wizard Duel: cast spells at a training dummy ================= */

const TIERS = [
  { n: "Common", c: "#d6e2ea", d: 40 },
  { n: "Rare", c: "#3cc4ff", d: 85 },
  { n: "Epic", c: "#b06cff", d: 140 },
  { n: "Legendary", c: "#ffd84a", d: 220 },
  { n: "Mythic", c: "#ff5aa8", d: 330 },
  { n: "Insane", c: "#ff2a3d", d: 620 },
];
const MAX_HP = 1000;

export function DuelStage({ image }: { image?: string }) {
  const [hp, setHp] = useState(MAX_HP);
  const [shots, setShots] = useState<{ id: number; t: number }[]>([]);
  const [pops, setPops] = useState<{ id: number; dmg: number; t: number; dx: number }[]>([]);
  const [cine, setCine] = useState(false);
  const [ko, setKo] = useState(false);
  const [shake, setShake] = useState(0);
  const [imgOk, setImgOk] = useState(Boolean(image));
  const hpRef = useRef(MAX_HP);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const cast = (t: number) => {
    if (ko || (t === 5 && cine)) return;
    const id = ++seq.current;
    if (t === 5) {
      setCine(true);
      audio.confirm();
      later(() => setShots((s) => [...s, { id, t }]), 700);
      later(() => setCine(false), 1650);
    } else {
      audio.blip(t + 1);
      setShots((s) => [...s, { id, t }]);
    }
  };

  const land = (id: number, t: number) => {
    setShots((s) => s.filter((x) => x.id !== id));
    const dmg = Math.round(TIERS[t].d * (0.9 + Math.random() * 0.2));
    hpRef.current = Math.max(0, hpRef.current - dmg);
    setHp(hpRef.current);
    setShake((n) => n + 1);
    setPops((p) => [...p, { id, dmg, t, dx: Math.round(Math.random() * 40 - 20) }]);
    audio.hit(t >= 4);
    later(() => setPops((p) => p.filter((x) => x.id !== id)), 950);
    if (hpRef.current === 0) {
      setKo(true);
      audio.rankUp();
      later(() => {
        hpRef.current = MAX_HP;
        setHp(MAX_HP);
        setKo(false);
      }, 1800);
    }
  };

  return (
    <Stage hint="Pick a spell tier and cast it at the training dummy" note="Insane spells play a cutscene right in the arena, just like the game.">
      <div className="duel" data-cine={cine}>
        <div className="duel-tiers">
          {TIERS.map((t, i) => (
            <button
              key={t.n}
              className="duel-tier"
              style={{ "--c": t.c } as React.CSSProperties}
              onClick={() => cast(i)}
              disabled={ko}
            >
              {t.n}
            </button>
          ))}
        </div>
        <div className="duel-arena">
          {image && imgOk && (
            // Hosted on Roblox's CDN; the gradient behind it shows if it ever stops loading.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="duel-bg" src={image} alt="" loading="lazy" onError={() => setImgOk(false)} />
          )}
          <svg className="duel-wizard" viewBox="0 0 60 100" aria-hidden="true">
            <path d="M30 4 L44 34 L16 34 Z" className="duel-hat" />
            <path d="M8 34 L52 34" className="duel-brim" />
            <circle cx="30" cy="42" r="8" className="duel-face" />
            <path d="M14 98 L22 52 L38 52 L46 98 Z" className="duel-robe" />
            <path d="M40 58 L54 40" className="duel-staff" />
            <circle cx="55" cy="38" r="3.5" className="duel-tip" />
          </svg>
          <div className="duel-target">
            <div className="duel-hp" aria-label={`Dummy health ${hp} of ${MAX_HP}`}>
              <i style={{ "--hp": hp / MAX_HP } as React.CSSProperties} />
              <span>{hp}</span>
            </div>
            <svg className="duel-dummy" viewBox="0 0 60 100" aria-hidden="true" key={`s${shake}`} data-hit={shake > 0}>
              <path d="M30 60 L30 98 M18 98 L42 98" className="duel-post" />
              <rect x="14" y="20" width="32" height="44" rx="12" className="duel-sack" />
              <circle cx="30" cy="12" r="9" className="duel-sack" />
              <circle cx="30" cy="42" r="10" className="duel-ring" />
              <circle cx="30" cy="42" r="4" className="duel-ring" />
            </svg>
            {pops.map((p) => (
              <span
                key={p.id}
                className="duel-pop"
                data-big={p.t >= 4}
                style={{ "--c": TIERS[p.t].c, "--dx": `${p.dx}px` } as React.CSSProperties}
              >
                {p.dmg}
              </span>
            ))}
          </div>
          {shots.map((s) => (
            <span
              key={s.id}
              className="duel-shot"
              data-tier={s.t}
              style={{ "--c": TIERS[s.t].c, "--s": 0.7 + s.t * 0.22 } as React.CSSProperties}
              onAnimationEnd={() => land(s.id, s.t)}
            />
          ))}
          <div className="duel-cine" aria-hidden="true">
            <i />
            <i />
            <b>Insane spell</b>
          </div>
          {ko && <div className="duel-ko">K.O.</div>}
        </div>
      </div>
    </Stage>
  );
}

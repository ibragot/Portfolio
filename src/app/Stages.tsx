"use client";

import { useState } from "react";
import { audio } from "./audio";

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

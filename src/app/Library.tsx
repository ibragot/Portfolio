"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";
import { Stage } from "./Stages";

/* One catalog shared by several organizations: each keeps its own shelf, anyone can
   search all of them, borrow, return or place a hold, and every change shows up in a
   live activity feed the way Supabase realtime pushes it to every client. */

const ORGS = [
  { name: "MSA", mark: "M", c: "#3cc4ff" },
  { name: "Org B", mark: "B", c: "#ff5aa8" },
  { name: "Org C", mark: "C", c: "#ffd84a" },
];

type Book = { id: number; t: string; a: string; org: number; c: string; h: number; w: number };
const BOOKS: Book[] = [
  { id: 0, t: "The Sealed Nectar", a: "Safiur Rahman Mubarakpuri", org: 0, c: "#a3162a", h: 92, w: 34 },
  { id: 1, t: "Riyad as-Salihin", a: "Imam an-Nawawi", org: 0, c: "#0f6b4b", h: 100, w: 40 },
  { id: 2, t: "Fortress of the Muslim", a: "Sa'id al-Qahtani", org: 0, c: "#c99a2e", h: 74, w: 26 },
  { id: 3, t: "Purification of the Heart", a: "Hamza Yusuf", org: 1, c: "#1d55e8", h: 88, w: 30 },
  { id: 4, t: "In the Footsteps of the Prophet", a: "Tariq Ramadan", org: 1, c: "#5b2a86", h: 98, w: 36 },
  { id: 5, t: "Reclaim Your Heart", a: "Yasmin Mogahed", org: 1, c: "#e9e1cf", h: 82, w: 28 },
  { id: 6, t: "Don't Be Sad", a: "Aaidh al-Qarni", org: 2, c: "#2d7f8f", h: 90, w: 38 },
  { id: 7, t: "The Book of Assistance", a: "Imam al-Haddad", org: 2, c: "#7a4a21", h: 80, w: 26 },
  { id: 8, t: "Stories of the Prophets", a: "Ibn Kathir", org: 2, c: "#0a1fa8", h: 100, w: 42 },
];

type Status = { by: "you" | "other" | null; due?: string; holds: number; youHold: boolean };
type Log = { id: number; org: number; text: string; you: boolean };

const fmtDue = () =>
  new Date(Date.now() + 14 * 864e5).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
const light = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
};

export function LibraryStage() {
  const [status, setStatus] = useState<Record<number, Status>>(() => ({
    4: { by: "other", due: "Nov 9", holds: 1, youHold: false },
    7: { by: "other", due: "Nov 12", holds: 0, youHold: false },
  }));
  const [q, setQ] = useState("");
  const [org, setOrg] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [log, setLog] = useState<Log[]>([
    { id: 1, org: 1, text: "Someone borrowed “In the Footsteps of the Prophet”", you: false },
    { id: 2, org: 2, text: "Someone borrowed “The Book of Assistance”", you: false },
  ]);
  const seq = useRef(3);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const st = (id: number): Status => status[id] ?? { by: null, holds: 0, youHold: false };
  const push = (org: number, text: string, you: boolean) =>
    setLog((l) => [{ id: seq.current++, org, text, you }, ...l].slice(0, 5));

  // Other organizations keep using the catalog while you browse
  useEffect(() => {
    const id = window.setInterval(() => {
      const cur = statusRef.current;
      const pool = BOOKS.filter((b) => cur[b.id]?.by !== "you");
      const b = pool[Math.floor(Math.random() * pool.length)];
      if (!b) return;
      const s = cur[b.id] ?? { by: null, holds: 0, youHold: false };
      if (s.by === "other") {
        if (s.youHold) {
          setStatus((x) => ({ ...x, [b.id]: { by: "you", due: fmtDue(), holds: Math.max(0, s.holds - 1), youHold: false } }));
          push(b.org, `“${b.t}” came back. Your hold is ready, it's yours`, true);
          audio.rankUp();
        } else {
          setStatus((x) => ({ ...x, [b.id]: { ...s, by: null, due: undefined } }));
          push(b.org, `Someone returned “${b.t}”`, false);
        }
      } else {
        setStatus((x) => ({ ...x, [b.id]: { ...s, by: "other", due: fmtDue() } }));
        push(b.org, `Someone borrowed “${b.t}”`, false);
      }
    }, 6500);
    return () => clearInterval(id);
  }, []);

  const query = q.trim().toLowerCase();
  const match = (b: Book) =>
    (org === null || b.org === org) && (!query || b.t.toLowerCase().includes(query) || b.a.toLowerCase().includes(query));
  const shown = BOOKS.filter(match);
  const mine = BOOKS.filter((b) => st(b.id).by === "you");
  const holds = BOOKS.filter((b) => st(b.id).youHold);
  const book = sel !== null ? BOOKS[sel] : null;
  const bs = book ? st(book.id) : null;

  const act = (kind: "borrow" | "return" | "hold", e: React.MouseEvent) => {
    if (!book || !bs) return;
    const o = ORGS[book.org].name;
    if (kind === "borrow") {
      setStatus((x) => ({ ...x, [book.id]: { ...bs, by: "you", due: fmtDue() } }));
      push(book.org, `You borrowed “${book.t}” from ${o}`, true);
      burst(e.clientX, e.clientY, 12);
      audio.confirm();
    } else if (kind === "return") {
      setStatus((x) => ({ ...x, [book.id]: { ...bs, by: null, due: undefined } }));
      push(book.org, `You returned “${book.t}” to ${o}`, true);
      audio.back();
    } else {
      setStatus((x) => ({ ...x, [book.id]: { ...bs, holds: bs.holds + (bs.youHold ? -1 : 1), youHold: !bs.youHold } }));
      push(book.org, bs.youHold ? `You cancelled your hold on “${book.t}”` : `You placed a hold on “${book.t}” (#${bs.holds + 1} in line)`, true);
      audio.blip(4);
    }
  };

  return (
    <Stage
      hint="Search every organization's shelf, then borrow, return or place a hold"
      note="5+ organizations share one Supabase catalog. Changes from other orgs stream in live, like the feed on the right."
    >
      <div className="lb">
        <div className="lb-top">
          <input
            className="lb-search"
            type="search"
            placeholder="Search titles or authors"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search titles or authors"
          />
          <div className="lb-orgs" role="group" aria-label="Filter by organization">
            <button data-on={org === null} onClick={() => setOrg(null)}>
              All
            </button>
            {ORGS.map((o, i) => (
              <button
                key={o.name}
                data-on={org === i}
                style={{ "--c": o.c } as React.CSSProperties}
                onClick={() => {
                  setOrg(org === i ? null : i);
                  audio.blip(i + 1);
                }}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>

        <div className="lb-main">
          <div className="lb-shelves">
            {ORGS.map((o, oi) => (
              <div className="lb-shelf" key={o.name} data-dim={org !== null && org !== oi}>
                <span className="lb-org" style={{ "--c": o.c } as React.CSSProperties}>
                  <i>{o.mark}</i>
                  {o.name}
                </span>
                <div className="lb-row">
                  {BOOKS.filter((b) => b.org === oi).map((b) => {
                    const s = st(b.id);
                    return (
                      <button
                        key={b.id}
                        className="lb-book"
                        data-out={s.by !== null}
                        data-you={s.by === "you"}
                        data-hit={!!query && match(b)}
                        data-dim={(!!query || org !== null) && !match(b)}
                        data-sel={sel === b.id}
                        style={
                          {
                            "--c": b.c,
                            "--h": `${b.h}%`,
                            "--w": `${b.w}px`,
                            "--ink": light(b.c) ? "#1b1b1b" : "#fff",
                          } as React.CSSProperties
                        }
                        onClick={() => {
                          setSel(sel === b.id ? null : b.id);
                          audio.blip(b.id % 6);
                        }}
                        aria-label={`${b.t} by ${b.a}, ${o.name}, ${s.by ? "on loan" : "available"}`}
                      >
                        <span className="lb-band" />
                        <span className="lb-title">{b.t}</span>
                        <span className="lb-band" />
                        <span className="lb-mark">{o.mark}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="lb-count">
              {query || org !== null
                ? `${shown.length} match${shown.length === 1 ? "" : "es"}`
                : `${BOOKS.filter((b) => !st(b.id).by).length} of ${BOOKS.length} on the shelves`}
            </p>
          </div>

          <aside className="lb-side">
            {book && bs ? (
              <div className="lb-card" key={book.id}>
                <button className="lb-close" onClick={() => setSel(null)} aria-label="Close">
                  ✕
                </button>
                <div className="lb-cover" style={{ "--c": book.c, "--ink": light(book.c) ? "#1b1b1b" : "#fff" } as React.CSSProperties}>
                  <span>{book.t}</span>
                  <small>{book.a}</small>
                </div>
                <p className="lb-meta">
                  <span className="lb-pill" data-kind={bs.by ?? "free"}>
                    {bs.by === "you" ? `Yours until ${bs.due}` : bs.by === "other" ? `On loan, due ${bs.due}` : "Available"}
                  </span>
                  <span>Shelf: {ORGS[book.org].name}</span>
                  {bs.holds > 0 && <span>{bs.holds} on hold</span>}
                </p>
                {bs.by === null && (
                  <button className="hg-btn" onClick={(e) => act("borrow", e)}>
                    Borrow
                  </button>
                )}
                {bs.by === "you" && (
                  <button className="hg-btn" onClick={(e) => act("return", e)}>
                    Return
                  </button>
                )}
                {bs.by === "other" && (
                  <button className="hg-btn" onClick={(e) => act("hold", e)}>
                    {bs.youHold ? "Cancel hold" : "Place hold"}
                  </button>
                )}
              </div>
            ) : (
              <div className="lb-cardholder">
                <span className="lb-card-k">Library card</span>
                <b>Guest reader</b>
                {mine.length === 0 && holds.length === 0 ? (
                  <p>Nothing borrowed yet. Click a spine to open it.</p>
                ) : (
                  <ul>
                    {mine.map((b) => (
                      <li key={b.id}>
                        <i style={{ background: b.c }} />
                        <span>{b.t}</span>
                        <small>due {st(b.id).due}</small>
                      </li>
                    ))}
                    {holds.map((b) => (
                      <li key={`h${b.id}`} data-hold="true">
                        <i style={{ background: b.c }} />
                        <span>{b.t}</span>
                        <small>on hold</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="lb-feed">
              <span className="lb-live">
                <i /> Live across orgs
              </span>
              <ul aria-live="polite">
                {log.map((l) => (
                  <li key={l.id} data-you={l.you}>
                    <b style={{ color: ORGS[l.org].c }}>{ORGS[l.org].name}</b> {l.text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </Stage>
  );
}

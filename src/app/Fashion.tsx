"use client";

import { useRef, useState } from "react";
import { audio } from "./audio";
import { burst } from "./Bubbles";

/* Fit builder: pick a style and a colour for each piece, add accessories, then get
   judged on colour, contrast and silhouette. 8/10 or better ranks the hobby up. */

const COLORS = [
  { n: "White", c: "#f4f4f2", neutral: true },
  { n: "Cream", c: "#ece2cc", neutral: true },
  { n: "Grey", c: "#8a9099", neutral: true },
  { n: "Charcoal", c: "#3a3d44", neutral: true },
  { n: "Black", c: "#17171a", neutral: true },
  { n: "Navy", c: "#1b2a63", neutral: true },
  { n: "Denim", c: "#4a72aa", neutral: true },
  { n: "Khaki", c: "#c4ad80", neutral: true },
  { n: "Brown", c: "#6e4a2e", neutral: true },
  { n: "Olive", c: "#5b6b3a", neutral: true },
  { n: "Red", c: "#d8152c", neutral: false },
  { n: "Ocean", c: "#1d55e8", neutral: false },
  { n: "Pink", c: "#ff5aa8", neutral: false },
];

const TOPS = ["Tee", "Hoodie", "Bomber", "Knit", "Overshirt"] as const;
const BOTTOMS = ["Straight jeans", "Baggy jeans", "Cargos", "Chinos", "Shorts"] as const;
const SHOES = ["Sneakers", "Runners", "Boots", "Loafers"] as const;
const EXTRAS = ["Cap", "Beanie", "Chain", "Bag", "Shades"] as const;
type Extra = (typeof EXTRAS)[number];

type Fit = {
  top: number;
  topC: number;
  bottom: number;
  bottomC: number;
  shoe: number;
  shoeC: number;
  extras: Extra[];
  extraC: number;
};

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)} ${f((n >> 8) & 255)} ${f(n & 255)})`;
};
const clamp = (v: number) => Math.max(1, Math.min(10, v));

function judge(f: Fit) {
  const wear = f.extras.some((e) => e === "Cap" || e === "Beanie" || e === "Bag");
  const cols = [f.topC, f.bottomC, f.shoeC, ...(wear ? [f.extraC] : [])];
  const accents = cols.filter((i) => !COLORS[i].neutral);
  const kinds = new Set(accents).size;
  const colour = kinds === 0 ? 8 : kinds === 1 ? (accents.length >= 2 ? 10 : 9) : kinds === 2 ? 5 : 3;

  const diff = Math.abs(lum(COLORS[f.topC].c) - lum(COLORS[f.bottomC].c));
  const contrast = f.topC === f.bottomC ? 7 : diff > 0.4 ? 10 : diff > 0.25 ? 8 : diff > 0.12 ? 6 : 4;

  const top = TOPS[f.top];
  const bottom = BOTTOMS[f.bottom];
  const shoe = SHOES[f.shoe];
  const bigTop = top === "Hoodie" || top === "Bomber";
  const wide = bottom === "Baggy jeans" || bottom === "Cargos";
  let sil = 8;
  if (wide && !bigTop) sil = 10;
  else if (!wide && bigTop) sil = 9;
  else if (wide && bigTop) sil = 7;
  if (bottom === "Shorts" && shoe === "Boots") sil = 4;
  if (shoe === "Loafers" && wide) sil -= 2;
  if (shoe === "Loafers" && top === "Overshirt" && bottom === "Chinos") sil = 10;
  if (f.extras.includes("Cap") && f.extras.includes("Beanie")) sil -= 3;
  if (f.extras.length > 3) sil -= 2;
  sil = clamp(sil);

  const shoeTie =
    COLORS[f.shoeC].n === "White" ||
    f.shoeC === f.topC ||
    f.shoeC === f.bottomC ||
    (wear && f.shoeC === f.extraC);
  const total = clamp(Math.round((colour + contrast + sil) / 3 + (shoeTie ? 0.5 : 0)));

  const worst = Math.min(colour, contrast, sil);
  const tip =
    total >= 9
      ? "Nothing to fix. Post it."
      : worst === colour
        ? "Too many loud colours fighting. Keep it to one accent."
        : worst === contrast
          ? "Top and bottom blend together. Go lighter or darker on one."
          : f.extras.includes("Cap") && f.extras.includes("Beanie")
            ? "Cap and beanie at once? Pick one."
            : "The proportions are off. Pair a fitted top with a wide leg, or the other way round.";
  return { colour, contrast, sil, total, tip };
}

const VERDICT = ["", "Tragic.", "Rough.", "Rough.", "Not it.", "Mid.", "Safe.", "Solid.", "Drip confirmed.", "Clean.", "Runway ready."];

function Figure({ f, pose }: { f: Fit; pose: number }) {
  const top = TOPS[f.top];
  const bottom = BOTTOMS[f.bottom];
  const shoe = SHOES[f.shoe];
  const tc = COLORS[f.topC].c;
  const bc = COLORS[f.bottomC].c;
  const sc = COLORS[f.shoeC].c;
  const xc = COLORS[f.extraC].c;
  const td = shade(tc, -0.22);
  const bd = shade(bc, -0.25);
  const sd = shade(sc, -0.3);
  const skin = "#c98e68";
  const skinD = "#a8714f";
  const has = (e: Extra) => f.extras.includes(e);
  const longSleeve = top !== "Tee";

  const legs =
    bottom === "Baggy jeans"
      ? "M71 192 L129 192 L133 222 L135 340 L104 342 L101 230 L99 230 L96 342 L65 340 L67 222 Z"
      : bottom === "Cargos"
        ? "M71 192 L129 192 L132 222 L133 334 L104 336 L101 230 L99 230 L96 336 L67 334 L68 222 Z"
        : bottom === "Chinos"
          ? "M74 192 L126 192 L126 214 L120 338 L104 338 L101 224 L99 224 L96 338 L80 338 L74 214 Z"
          : bottom === "Shorts"
            ? "M73 192 L127 192 L131 262 L104 265 L100 228 L96 265 L69 262 Z"
            : "M73 192 L127 192 L128 214 L124 338 L104 338 L101 224 L99 224 L96 338 L76 338 L72 214 Z";

  const shoePath =
    shoe === "Boots"
      ? "M76 320 L98 320 L100 349 Q98 355 70 355 Q63 355 66 345 L76 336 Z"
      : shoe === "Loafers"
        ? "M74 341 L100 341 L101 350 Q98 354 72 354 Q65 353 69 346 Z"
        : shoe === "Runners"
          ? "M73 336 L99 336 L102 348 Q100 355 69 355 Q62 354 65 346 Z"
          : "M72 336 L100 336 L102 349 Q100 356 70 356 Q62 356 65 346 Z";

  return (
    <svg className="fs2-fig" viewBox="0 0 200 380" data-pose={pose} role="img" aria-label={`${COLORS[f.topC].n} ${top}, ${COLORS[f.bottomC].n} ${bottom}, ${COLORS[f.shoeC].n} ${shoe}${f.extras.length ? `, ${f.extras.join(", ")}` : ""}`}>
      <ellipse cx="100" cy="360" rx="52" ry="8" fill="rgba(0,0,0,0.3)" />
      <g className="fs2-body">
        {/* skin underneath */}
        <path d="M86 300 L96 300 L96 340 L86 340 Z M104 300 L114 300 L114 340 L104 340 Z" fill={skin} />
        <path d="M80 240 L97 240 L96 340 L84 340 Z M103 240 L120 240 L116 340 L104 340 Z" fill={skin} />
        <path d="M71 94 L58 202 M129 94 L142 202" stroke={skin} strokeWidth="13" strokeLinecap="round" />
        <circle cx="58" cy="207" r="7" fill={skin} />
        <circle cx="142" cy="207" r="7" fill={skin} />
        <rect x="92" y="62" width="16" height="22" rx="5" fill={skinD} />

        {/* bottoms */}
        <path d={legs} fill={bc} />
        <path d="M73 198 L127 198" stroke={bd} strokeWidth="3" />
        <path d="M100 196 L100 226" stroke={bd} strokeWidth="1.4" />
        {bottom !== "Shorts" && <path d="M78 206 Q86 214 94 206 M106 206 Q114 214 122 206" stroke={bd} strokeWidth="1.3" fill="none" />}
        {bottom === "Cargos" && (
          <>
            <rect x="64" y="250" width="16" height="30" rx="2" fill={bd} />
            <rect x="120" y="250" width="16" height="30" rx="2" fill={bd} />
            <path d="M64 256 L80 256 M120 256 L136 256" stroke={shade(bc, 0.2)} strokeWidth="1.2" />
            <path d="M68 330 L98 332 M102 332 L132 330" stroke={bd} strokeWidth="5" />
          </>
        )}
        {bottom === "Baggy jeans" && <path d="M68 318 Q82 324 96 318 M104 318 Q118 324 132 318 M67 330 Q82 336 96 330 M104 330 Q118 336 133 330" stroke={bd} strokeWidth="1.3" fill="none" />}
        {bottom === "Chinos" && <path d="M86 226 L88 336 M114 226 L112 336" stroke={bd} strokeWidth="1" />}
        {(bottom === "Straight jeans" || bottom === "Baggy jeans") && <path d="M80 226 L82 330 M120 226 L118 330" stroke={shade(bc, 0.18)} strokeWidth="0.9" strokeDasharray="3 2" />}

        {/* shoes */}
        <g>
          <path d={shoePath} fill={sc} />
          <path d="M65 349 Q84 352 102 349" stroke={shoe === "Runners" ? "#fff" : sd} strokeWidth={shoe === "Runners" ? 4 : 2.4} fill="none" />
          {shoe === "Sneakers" && <path d="M82 338 L88 344 M88 338 L94 344" stroke={sd} strokeWidth="1.2" />}
          {shoe === "Runners" && <path d="M76 344 Q86 338 96 342" stroke={shade(sc, 0.45)} strokeWidth="2" fill="none" />}
          {shoe === "Loafers" && <path d="M80 344 L94 344" stroke={sd} strokeWidth="2" />}
        </g>
        <g transform="translate(200 0) scale(-1 1)">
          <path d={shoePath} fill={sc} />
          <path d="M65 349 Q84 352 102 349" stroke={shoe === "Runners" ? "#fff" : sd} strokeWidth={shoe === "Runners" ? 4 : 2.4} fill="none" />
          {shoe === "Sneakers" && <path d="M82 338 L88 344 M88 338 L94 344" stroke={sd} strokeWidth="1.2" />}
          {shoe === "Runners" && <path d="M76 344 Q86 338 96 342" stroke={shade(sc, 0.45)} strokeWidth="2" fill="none" />}
          {shoe === "Loafers" && <path d="M80 344 L94 344" stroke={sd} strokeWidth="2" />}
        </g>

        {/* top */}
        {longSleeve ? (
          <>
            <path d="M73 93 L58 197 M127 93 L142 197" stroke={td} strokeWidth="19" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <path d="M71 88 L52 124 L66 130 L80 108 Z" fill={tc} />
            <path d="M129 88 L148 124 L134 130 L120 108 Z" fill={tc} />
          </>
        )}
        <path
          d={
            top === "Hoodie"
              ? "M68 86 Q100 76 132 86 L134 204 L66 204 Z"
              : top === "Bomber"
                ? "M68 86 Q100 77 132 86 L134 194 L66 194 Z"
                : "M70 86 Q100 78 130 86 L128 198 L72 198 Z"
          }
          fill={tc}
        />
        {top === "Hoodie" && (
          <>
            <path d="M78 84 Q100 108 122 84" stroke={td} strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M80 168 L120 168 L126 198 L74 198 Z" fill={td} />
            <path d="M93 98 L92 124 M107 98 L108 124" stroke={shade(tc, 0.35)} strokeWidth="1.6" />
            <path d="M49 194 L67 199 M151 194 L133 199" stroke={shade(tc, -0.35)} strokeWidth="5" />
          </>
        )}
        {top === "Bomber" && (
          <>
            <rect x="66" y="184" width="68" height="11" fill={td} />
            <path d="M66 187 L134 187 M66 191 L134 191" stroke={shade(tc, -0.4)} strokeWidth="0.8" />
            <path d="M84 84 Q100 92 116 84" stroke={td} strokeWidth="6" fill="none" />
            <path d="M100 90 L100 184" stroke={shade(tc, 0.4)} strokeWidth="1.6" />
            <path d="M49 194 L67 199 M151 194 L133 199" stroke={td} strokeWidth="7" />
          </>
        )}
        {top === "Knit" && (
          <>
            <path d="M72 190 L128 190" stroke={td} strokeWidth="9" />
            <path d="M86 96 Q90 120 86 144 Q82 168 86 186 M114 96 Q110 120 114 144 Q118 168 114 186" stroke={td} strokeWidth="2" fill="none" />
            <path d="M88 86 Q100 96 112 86" stroke={td} strokeWidth="5" fill="none" />
            <path d="M49 194 L67 199 M151 194 L133 199" stroke={td} strokeWidth="6" />
          </>
        )}
        {top === "Overshirt" && (
          <>
            <path d="M86 84 L100 102 L92 108 Z M114 84 L100 102 L108 108 Z" fill={td} />
            <path d="M100 102 L100 198" stroke={td} strokeWidth="2" />
            {[118, 138, 158, 178].map((y) => (
              <circle key={y} cx="100" cy={y} r="1.8" fill={shade(tc, 0.5)} />
            ))}
            <rect x="78" y="116" width="15" height="14" fill="none" stroke={td} strokeWidth="1.6" />
            <rect x="107" y="116" width="15" height="14" fill="none" stroke={td} strokeWidth="1.6" />
          </>
        )}
        {top === "Tee" && <path d="M88 86 Q100 96 112 86" stroke={td} strokeWidth="3" fill="none" />}

        {/* extras on the body */}
        {has("Chain") && (
          <>
            <path d="M88 86 Q100 110 112 86" stroke="#ffd84a" strokeWidth="2.2" fill="none" />
            <circle cx="100" cy="104" r="3" fill="#ffd84a" />
          </>
        )}
        {has("Bag") && (
          <>
            <path d="M126 88 L80 196" stroke={shade(xc, -0.4)} strokeWidth="4" />
            <rect x="64" y="186" width="30" height="22" rx="4" fill={xc} />
            <path d="M64 194 L94 194" stroke={shade(xc, -0.3)} strokeWidth="1.5" />
          </>
        )}

        {/* head and hair */}
        <ellipse cx="100" cy="46" rx="18" ry="22" fill={skin} />
        <g fill="#1d1410">
          {[
            [84, 34, 9],
            [94, 26, 10],
            [107, 26, 10],
            [117, 34, 9],
            [100, 22, 9],
            [81, 44, 6],
            [119, 44, 6],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
        {has("Beanie") && (
          <>
            <path d="M78 40 Q100 2 122 40 Z" fill={xc} />
            <rect x="77" y="34" width="46" height="9" rx="3" fill={shade(xc, -0.25)} />
          </>
        )}
        {has("Cap") && !has("Beanie") && (
          <>
            <path d="M80 36 Q100 10 120 36 Z" fill={xc} />
            <path d="M80 36 Q104 32 132 38 L132 42 Q104 40 78 41 Z" fill={shade(xc, -0.25)} />
          </>
        )}
        {has("Shades") && (
          <g>
            <rect x="85" y="44" width="13" height="8" rx="3" fill="#0b0b0d" />
            <rect x="102" y="44" width="13" height="8" rx="3" fill="#0b0b0d" />
            <path d="M98 47 L102 47" stroke="#0b0b0d" strokeWidth="1.6" />
          </g>
        )}
      </g>
    </svg>
  );
}

type Tab = "Top" | "Bottom" | "Shoes" | "Extras";

export function FashionGame({ onScore }: { onScore: () => void }) {
  const [f, setF] = useState<Fit>({ top: 1, topC: 4, bottom: 2, bottomC: 7, shoe: 0, shoeC: 0, extras: ["Chain"], extraC: 11 });
  const [tab, setTab] = useState<Tab>("Top");
  const [result, setResult] = useState<(ReturnType<typeof judge> & { n: number }) | null>(null);
  const [pose, setPose] = useState(0);
  const lastKey = useRef("");

  const key = JSON.stringify(f);
  const update = (patch: Partial<Fit>) => {
    setF((x) => ({ ...x, ...patch }));
    setResult(null);
  };

  const styleList = tab === "Top" ? TOPS : tab === "Bottom" ? BOTTOMS : tab === "Shoes" ? SHOES : EXTRAS;
  const curStyle = tab === "Top" ? f.top : tab === "Bottom" ? f.bottom : tab === "Shoes" ? f.shoe : -1;
  const curColor = tab === "Top" ? f.topC : tab === "Bottom" ? f.bottomC : tab === "Shoes" ? f.shoeC : f.extraC;

  const pickStyle = (i: number) => {
    audio.blip(i);
    if (tab === "Top") update({ top: i });
    else if (tab === "Bottom") update({ bottom: i });
    else if (tab === "Shoes") update({ shoe: i });
    else {
      const e = EXTRAS[i];
      update({ extras: f.extras.includes(e) ? f.extras.filter((x) => x !== e) : [...f.extras, e] });
    }
  };
  const pickColor = (i: number) => {
    audio.blip(3);
    if (tab === "Top") update({ topC: i });
    else if (tab === "Bottom") update({ bottomC: i });
    else if (tab === "Shoes") update({ shoeC: i });
    else update({ extraC: i });
  };

  const randomize = () => {
    const r = (n: number) => Math.floor(Math.random() * n);
    const neutral = () => r(10);
    update({
      top: r(TOPS.length),
      topC: Math.random() < 0.3 ? 10 + r(3) : neutral(),
      bottom: r(BOTTOMS.length),
      bottomC: neutral(),
      shoe: r(SHOES.length),
      shoeC: Math.random() < 0.5 ? 0 : r(COLORS.length),
      extras: EXTRAS.filter(() => Math.random() < 0.3),
      extraC: r(COLORS.length),
    });
    audio.confirm();
  };

  const check = (e: React.MouseEvent) => {
    const j = judge(f);
    setResult({ ...j, n: Date.now() });
    setPose((p) => p + 1);
    const fresh = lastKey.current !== key;
    if (j.total >= 8) {
      burst(e.clientX, e.clientY, 18);
      audio.rankUp();
      if (fresh) {
        lastKey.current = key;
        onScore();
      }
    } else audio.back();
  };

  return (
    <div className="hg fs2">
      <div className="fs2-stage">
        <div className="fs2-flash" key={`f${pose}`} data-on={pose > 0} aria-hidden="true" />
        <Figure f={f} pose={pose} />
        {result && (
          <div className="fs2-stamp" key={result.n} data-good={result.total >= 8}>
            <b>{result.total}</b>
            <span>/10</span>
          </div>
        )}
      </div>

      <div className="fs2-panel">
        <div className="fs2-tabs" role="tablist" aria-label="Outfit piece">
          {(["Top", "Bottom", "Shoes", "Extras"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} data-on={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="fs2-styles">
          {styleList.map((s, i) => (
            <button
              key={s}
              data-on={tab === "Extras" ? f.extras.includes(s as Extra) : curStyle === i}
              aria-pressed={tab === "Extras" ? f.extras.includes(s as Extra) : curStyle === i}
              onClick={() => pickStyle(i)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="fs2-swatches" role="group" aria-label={tab === "Extras" ? "Headwear and bag colour" : `${tab} colour`}>
          {COLORS.map((c, i) => (
            <button
              key={c.n}
              data-on={curColor === i}
              aria-label={c.n}
              title={c.n}
              style={{ "--c": c.c } as React.CSSProperties}
              onClick={() => pickColor(i)}
            />
          ))}
        </div>
        <div className="gm-row">
          <button className="hg-btn" onClick={check}>
            Fit check
          </button>
          <button className="fs2-random" onClick={randomize}>
            Randomize
          </button>
        </div>

        {result ? (
          <div className="fs2-judges" key={result.n}>
            {[
              ["Colour", result.colour],
              ["Contrast", result.contrast],
              ["Silhouette", result.sil],
            ].map(([k, v], i) => (
              <div className="fs2-judge" key={k} style={{ "--v": Number(v) / 10, "--i": i } as React.CSSProperties}>
                <span>{k}</span>
                <i />
                <b>{v}</b>
              </div>
            ))}
            <p className="hg-flash" data-kind={result.total >= 8 ? "good" : "bad"}>
              {VERDICT[result.total]} {result.tip}
            </p>
          </div>
        ) : (
          <p className="hg-flash" data-kind="idle">
            Build a fit, then get it judged. 8/10 or higher ranks up.
          </p>
        )}
      </div>
    </div>
  );
}

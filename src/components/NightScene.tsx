import { createRng, rectPath, skyline, windowGrid, type WindowPaths } from "@/lib/skyline";

/**
 * "Plate I — The city at night": a stylised art-deco skyline under a green
 * moon, drawn as a stack of SVG layers that share one 1600×1000 canvas.
 * Clouds and moon glow live on their own layers so their animations stay on
 * the compositor instead of repainting the whole city.
 */

const VIEW = "0 0 1600 1000";
const MOON = { x: 1130, y: 360, r: 215 };

const PALETTE = {
  rim: "#dfe7bd",
  warm: "#f2c46d",
  cool: "#cfe8c4",
  silhouette: "#070908",
};

/* ---------------------------------------------------------------- skyline */

const rng = createRng(1939);

const farCity = skyline(rng, {
  from: -20,
  to: 1640,
  base: 790,
  minWidth: 22,
  maxWidth: 62,
  height: (x) => (x < 640 ? 115 : x < 1500 ? 280 + 60 * Math.sin((x - 640) / 270) : 170),
  windows: { colWidth: 9, rowHeight: 13, winWidth: 3, winHeight: 4, chance: 0.12, coolShare: 0.7, pad: 5 },
});

const midCity = skyline(rng, {
  from: -20,
  to: 1640,
  base: 860,
  minWidth: 34,
  maxWidth: 90,
  height: (x) => (x < 700 ? 120 : 190),
  windows: { colWidth: 13, rowHeight: 18, winWidth: 5, winHeight: 7, chance: 0.2, coolShare: 0.2 },
});

/* ------------------------------------------------------------- hero towers */

type Lit = "left" | "right";

function Facade({ x, y, w, h, lit, stripes = false }: { x: number; y: number; w: number; h: number; lit: Lit; stripes?: boolean }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={`url(#face-${lit})`} />
      {stripes && <rect x={x} y={y} width={w} height={h} fill="url(#deco-stripes)" />}
      <rect x={lit === "left" ? x : x + w - 2} y={y} width={2} height={h} fill={PALETTE.rim} opacity={0.32} />
      <rect x={x} y={y} width={w} height={1.5} fill={PALETTE.rim} opacity={0.22} />
    </>
  );
}

function Spire({ cx, y, w, tip, lit }: { cx: number; y: number; w: number; tip: number; lit: Lit }) {
  const edge = lit === "left" ? cx - w / 2 : cx + w / 2;
  return (
    <>
      <path d={`M${cx - w / 2} ${y}L${cx} ${tip}L${cx + w / 2} ${y}Z`} fill={`url(#face-${lit})`} />
      <path d={`M${edge} ${y}L${cx} ${tip}`} stroke={PALETTE.rim} strokeOpacity={0.4} strokeWidth={1.5} />
    </>
  );
}

function Windows({ paths }: { paths: WindowPaths }) {
  return (
    <>
      <path d={paths.warm} fill={PALETTE.warm} />
      <path d={paths.cool} fill={PALETTE.cool} opacity={0.85} />
    </>
  );
}

const towerRng = createRng(77);

// Stepped block in the middle of the city, with tower B rising from it.
const blockWindows = windowGrid(towerRng, 880, 668, 370, 300, {
  colWidth: 22, rowHeight: 26, winWidth: 7, winHeight: 12, chance: 0.4, coolShare: 0.35,
});
const towerAWindows = windowGrid(towerRng, 780, 450, 90, 520, {
  colWidth: 18, rowHeight: 30, winWidth: 5, winHeight: 12, chance: 0.28, coolShare: 0.5,
});
const towerBWindows = windowGrid(towerRng, 985, 470, 120, 185, {
  colWidth: 20, rowHeight: 28, winWidth: 5, winHeight: 12, chance: 0.5, coolShare: 0.8,
});
const rightWindows = windowGrid(towerRng, 1290, 450, 135, 520, {
  colWidth: 24, rowHeight: 34, winWidth: 8, winHeight: 16, chance: 0.42, coolShare: 0.1,
});

// The tall crowned skyscraper on the right edge: vertical amber slits.
let slits = "";
for (const col of [1484, 1512, 1540, 1568]) {
  for (let y = 190; y < 900; y += 54) {
    if (towerRng() < 0.45) slits += rectPath(col, y, 8, 30);
  }
}

// Arched brownstone windows along the foreground.
const arches = Array.from({ length: 10 }, (_, i) => ({ x: 70 + i * 120, lit: towerRng() > 0.28 }));
const archPath = (x: number, y = 872, w = 46, h = 92) =>
  `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;

/* --------------------------------------------------------------- sky bits */

const specks = Array.from({ length: 170 }, () => ({
  x: rng() * 1600,
  y: rng() * 620,
  r: 0.5 + rng() * 1.3,
  o: 0.15 + rng() * 0.55,
}));

type Puff = { x: number; y: number; r: number };

const cloudBank: Puff[] = Array.from({ length: 34 }, (_, i) => ({
  x: -160 + i * 58 + rng() * 30,
  y: -30 + rng() * 90 + (i % 3) * 18,
  r: 55 + rng() * 75,
}));

/** A heaped cumulus: big puffs in the middle, small at the ends, flat-ish base. */
function cumulus(cx: number, baseY: number, width: number, maxR: number, count: number): Puff[] {
  const top = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const pr = maxR * (0.5 + 0.5 * Math.sin(Math.PI * t)) * (0.8 + rng() * 0.35);
    return { x: cx - width * 0.42 + t * width * 0.84, y: baseY - pr * 0.6, r: pr };
  });
  // a row of lower puffs fills in the belly of the cloud
  const belly = Array.from({ length: count - 2 }, (_, i) => ({
    x: cx - width * 0.38 + (i / (count - 3)) * width * 0.76,
    y: baseY - maxR * 0.2,
    r: maxR * (0.32 + rng() * 0.12),
  }));
  return [...top, ...belly];
}

const wisps: Puff[] = [
  ...cumulus(1000, 262, 300, 44, 7),
  ...cumulus(1300, 326, 210, 30, 6),
  ...cumulus(250, 232, 300, 40, 7),
];

function Puffs({ puffs, rimOpacity }: { puffs: Puff[]; rimOpacity: number }) {
  return (
    <>
      {/* moonlit underside, peeking out below each puff */}
      {puffs.map((p, i) => (
        <circle key={`rim-${i}`} cx={p.x} cy={p.y + p.r * 0.12} r={p.r} fill="#6f8a73" opacity={rimOpacity} />
      ))}
      {puffs.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="url(#cloud)" />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ scene */

export default function NightScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene__canvas">
        {/* Sky, stars and moon */}
        <svg className="scene__layer" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a110f" />
              <stop offset="0.2" stopColor="#14241e" />
              <stop offset="0.42" stopColor="#264638" />
              <stop offset="0.62" stopColor="#47714f" />
              <stop offset="0.77" stopColor="#7f9d5b" />
              <stop offset="0.86" stopColor="#a6b56b" />
            </linearGradient>
            <radialGradient id="moon" cx="0.42" cy="0.38" r="0.62">
              <stop offset="0" stopColor="#f6f7e4" />
              <stop offset="0.65" stopColor="#dfe8c2" />
              <stop offset="1" stopColor="#c0cf98" />
            </radialGradient>
          </defs>
          <rect width="1600" height="1000" fill="url(#sky)" />
          {specks.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#eef3d6" opacity={s.o} />
          ))}
          <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill="url(#moon)" />
          <g fill="#aebe86" opacity="0.32">
            <ellipse cx={MOON.x - 70} cy={MOON.y - 40} rx="42" ry="30" />
            <ellipse cx={MOON.x + 60} cy={MOON.y + 50} rx="58" ry="38" />
            <ellipse cx={MOON.x + 20} cy={MOON.y - 110} rx="24" ry="16" />
            <ellipse cx={MOON.x - 110} cy={MOON.y + 80} rx="20" ry="26" />
          </g>
        </svg>

        {/* Breathing moon glow */}
        <svg className="scene__layer scene__glow" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          <defs>
            <radialGradient id="glow">
              <stop offset="0.38" stopColor="#e3efbc" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="#c6db9a" stopOpacity="0.16" />
              <stop offset="1" stopColor="#c6db9a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 2.6} fill="url(#glow)" />
        </svg>

        {/* Drifting clouds */}
        <svg className="scene__layer scene__clouds" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1210" />
              <stop offset="0.7" stopColor="#1f2f29" />
              <stop offset="1" stopColor="#34483f" />
            </linearGradient>
          </defs>
          <Puffs puffs={cloudBank} rimOpacity={0.35} />
          <g opacity="0.82">
            <Puffs puffs={wisps} rimOpacity={0.55} />
          </g>
        </svg>

        {/* The city */}
        <svg className="scene__layer" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="face-right" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#15171a" />
              <stop offset="1" stopColor="#3a3d35" />
            </linearGradient>
            <linearGradient id="face-left" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#15171a" />
              <stop offset="1" stopColor="#3a3d35" />
            </linearGradient>
            <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a8bc74" stopOpacity="0" />
              <stop offset="0.6" stopColor="#a8bc74" stopOpacity="0.32" />
              <stop offset="1" stopColor="#a8bc74" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="brick" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#332d27" />
              <stop offset="1" stopColor="#181614" />
            </linearGradient>
            <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f8dc96" />
              <stop offset="1" stopColor="#d6923f" />
            </linearGradient>
            <radialGradient id="pane-glow">
              <stop offset="0" stopColor="#f2c46d" stopOpacity="0.45" />
              <stop offset="1" stopColor="#f2c46d" stopOpacity="0" />
            </radialGradient>
            <pattern id="deco-stripes" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="3" height="14" fill="#000" opacity="0.28" />
            </pattern>
          </defs>

          {/* far city, lost in the haze */}
          <path d={farCity.body} fill="#5b7d63" />
          <path d={farCity.cool} fill="#dcebc0" opacity="0.5" />
          <path d={farCity.warm} fill="#f0d79a" opacity="0.45" />
          <rect y="560" width="1600" height="280" fill="url(#haze)" />

          {/* mid city */}
          <path d={midCity.body} fill="#2c4036" />
          <path d={midCity.warm} fill={PALETTE.warm} opacity="0.75" />
          <path d={midCity.cool} fill={PALETTE.cool} opacity="0.6" />

          {/* right-hand building with a pyramid cap */}
          <Facade x={1290} y={560} w={135} h={440} lit="left" stripes />
          <Facade x={1325} y={450} w={65} h={110} lit="left" />
          <Spire cx={1357.5} y={450} w={65} tip={398} lit="left" />
          <Windows paths={rightWindows} />

          {/* tower A */}
          <Facade x={780} y={520} w={90} h={480} lit="right" stripes />
          <Facade x={792} y={450} w={66} h={70} lit="right" />
          <Facade x={802} y={400} w={46} h={50} lit="right" />
          <Spire cx={825} y={400} w={46} tip={282} lit="right" />
          <Windows paths={towerAWindows} />
          <rect x="814" y="414" width="5" height="12" fill={PALETTE.cool} />
          <rect x="831" y="414" width="5" height="12" fill={PALETTE.cool} />

          {/* slim spire */}
          <Facade x={905} y={560} w={24} h={440} lit="right" />
          <Spire cx={917} y={560} w={24} tip={492} lit="right" />

          {/* tower B, silhouetted against the moon */}
          <Facade x={985} y={540} w={120} h={460} lit="right" stripes />
          <Facade x={1000} y={470} w={90} h={70} lit="right" />
          <Facade x={1015} y={425} w={60} h={45} lit="right" />
          <Spire cx={1045} y={425} w={52} tip={268} lit="right" />
          <Windows paths={towerBWindows} />
          <rect x="1030" y="438" width="6" height="14" fill={PALETTE.cool} />
          <rect x="1054" y="438" width="6" height="14" fill={PALETTE.cool} />

          {/* stepped block */}
          <Facade x={880} y={655} w={370} h={345} lit="right" />
          <rect x="872" y="650" width="386" height="12" fill="#2e312b" />
          <rect x="872" y="650" width="386" height="1.5" fill={PALETTE.rim} opacity="0.3" />
          <Windows paths={blockWindows} />

          {/* crowned skyscraper on the right edge */}
          <Facade x={1462} y={150} w={160} h={850} lit="left" stripes />
          <Facade x={1482} y={100} w={120} h={50} lit="left" />
          <Facade x={1502} y={62} w={80} h={38} lit="left" />
          <Spire cx={1542} y={62} w={34} tip={0} lit="left" />
          <path d={slits} fill={PALETTE.warm} />

          {/* foreground brownstone */}
          <rect x="-10" y="830" width="1270" height="170" fill="url(#brick)" />
          <rect x="-10" y="818" width="1280" height="14" fill="#3b352e" />
          <rect x="-10" y="818" width="1280" height="1.5" fill={PALETTE.rim} opacity="0.35" />
          {arches.map(({ x, lit }) =>
            lit ? (
              <g key={x}>
                <ellipse cx={x + 23} cy={918} rx={64} ry={78} fill="url(#pane-glow)" />
                <path d={archPath(x)} fill="url(#pane)" />
                <path
                  d={`M${x + 23} 872V964M${x} 922H${x + 46}`}
                  stroke="#2a221b"
                  strokeWidth="3"
                />
              </g>
            ) : (
              <path key={x} d={archPath(x)} fill="#141210" />
            ),
          )}

          {/* water tower */}
          <g transform="translate(18 0)">
            <g fill="#101312">
              <path d="M688 818L694 760H698L692 818ZM752 818L746 760H742L748 818ZM720 818V760H724V818Z" />
              <rect x="684" y="700" width="72" height="62" rx="4" />
              <path d="M680 702L720 664L760 702Z" />
            </g>
            <rect x="754" y="702" width="2" height="58" fill={PALETTE.rim} opacity="0.35" />
            <path d="M720 664L760 702" stroke={PALETTE.rim} strokeOpacity="0.35" strokeWidth="1.5" />
          </g>

          {/* foreground rooftop with chimney */}
          <path d="M1170 1000L1240 924L1640 892V1000Z" fill="#0b0d0c" />
          <path d="M1240 924L1640 892" stroke={PALETTE.rim} strokeOpacity="0.3" strokeWidth="2" />
          <rect x="1400" y="852" width="54" height="56" fill="#0b0d0c" />
          <rect x="1400" y="852" width="2" height="56" fill={PALETTE.rim} opacity="0.3" />

          {/* the lone watcher on the roof */}
          <g transform="translate(1214 818) scale(1.3)" fill={PALETTE.silhouette}>
            <circle cx="0" cy="-27" r="3.4" />
            <path d="M-5 -23H5L7.5 -7H-7.5Z" />
            <rect x="-3.6" y="-8" width="2.4" height="8" />
            <rect x="1.2" y="-8" width="2.4" height="8" />
          </g>
        </svg>

        {/* Speckled grain over everything */}
        <svg className="scene__layer scene__grain" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          <filter id="speckle" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="4" />
            <feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.97  0 0 0 0 0.86  9 0 0 0 -6.1" />
          </filter>
          <rect width="1600" height="1000" filter="url(#speckle)" />
        </svg>
      </div>
    </div>
  );
}

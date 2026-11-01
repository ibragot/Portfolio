import { createRng, skyline } from "@/lib/skyline";

/** A miniature night skyline used as each project card's artwork. */
export default function ProjectPlate({ seed, sky, numeral }: { seed: number; sky: [string, string]; numeral: string }) {
  const rng = createRng(seed * 101 + 7);
  const back = skyline(rng, {
    from: -10,
    to: 410,
    base: 200,
    minWidth: 14,
    maxWidth: 36,
    height: () => 90,
    windows: { colWidth: 7, rowHeight: 10, winWidth: 2, winHeight: 3, chance: 0.15, coolShare: 0.6, pad: 4 },
  });
  const front = skyline(rng, {
    from: -10,
    to: 410,
    base: 200,
    minWidth: 22,
    maxWidth: 52,
    height: () => 55,
    windows: { colWidth: 9, rowHeight: 12, winWidth: 3, winHeight: 5, chance: 0.25, coolShare: 0.2, pad: 4 },
  });
  const moonX = 70 + rng() * 260;
  const id = `plate-${seed}`;

  return (
    <svg className="plate" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.3" stopColor="#f3f5df" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f3f5df" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#${id}-sky)`} />
      <circle cx={moonX} cy="62" r="70" fill={`url(#${id}-glow)`} />
      <circle cx={moonX} cy="62" r="26" fill="#eef1d8" />
      <path d={back.body} fill="#000" opacity="0.35" />
      <path d={back.cool} fill="#e6f0cf" opacity="0.5" />
      <path d={front.body} fill="#0b0e0d" />
      <path d={front.warm} fill="#f2c46d" />
      <path d={front.cool} fill="#cfe8c4" opacity="0.8" />
      <text x="16" y="30" className="plate__numeral">
        {numeral}
      </text>
    </svg>
  );
}

import type { SceneFactory } from "./kit";
import { plate, type Box } from "./plate";
import alleyBoxes from "./data/alley.json";
import lookupBoxes from "./data/lookup.json";
import moonBoxes from "./data/moon.json";
import redroofsBoxes from "./data/redroofs.json";
import rooftopBoxes from "./data/rooftop.json";

// Hero: high above the city, the full moon behind the spires. Clicking the sky throws lightning.
export const moon: SceneFactory = plate({
  back: "/art/moon-back.webp",
  front: "/art/moon-front.webp",
  win: "/art/moon-win.png",
  boxes: moonBoxes as Box[],
  moon: { x: 0.717, y: 0.322, r: 0.18, color: "225,245,215" },
  fog: { color: "150,200,175", top: 0.5, bottom: 0.7, alpha: 0.07 },
  lightning: true,
  focus: [0.5, 0.42],
  zoom: 1.1,
  shift: { back: 50, front: 150 },
  pointer: { back: 8, front: 24 },
  vignette: 0.45,
});

// Dropping lower: a red sky and the rooftops of midtown seen from above
export const redroofs: SceneFactory = plate({
  back: "/art/redroofs-back.webp",
  front: "/art/redroofs-front.webp",
  win: "/art/redroofs-win.png",
  boxes: redroofsBoxes as Box[],
  moon: { x: 0.572, y: 0.068, r: 0.045, color: "255,235,225" },
  lightning: true,
  focus: [0.5, 0.18],
  zoom: 1.12,
  shift: { back: 40, front: 160 },
  pointer: { back: 6, front: 20 },
  windowGlow: "220,235,255",
  vignette: 0.5,
});

// Above the rooftops at night: the moon over the far side of the city
export const rooftop: SceneFactory = plate({
  back: "/art/rooftop-back.webp",
  win: "/art/rooftop-win.png",
  boxes: rooftopBoxes as Box[],
  moon: { x: 0.085, y: 0.068, r: 0.04, color: "215,228,255" },
  fog: { color: "110,130,185", top: 0.12, bottom: 0.32, alpha: 0.07 },
  focus: [0.5, 0.02],
  zoom: 1.12,
  shift: { back: 140, front: 140 },
  pointer: { back: 14, front: 14 },
  vignette: 0.5,
});

// Standing in the street, looking straight up: the towers turn slowly as you scroll
export const lookup: SceneFactory = plate({
  back: "/art/lookup-back.webp",
  win: "/art/lookup-win.png",
  boxes: lookupBoxes as Box[],
  spin: { from: -12, to: 14, zoomFrom: 1.02, zoomTo: 1.3 },
  pointer: { back: 10, front: 18 },
  vignette: 0.62,
});

// The bottom of the city: a dark alley, one street lamp, rain, and your cursor as a flashlight
export const alley: SceneFactory = plate({
  back: "/art/alley-back.webp",
  front: "/art/alley-front.webp",
  win: "/art/alley-win.png",
  boxes: alleyBoxes as Box[],
  focus: [0.5, 0.86],
  focusNarrow: [0.86, 0.86],
  zoom: 1.05,
  shift: { back: 30, front: 80 },
  pointer: { back: 6, front: 14 },
  alley: { lamp: [0.772, 0.648], pool: [0.69, 0.81], darkness: 0.8, neon: [0.053, 0.363, 0.333, 0.073] },
  steam: [
    [0.47, 0.73],
    [0.63, 0.72],
  ],
  rain: 240,
  rainAlpha: 0.16,
  vignette: 0.35,
});

export const SCENES: Record<string, SceneFactory> = { moon, rooftop, redroofs, lookup, alley };

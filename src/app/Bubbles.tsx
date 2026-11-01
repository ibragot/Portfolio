"use client";

import { useEffect, useRef } from "react";

// Rising bubbles drawn on a 2D canvas. Anything on the page can call
// burst(x, y, count) to release a cluster, for example on a click.

type Bubble = { x: number; y: number; r: number; vy: number; phase: number; drift: number; life: number };

const BURST_EVENT = "ocean:burst";

export function burst(x: number, y: number, count = 12) {
  window.dispatchEvent(new CustomEvent(BURST_EVENT, { detail: { x, y, count } }));
}

export default function Bubbles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const bubbles: Bubble[] = [];
    const spawnAmbient = (y = h + 10): Bubble => ({
      x: Math.random() * w,
      y,
      r: 1.5 + Math.random() ** 2 * 7,
      vy: 0.25 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      drift: 0.3 + Math.random() * 0.9,
      life: Infinity,
    });
    const ambientCount = Math.round(Math.min(46, (w * h) / 32000));
    for (let i = 0; i < ambientCount; i++) bubbles.push(spawnAmbient(Math.random() * h));

    const onBurst = (e: Event) => {
      const { x, y, count } = (e as CustomEvent<{ x: number; y: number; count: number }>).detail;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 18;
        bubbles.push({
          x: x + Math.cos(a) * d,
          y: y + Math.sin(a) * d,
          r: 2 + Math.random() * 6,
          vy: 1.2 + Math.random() * 2.2,
          phase: Math.random() * Math.PI * 2,
          drift: 0.6 + Math.random() * 1.4,
          life: 120 + Math.random() * 90,
        });
      }
    };
    window.addEventListener(BURST_EVENT, onBurst);

    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= b.vy;
        b.x += Math.sin(t * 0.03 * b.drift + b.phase) * 0.35 * b.drift;
        if (b.life !== Infinity) {
          b.life -= 1;
          b.vy *= 0.992;
        }
        if (b.y < -20 || b.life <= 0) {
          if (b.life === Infinity) bubbles[i] = spawnAmbient();
          else bubbles.splice(i, 1);
          continue;
        }
        const fade = b.life === Infinity ? Math.min(1, b.y / (h * 0.25)) : Math.min(1, b.life / 40);
        ctx.globalAlpha = 0.55 * fade;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = "#dff8ff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 0.18 * fade;
        ctx.fillStyle = "#9fe6ff";
        ctx.fill();
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.6, b.r * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener(BURST_EVENT, onBurst);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="bubbles" aria-hidden="true" />;
}

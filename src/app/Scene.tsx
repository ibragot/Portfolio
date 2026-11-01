"use client";

import { useEffect, useRef } from "react";
import type { SceneFactory, SceneState } from "./scenes/kit";

/**
 * Hosts one painted scene. The canvas fills its parent, is backed at up to 2x for sharp
 * edges, repaints its static layers on resize, and only animates while it is on screen.
 */
export default function Scene({
  factory,
  className,
  label,
  interactive = true,
}: {
  factory: SceneFactory;
  className?: string;
  label?: string;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let scene: ReturnType<SceneFactory> | null = null;
    const state: SceneState = { t: 0, dt: 16, progress: 0, mx: -1, my: -1, px: 0, py: 0, still };
    let tx = 0;
    let ty = 0;

    const build = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scene = factory(w, h, dpr);
    };
    build();

    const readProgress = () => {
      const r = canvas.getBoundingClientRect();
      const vh = window.innerHeight;
      state.progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };

    let raf = 0;
    let visible = false;
    let last = performance.now();
    const start = last;

    const frame = (now: number) => {
      raf = 0;
      if (!scene) return;
      state.dt = Math.min(64, now - last);
      last = now;
      state.t = now - start;
      readProgress();
      state.px += (tx - state.px) * 0.06;
      state.py += (ty - state.py) * 0.06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.draw(ctx, state);
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          last = performance.now();
          kick();
        }
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      state.mx = e.clientX - r.left;
      state.my = e.clientY - r.top;
      const inside = state.mx >= 0 && state.my >= 0 && state.mx <= r.width && state.my <= r.height;
      if (!inside) {
        state.mx = state.my = -1;
      }
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const onClick = (e: MouseEvent) => {
      if (!scene?.click) return;
      const target = e.target as HTMLElement;
      if (target !== canvas && target.closest("a, button, input, label, [data-no-strike]")) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      scene.click(x, y, state);
      kick();
    };
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 80) {
          build();
          kick();
        }
      }, 160);
    };
    const onScroll = () => {
      if (still) kick();
    };

    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("click", onClick);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();
    canvas.dataset.ready = "true";

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [factory, interactive]);

  return <canvas ref={ref} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

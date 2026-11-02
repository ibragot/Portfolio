"use client";

import { useEffect, useRef, useState } from "react";
import { CityRenderer } from "./engine";

export default function CityScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const [lightsOn, setLightsOn] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: CityRenderer;
    try {
      renderer = new CityRenderer(canvas, { reducedMotion });
    } catch {
      return; // no canvas support: the CSS sky gradient stays as the backdrop
    }
    rendererRef.current = renderer;
    renderer.start();
    return () => renderer.destroy();
  }, []);

  const toggleLights = () => {
    const next = !lightsOn;
    setLightsOn(next);
    rendererRef.current?.setAllLights(next);
  };

  return (
    <>
      <div className="scene">
        <canvas ref={canvasRef} className="scene__canvas" aria-hidden="true" />
        <svg className="scene__grain" aria-hidden="true">
          <filter id="speckle">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" />
            <feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.99  0 0 0 0 0.97  10 0 0 0 -7" />
          </filter>
          <rect width="100%" height="100%" filter="url(#speckle)" />
        </svg>
      </div>

      <div className="hero__controls">
        <button type="button" className="lights-toggle" aria-pressed={!lightsOn} onClick={toggleLights}>
          <span className={`lights-toggle__bulb${lightsOn ? " is-on" : ""}`} aria-hidden="true" />
          {lightsOn ? "Lights out" : "Lights on"}
        </button>
        <span className="hero__hint" aria-hidden="true">
          or click a building
        </span>
      </div>
    </>
  );
}

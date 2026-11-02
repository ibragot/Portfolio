"use client";

// Temporary review page: renders one scene full screen. Removed before shipping.
import { useEffect, useState } from "react";
import Scene from "../Scene";
import { SCENES } from "../scenes";

export default function Lab() {
  const [name, setName] = useState<string | null>(null);
  const [h, setH] = useState("100vh");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setName(q.get("s") ?? "rooftop");
    if (q.get("h")) setH(q.get("h")!);
  }, []);
  if (!name || !SCENES[name]) return null;
  return (
    <div style={{ width: "100vw", height: h, background: "#0e1029" }}>
      <Scene factory={SCENES[name]} className="lab-canvas" />
      <style>{`.lab-canvas{display:block;width:100%;height:100%}`}</style>
    </div>
  );
}

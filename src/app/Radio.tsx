"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { audio, TRACKS } from "./audio";

function useEngine() {
  return useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    () => `${audio.trackIndex}|${audio.playing}|${audio.loading}|${audio.volume}|${audio.sfxOn}`,
    () => "ssr",
  );
}

/** A deco cathedral radio. The dial needle sweeps to each station; tuning plays static. */
export default function Radio() {
  useEngine();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setMounted(true);
    // Phones start with the radio folded away so it doesn't cover the page
    if (window.innerWidth < 700) setOpen(false);
  }, []);

  const index = mounted ? audio.trackIndex : 0;
  const playing = mounted && audio.playing;
  const volume = mounted ? audio.volume : 0.7;
  const sfxOn = mounted ? audio.sfxOn : true;
  const track = TRACKS[index];

  const press = (fn: () => void) => () => {
    audio.unlock();
    fn();
  };

  return (
    <aside className="radio" data-on={playing} data-open={open} aria-label="City sounds radio">
      <button
        className="radio-tab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="radio-body"
      >
        {open ? "Hide radio" : "Radio"}
      </button>

      <div className="radio-body" id="radio-body">
        <div className="radio-arch" aria-hidden="true">
          <span className="radio-grille" />
          <span className="radio-glow" />
        </div>

        <div className="radio-dial" style={{ "--needle": index / (TRACKS.length - 1) } as React.CSSProperties}>
          <div className="radio-scale" aria-hidden="true">
            {TRACKS.map((t, i) => (
              <span key={t.id} data-on={i === index}>
                {i + 1}
              </span>
            ))}
          </div>
          <span className="radio-needle" aria-hidden="true" />
          <p className="radio-station" aria-live="polite">
            <span key={track.id}>{track.title}</span>
          </p>
        </div>

        <div className="radio-controls">
          <button className="radio-knob" onClick={press(() => audio.prev())} aria-label="Previous station">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-8 7 8 7z" />
            </svg>
          </button>
          <button
            className="radio-power"
            onClick={press(() => audio.toggle())}
            aria-pressed={playing}
            aria-label={playing ? "Turn the radio off" : "Turn the radio on"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          </button>
          <button className="radio-knob" onClick={press(() => audio.next())} aria-label="Next station">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l8 7-8 7z" />
            </svg>
          </button>
        </div>

        <div className="radio-row">
          <label className="radio-vol">
            <span className="sr-only">Volume</span>
            <input
              id="radio-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => audio.setVolume(Number(e.target.value))}
              style={{ "--v": volume } as React.CSSProperties}
            />
          </label>
          <button
            className="radio-sfx"
            onClick={press(() => audio.setSfx(!audio.sfxOn))}
            aria-pressed={sfxOn}
            title="Sound effects"
          >
            FX
          </button>
        </div>
      </div>
    </aside>
  );
}

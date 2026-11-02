"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { audio, TRACKS } from "./audio";

function useEngine() {
  // Re-render whenever the audio engine changes state.
  return useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    () => `${audio.trackIndex}|${audio.playing}|${audio.loading}|${audio.volume}|${audio.sfxOn}|${audio.blocked}`,
    () => "ssr",
  );
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export default function Walkman() {
  useEngine();
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // The Walkman is on from the moment the page opens
    audio.autoplay();
  }, []);

  // Before hydration, show defaults so server and client markup match.
  const track = mounted ? audio.track : TRACKS[0];
  const index = mounted ? audio.trackIndex : 0;
  const playing = mounted && audio.playing;
  const loading = mounted && audio.loading;
  const volume = mounted ? audio.volume : 0.7;
  const sfxOn = mounted ? audio.sfxOn : true;
  const blocked = mounted && playing && audio.blocked;

  // Tick the display clock while a sound is playing.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setElapsed(audio.elapsed), 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const press = (fn: () => void) => () => {
    audio.unlock();
    fn();
  };

  return (
    <div className="walkman" data-playing={playing && !blocked} data-blocked={blocked}>
      <div className="wm-float">
        <svg className="wm-wire" viewBox="0 0 759 274" aria-hidden="true">
          <path d="M746 150 C 826 140, 876 -40, 816 -220 S 676 -560, 776 -820 S 1016 -1080, 1076 -1300" />
        </svg>

        <div className="wm-body">
          {/* Photo of the player; the live display sits over its screen */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wm-photo" src="/images/walkman.webp" alt="" width={759} height={274} />

          <button
            className="wm-screen"
            onClick={press(() => (blocked ? audio.unlock() : audio.toggle()))}
            aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
          >
            <span className="wm-row wm-title">
              <span className="wm-glyph" aria-hidden="true">
                ♫
              </span>
              <span className="wm-marquee">
                <span key={track.id}>{track.title}</span>
              </span>
            </span>
            <span className="wm-row wm-sub">
              <span className="wm-glyph" aria-hidden="true">
                ≈
              </span>
              {blocked ? "Click for sound" : playing ? track.subtitle : "Press play"}
            </span>
            <span className="wm-row wm-status">
              <span aria-hidden="true">{loading ? "…" : playing ? "▶" : "❚❚"}</span>
              <span>{fmt(playing ? elapsed : 0)}</span>
              <span className="wm-count">
                {index + 1}/{TRACKS.length}
              </span>
              <span className="wm-eq" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          </button>
        </div>

        <div className="wm-controls" role="group" aria-label="Ocean ambience">
          <button className="wm-btn" onClick={press(() => audio.prev())} aria-label="Previous sound">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </svg>
          </button>
          <button
            className="wm-btn wm-play"
            onClick={press(() => (blocked ? audio.unlock() : audio.toggle()))}
            aria-label={playing ? "Pause ocean sounds" : "Play ocean sounds"}
            aria-pressed={playing}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>
          <button className="wm-btn" onClick={press(() => audio.next())} aria-label="Next sound">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </svg>
          </button>
          <label className="wm-vol">
            <span className="sr-only">Volume</span>
            <input
              id="ambience-volume"
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
            className="wm-btn wm-sfx"
            onClick={press(() => audio.setSfx(!audio.sfxOn))}
            aria-pressed={sfxOn}
            aria-label="Menu sound effects"
            title="Menu sound effects"
          >
            SFX
          </button>
        </div>
      </div>
    </div>
  );
}

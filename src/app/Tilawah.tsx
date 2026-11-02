"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { Stage } from "./Stages";

/* Recitation practice on Surah Al-Fatiha: pick a verse, recite, and watch each word
   get scored with a tajweed tip where it matters. The scoring is simulated here;
   the optional mic only drives the live waveform. */

type Word = { ar: string; tr: string };
type Tip = { i: number; rule: string; text: string };
type Verse = { n: number; words: Word[]; en: string; tips: Tip[] };

const W = (ar: string, tr: string): Word => ({ ar, tr });
const STOP = (i: number): Tip => ({
  i,
  rule: "Madd at the stop",
  text: "Pausing here makes the long vowel stretch: hold it for 2, 4 or 6 counts, and keep it the same every time.",
});

const VERSES: Verse[] = [
  {
    n: 1,
    words: [W("بِسْمِ", "bismi"), W("ٱللَّهِ", "allāhi"), W("ٱلرَّحْمَٰنِ", "ar-raḥmāni"), W("ٱلرَّحِيمِ", "ar-raḥīm")],
    en: "In the name of God, the Most Compassionate, the Most Merciful.",
    tips: [STOP(3)],
  },
  {
    n: 2,
    words: [W("ٱلْحَمْدُ", "al-ḥamdu"), W("لِلَّهِ", "lillāhi"), W("رَبِّ", "rabbi"), W("ٱلْعَٰلَمِينَ", "al-ʿālamīn")],
    en: "All praise is for God, Lord of all the worlds,",
    tips: [
      { i: 0, rule: "Makhraj of ḥā'", text: "ح comes from the middle of the throat. Keep it breathy and clean, not a hard h." },
      STOP(3),
    ],
  },
  {
    n: 3,
    words: [W("ٱلرَّحْمَٰنِ", "ar-raḥmāni"), W("ٱلرَّحِيمِ", "ar-raḥīm")],
    en: "the Most Compassionate, the Most Merciful,",
    tips: [STOP(1)],
  },
  {
    n: 4,
    words: [W("مَٰلِكِ", "māliki"), W("يَوْمِ", "yawmi"), W("ٱلدِّينِ", "ad-dīn")],
    en: "Master of the Day of Judgment.",
    tips: [
      { i: 0, rule: "Natural madd", text: "The small alif over the mīm makes a long ā. Hold it for exactly two counts." },
      STOP(2),
    ],
  },
  {
    n: 5,
    words: [W("إِيَّاكَ", "iyyāka"), W("نَعْبُدُ", "naʿbudu"), W("وَإِيَّاكَ", "wa-iyyāka"), W("نَسْتَعِينُ", "nastaʿīn")],
    en: "You alone we worship, and You alone we ask for help.",
    tips: [
      { i: 0, rule: "Shaddah", text: "The shaddah doubles the yā': iy-yā. Rest on it for a moment before moving on." },
      STOP(3),
    ],
  },
  {
    n: 6,
    words: [W("ٱهْدِنَا", "ihdinā"), W("ٱلصِّرَٰطَ", "aṣ-ṣirāṭa"), W("ٱلْمُسْتَقِيمَ", "al-mustaqīm")],
    en: "Guide us along the straight path,",
    tips: [
      { i: 1, rule: "Heavy letters", text: "ص and ط are heavy letters (tafkhīm). Give them a full, deep sound." },
      STOP(2),
    ],
  },
  {
    n: 7,
    words: [
      W("صِرَٰطَ", "ṣirāṭa"),
      W("ٱلَّذِينَ", "alladhīna"),
      W("أَنْعَمْتَ", "anʿamta"),
      W("عَلَيْهِمْ", "ʿalayhim"),
      W("غَيْرِ", "ghayri"),
      W("ٱلْمَغْضُوبِ", "al-maghḍūbi"),
      W("عَلَيْهِمْ", "ʿalayhim"),
      W("وَلَا", "wa-lā"),
      W("ٱلضَّآلِّينَ", "aḍ-ḍāllīn"),
    ],
    en: "the path of those You have blessed, not of those who earned anger, nor of those who went astray.",
    tips: [
      { i: 5, rule: "Heavy letters", text: "غ and ض are heavy letters. Keep them full even between light ones." },
      { i: 8, rule: "Madd lāzim", text: "The madd before the doubled lām is required: hold it for a full 6 counts." },
    ],
  },
];

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabic = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[+d]);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const BARS = 40;

export function TilawahStage() {
  const [v, setV] = useState(0);
  const [phase, setPhase] = useState<"idle" | "listen" | "done">("idle");
  const [step, setStep] = useState(-1);
  const [scores, setScores] = useState<number[]>([]);
  const [fluency, setFluency] = useState(0);
  const [useMic, setUseMic] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const mic = useRef<{ stream: MediaStream; ctx: AudioContext; an: AnalyserNode; buf: Uint8Array<ArrayBuffer> } | null>(null);
  const listening = useRef(false);

  const verse = VERSES[v];

  const stopMic = () => {
    if (!mic.current) return;
    mic.current.stream.getTracks().forEach((t) => t.stop());
    void mic.current.ctx.close();
    mic.current = null;
  };
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(
    () => () => {
      clear();
      stopMic();
    },
    [],
  );

  // Waveform: real mic levels when allowed, otherwise a voice-like synthetic envelope
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const m = mic.current;
      if (m) m.an.getByteFrequencyData(m.buf);
      bars.current.forEach((b, i) => {
        if (!b) return;
        let lv: number;
        if (m) {
          const bin = Math.floor((i / BARS) * (m.buf.length * 0.6));
          lv = m.buf[bin] / 255;
        } else if (listening.current) {
          const syll = Math.abs(Math.sin(t * 6.3)) * 0.6 + Math.abs(Math.sin(t * 2.1 + 1)) * 0.4;
          lv = syll * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.55 + t * 9))) * (1 - Math.abs(i - BARS / 2) / (BARS * 0.7));
        } else {
          lv = 0.06 + 0.04 * Math.sin(t * 2 + i * 0.4);
        }
        b.style.transform = `scaleY(${Math.max(0.06, Math.min(1, lv)).toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.7;
      ctx.createMediaStreamSource(stream).connect(an);
      mic.current = { stream, ctx, an, buf: new Uint8Array(an.frequencyBinCount) };
      setMicNote("Mic on: the waveform is your voice. Scoring is still simulated in this demo.");
    } catch {
      setUseMic(false);
      setMicNote("Mic blocked, so the demo uses a simulated voice instead.");
    }
  };

  const pick = (i: number) => {
    clear();
    stopMic();
    listening.current = false;
    setV(i);
    setPhase("idle");
    setStep(-1);
    setScores([]);
    setTipOpen(null);
    audio.blip(i);
  };

  const recite = async () => {
    clear();
    setTipOpen(null);
    const tipIdx = new Set(verse.tips.map((t) => t.i));
    setScores(verse.words.map((_, i) => Math.round(tipIdx.has(i) ? rand(71, 86) : rand(89, 99))));
    setFluency(Math.round(rand(86, 97)));
    setPhase("listen");
    setStep(-1);
    audio.confirm();
    if (useMic) await startMic();
    listening.current = true;
    let t = 350;
    verse.words.forEach((w, i) => {
      later(() => setStep(i), t);
      t += 460 + w.tr.length * 48;
      later(() => audio.blip(i % 6), t - 20);
    });
    later(() => {
      setStep(verse.words.length);
      listening.current = false;
      stopMic();
    }, t);
    later(() => {
      setPhase("done");
      audio.rankUp();
    }, t + 350);
  };

  const scored = (i: number) => i < step || phase === "done";
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const tajweed = scores.length
    ? Math.round(verse.tips.reduce((a, t) => a + scores[t.i], 0) / Math.max(1, verse.tips.length))
    : 0;
  const shownTip = tipOpen !== null ? verse.tips.find((t) => t.i === tipOpen) : null;

  return (
    <Stage
      hint="Pick a verse of Al-Fatiha, press recite, and get word-by-word feedback"
      note="Scores are simulated in this demo. The real app transcribes your voice with Azure Speech and scores it with Gemini."
    >
      <div className="tw" data-phase={phase}>
        <div className="tw-verses" role="tablist" aria-label="Verse">
          <span className="tw-surah">Al-Fātiḥah</span>
          {VERSES.map((x, i) => (
            <button key={x.n} role="tab" aria-selected={i === v} data-on={i === v} onClick={() => pick(i)}>
              1:{x.n}
            </button>
          ))}
        </div>

        <div className="tw-page">
          <p className="tw-ayah" dir="rtl" lang="ar">
            {verse.words.map((w, i) => {
              const sc = scores[i];
              const hasTip = verse.tips.some((t) => t.i === i);
              const state = scored(i) ? (sc >= 88 ? "good" : "fix") : i === step && phase === "listen" ? "now" : "idle";
              const dur = 460 + w.tr.length * 48;
              return (
                <button
                  key={i}
                  className="tw-word"
                  data-state={state}
                  data-tip={hasTip}
                  data-open={tipOpen === i}
                  style={{ "--dur": `${dur}ms` } as React.CSSProperties}
                  onClick={() => {
                    if (hasTip) {
                      setTipOpen(tipOpen === i ? null : i);
                      audio.blip(3);
                    }
                  }}
                  aria-label={`${w.tr}${scored(i) ? `, ${sc}%` : ""}${hasTip ? ", has a tajweed tip" : ""}`}
                >
                  <span className="tw-ar">{w.ar}</span>
                  <span className="tw-tr" dir="ltr">
                    {w.tr}
                  </span>
                  <span className="tw-score" dir="ltr">
                    {scored(i) ? `${sc}` : " "}
                  </span>
                </button>
              );
            })}
            <span className="tw-end" aria-label={`Verse ${verse.n}`}>
              {toArabic(verse.n)}
            </span>
          </p>
          <p className="tw-en">{verse.en}</p>
        </div>

        {shownTip && (
          <div className="tw-tip" key={shownTip.i}>
            <b>{shownTip.rule}</b>
            <span lang="ar">{verse.words[shownTip.i].ar}</span>
            <p>{shownTip.text}</p>
          </div>
        )}

        <div className="tw-controls">
          <button className="tw-rec" onClick={recite} disabled={phase === "listen"}>
            <span className="tw-rec-dot" aria-hidden="true" />
            {phase === "listen" ? "Listening" : phase === "done" ? "Recite again" : "Recite"}
          </button>
          <div className="tw-wave" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => (
              <i
                key={i}
                ref={(el) => {
                  bars.current[i] = el;
                }}
              />
            ))}
          </div>
          <label className="tw-mic">
            <input
              type="checkbox"
              checked={useMic}
              disabled={phase === "listen"}
              onChange={(e) => {
                setUseMic(e.target.checked);
                setMicNote(e.target.checked ? "Your browser will ask for the mic when you press Recite." : null);
              }}
            />
            <span>Use my mic</span>
          </label>
        </div>
        {micNote && <p className="tw-note">{micNote}</p>}

        {phase === "done" && (
          <div className="tw-result">
            <div className="tw-ring" style={{ "--v": avg / 100 } as React.CSSProperties}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" className="tw-ring-bg" />
                <circle cx="50" cy="50" r="42" className="tw-ring-fg" pathLength={1} />
              </svg>
              <b>{avg}%</b>
              <span>overall</span>
            </div>
            <div className="tw-metrics">
              {[
                ["Accuracy", avg],
                ["Tajweed", tajweed],
                ["Fluency", fluency],
              ].map(([k, val], i) => (
                <div key={k} className="tw-metric" style={{ "--v": Number(val) / 100, "--i": i } as React.CSSProperties}>
                  <span>{k}</span>
                  <i />
                  <b>{val}</b>
                </div>
              ))}
              <p className="tw-hint">
                Tap a word with a dotted underline for its tajweed tip.
              </p>
            </div>
          </div>
        )}
      </div>
    </Stage>
  );
}

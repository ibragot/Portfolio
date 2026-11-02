"use client";

// One shared AudioContext for both the ocean ambience and the menu sound effects.
// Browsers only allow audio after a click or key press, so the context is created
// lazily by unlock(), which the page calls on the first pointer or key event.

export type Track = { id: string; title: string; subtitle: string; src: string };

export const TRACKS: Track[] = [
  { id: "deep", title: "Deep water", subtitle: "Underwater", src: "/audio/deep.mp3" },
  { id: "whale", title: "Whale song", subtitle: "Open ocean", src: "/audio/whale.mp3" },
  { id: "shore", title: "Shoreline", subtitle: "Waves", src: "/audio/shore.mp3" },
  { id: "harbor", title: "Harbor", subtitle: "Boats and gulls", src: "/audio/harbor.mp3" },
];

type Listener = () => void;

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private current: { src: AudioBufferSourceNode; gain: GainNode; startedAt: number; duration: number } | null =
    null;
  private listeners = new Set<Listener>();

  trackIndex = 0;
  playing = false;
  loading = false;
  volume = 0.7;
  sfxOn = true;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("ambience") ?? "{}");
      if (typeof saved.track === "number" && TRACKS[saved.track]) this.trackIndex = saved.track;
      if (typeof saved.volume === "number") this.volume = Math.min(1, Math.max(0, saved.volume));
      if (typeof saved.sfx === "boolean") this.sfxOn = saved.sfx;
    } catch {
      /* storage blocked: keep defaults */
    }
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
    try {
      localStorage.setItem(
        "ambience",
        JSON.stringify({ track: this.trackIndex, volume: this.volume, sfx: this.sfxOn }),
      );
    } catch {
      /* ignore */
    }
  }

  /**
   * Start the Walkman as the page opens. Browsers only let sound start after the visitor
   * clicks, taps or presses a key, so the track is loaded and queued right away and
   * begins the instant the first interaction happens.
   */
  autoplay() {
    if (typeof window === "undefined" || this.playing) return;
    void this.play();
    const go = () => {
      this.unlock();
      if (this.ctx?.state === "running") {
        events.forEach((e) => window.removeEventListener(e, go, true));
      }
    };
    const events = ["pointerdown", "keydown", "touchend", "click"];
    events.forEach((e) => window.addEventListener(e, go, true));
  }

  /** True while the browser is still holding sound back until the first interaction. */
  get blocked() {
    return !!this.ctx && this.ctx.state !== "running";
  }

  /** Create or resume the context. Must run inside a user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.35;
      this.sfxBus.connect(this.ctx.destination);
      this.ctx.onstatechange = () => this.emit();
      // iPhone: play through the silent switch like a music app, instead of being muted by it
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  private load(track: Track) {
    if (!this.buffers.has(track.id)) {
      const p = fetch(track.src)
        .then((r) => {
          if (!r.ok) throw new Error(`Could not load ${track.src}`);
          return r.arrayBuffer();
        })
        .then((data) => this.ctx!.decodeAudioData(data));
      // Forget failed loads so the next attempt retries.
      p.catch(() => this.buffers.delete(track.id));
      this.buffers.set(track.id, p);
    }
    return this.buffers.get(track.id)!;
  }

  /** Elapsed seconds in the current loop, for the Walkman's clock. */
  get elapsed() {
    if (!this.ctx || !this.current) return 0;
    // Before the new track starts (during the gap) the clock stays at 0.
    return Math.max(0, this.ctx.currentTime - this.current.startedAt) % this.current.duration;
  }

  get track() {
    return TRACKS[this.trackIndex];
  }

  async play(index = this.trackIndex) {
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.trackIndex = (index + TRACKS.length) % TRACKS.length;
    this.loading = true;
    this.playing = true;
    this.emit();

    const wanted = this.trackIndex;
    let buffer: AudioBuffer;
    try {
      buffer = await this.load(TRACKS[wanted]);
    } catch {
      this.loading = false;
      this.playing = false;
      this.emit();
      return;
    }
    // The listener may have skipped ahead or paused while this was loading.
    if (wanted !== this.trackIndex || !this.playing) return;

    // Switching tracks: fade the old loop out quickly, hold a short beat of silence,
    // then fade the new one in, like the gap between songs on a real player.
    const now = ctx.currentTime;
    const fadeOut = 0.3;
    const gap = 0.35;
    let startAt = now;
    if (this.current) {
      const old = this.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fadeOut);
      old.src.stop(now + fadeOut + 0.02);
      startAt = now + fadeOut + gap;
    }
    const fadeIn = this.current ? 0.7 : 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(1, startAt + fadeIn);
    gain.connect(this.master);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true; // gapless, unlike <audio loop>
    src.connect(gain);
    src.start(startAt);
    this.current = { src, gain, startedAt: startAt, duration: buffer.duration };
    this.loading = false;
    this.emit();

    // Warm the next track so skipping is instant.
    void this.load(TRACKS[(wanted + 1) % TRACKS.length]).catch(() => {});
  }

  pause() {
    if (this.ctx && this.current) {
      const now = this.ctx.currentTime;
      const old = this.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 0.5);
      old.src.stop(now + 0.55);
      this.current = null;
    }
    this.playing = false;
    this.loading = false;
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else void this.play();
  }

  next() {
    this.skip(1);
  }

  prev() {
    this.skip(-1);
  }

  private skip(dir: 1 | -1) {
    const index = (this.trackIndex + dir + TRACKS.length) % TRACKS.length;
    if (this.playing) void this.play(index);
    else {
      this.trackIndex = index;
      this.emit();
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    this.emit();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    this.emit();
  }

  // ---------- Sound effects, synthesized so there are no extra files ----------

  private ready() {
    return this.sfxOn && this.ctx && this.ctx.state === "running";
  }

  /** Short glassy tick when the menu cursor moves. Pitch rises toward the bottom of the list. */
  blip(step = 0) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1180 + step * 70, t);
    osc.frequency.exponentialRampToValueAtTime(1700 + step * 70, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Confirm: a bright two-note chime over a short watery whoosh. */
  confirm() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const s = t + i * 0.055;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.45, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.35);
      osc.connect(g).connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 0.4);
    });
    this.whoosh(0.28, 0.3);
  }

  /** Back: a quick downward sweep. */
  back() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Bubble pop for clicks on the water. */
  bubble() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    const base = 380 + Math.random() * 260;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 2.6, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Impact: a low thump over a noisy crack, for spells, kicks and trades. */
  hit(big = false) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(big ? 190 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(big ? 38 : 70, t + (big ? 0.4 : 0.22));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(big ? 0.9 : 0.6, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.55 : 0.28));
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.6);
    this.whoosh(big ? 0.45 : 0.16, big ? 0.55 : 0.28);
  }

  /** Rank up: a quick rising arpeggio, like a Social Link levelling up. */
  rankUp() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    [660, 830, 990, 1320].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      const s = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.4, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + (i === 3 ? 0.6 : 0.2));
      osc.connect(g).connect(this.sfxBus);
      osc.start(s);
      osc.stop(s + 0.65);
    });
  }

  private whoosh(duration: number, level: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(t);
  }
}

export const audio = new AudioEngine();

"use client";

// One shared AudioContext for the radio's city ambience and the page's sound effects.
// Browsers only allow audio after a click or key press, so the context is created
// lazily by unlock(), which the page calls on the first pointer or key event.

export type Track = { id: string; title: string; subtitle: string; src: string };

export const TRACKS: Track[] = [
  { id: "window", title: "Rain on the window", subtitle: "Light rain", src: "/audio/window.mp3" },
  { id: "storm", title: "Thunderstorm", subtitle: "Heavy rain", src: "/audio/storm.mp3" },
  { id: "street", title: "Night traffic", subtitle: "Wet streets", src: "/audio/street.mp3" },
  { id: "bar", title: "Late-night bar", subtitle: "Downtown", src: "/audio/bar.mp3" },
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
      const saved = JSON.parse(localStorage.getItem("noir-radio") ?? "{}");
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
    window.dispatchEvent(
      new CustomEvent("noir:station", { detail: { id: this.playing ? this.track.id : null } }),
    );
    try {
      localStorage.setItem(
        "noir-radio",
        JSON.stringify({ track: this.trackIndex, volume: this.volume, sfx: this.sfxOn }),
      );
    } catch {
      /* ignore */
    }
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
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
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

    // Switching stations: the old one fades out under a short burst of tuning static,
    // then the new one fades in, like turning the dial on an old radio.
    const now = ctx.currentTime;
    const fadeOut = 0.25;
    let startAt = now;
    if (this.current) {
      const old = this.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fadeOut);
      old.src.stop(now + fadeOut + 0.02);
      startAt = now + 0.8;
      this.staticBurst(now);
    }
    const fadeIn = this.current ? 0.6 : 1.2;
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

  /** Tuning static between stations: a recorded burst if loaded, synthesized hiss if not. */
  private staticBurst(at: number) {
    const ctx = this.ctx!;
    const play = (buf: AudioBuffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(g).connect(this.master);
      src.start(at);
    };
    this.load({ id: "tune", title: "", subtitle: "", src: "/audio/tune.mp3" })
      .then(play)
      .catch(() => this.whoosh(0.8, 0.15));
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

  /** Thunder after a lightning strike: a sharp crack, then a low rolling rumble. */
  thunder(delay = 0.15) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const dur = 3.2;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // Brown noise: integrated white noise, which sounds like distant rumble
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.4, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.5);
    g.gain.linearRampToValueAtTime(0.7, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(this.sfxBus);
    src.start(t);
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

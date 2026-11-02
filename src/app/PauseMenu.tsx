"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import Bubbles, { burst } from "./Bubbles";
import HeroModel from "./HeroModel";
import OceanCanvas from "./OceanCanvas";
import Walkman from "./Walkman";
import { GAMES } from "./Hobbies";
import { DuelStage, LibraryStage, RecommenderStage, TilawahStage } from "./Stages";
import { education, hobbies, profile, projects, skills, type Project } from "./content";

type SectionId = "profile" | "projects" | "skills" | "activities" | "contact";
type View = "main" | SectionId;

// Each entry has its own size, indent and tilt so the list staggers like the game menu.
// `hint` labels the menu cursor; `ask` is the question shown inside the submenu.
const MENU: {
  id: SectionId;
  label: string;
  size: number;
  indent: number;
  tilt: number;
  hint: string;
  ask: string;
}[] = [
  { id: "profile", label: "Profile", size: 1.0, indent: 2.2, tilt: -1.5, hint: "Who I am", ask: "Who is Noureldin?" },
  {
    id: "projects",
    label: "Projects",
    size: 1.25,
    indent: 0.6,
    tilt: 1,
    hint: "Things I built",
    ask: "Which project do you want to see?",
  },
  { id: "skills", label: "Skills", size: 0.95, indent: 2.6, tilt: 2, hint: "What I use", ask: "What does he build with?" },
  {
    id: "activities",
    label: "Activities",
    size: 1.0,
    indent: 1.0,
    tilt: -1,
    hint: "Life outside code",
    ask: "What does he do for fun?",
  },
  { id: "contact", label: "Contact", size: 1.1, indent: 2.0, tilt: 0.5, hint: "Say hello", ask: "How do you want to reach him?" },
];

type Key = "nav" | "open" | "back" | "switch" | null;
type Wipe = { x: number; y: number; phase: "in" | "out"; n: number } | null;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PauseMenu() {
  const [view, setView] = useState<View>("main");
  const [cursor, setCursor] = useState<SectionId>("projects"); // highlighted item on the main menu
  const [cut, setCut] = useState(0); // bumps on every section switch to replay the slash
  const [pressed, setPressed] = useState<Key>(null);
  const [wipe, setWipe] = useState<Wipe>(null);
  const screenRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const subRef = useRef<HTMLElement | null>(null);
  const busy = useRef(false);
  // Selections inside submenus, kept here so the side panel and the column stay in sync
  const [proj, setProj] = useState(0);
  const [hobby, setHobby] = useState(0);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [rankUp, setRankUp] = useState<{ id: string; rank: number; n: number } | null>(null);
  const [skill, setSkill] = useState<string | null>(null);

  const scoreHobby = useCallback(
    (id: string) => {
      const cur = ranks[id] ?? 1;
      if (cur >= 5) return;
      setRanks((r) => ({ ...r, [id]: cur + 1 }));
      setRankUp({ id, rank: cur + 1, n: Date.now() });
    },
    [ranks],
  );
  const pickProj = useCallback((i: number) => {
    setProj(i);
    audio.blip(i + 1);
  }, []);
  const pickHobby = useCallback((i: number) => {
    setHobby(i);
    audio.blip(i);
  }, []);

  const inSub = view !== "main";
  const hovered = MENU.find((m) => m.id === cursor)!;
  const section = inSub ? MENU.find((m) => m.id === view)! : null;

  const flashKey = useCallback((k: Key) => {
    setPressed(k);
    window.setTimeout(() => setPressed((p) => (p === k ? null : p)), 160);
  }, []);

  const select = useCallback((id: SectionId) => {
    setCursor((prev) => {
      if (prev !== id) audio.blip(MENU.findIndex((m) => m.id === id));
      return id;
    });
  }, []);

  const move = useCallback(
    (dir: 1 | -1) => {
      const i = MENU.findIndex((m) => m.id === cursor);
      const next = MENU[(i + dir + MENU.length) % MENU.length];
      select(next.id);
      tabRefs.current[next.id]?.focus();
      flashKey("nav");
    },
    [cursor, select, flashKey],
  );

  /**
   * Bubble wipe between the main menu and a submenu: a bubble grows from the click
   * until it covers the screen, the view swaps underneath, then a hole opens in the
   * bubble from the same point to reveal the new screen.
   */
  const transition = useCallback((to: View, x: number, y: number, after?: () => void) => {
    if (busy.current) return;
    if (reducedMotion()) {
      setView(to);
      after?.();
      return;
    }
    busy.current = true;
    const n = Date.now();
    setWipe({ x, y, phase: "in", n });
    window.setTimeout(() => {
      setView(to);
      setCut((c) => c + 1);
      setWipe({ x, y, phase: "out", n });
      after?.();
    }, 320);
    window.setTimeout(() => {
      setWipe((w) => (w && w.n === n ? null : w));
      busy.current = false;
    }, 320 + 520);
  }, []);

  const open = useCallback(
    (id: SectionId, from?: { x: number; y: number }) => {
      select(id);
      audio.confirm();
      flashKey("open");
      const r = tabRefs.current[id]?.getBoundingClientRect();
      const x = from?.x ?? (r ? r.left + r.width * 0.5 : window.innerWidth / 2);
      const y = from?.y ?? (r ? r.top + r.height / 2 : window.innerHeight / 2);
      burst(x, y, 24);
      transition(id, x, y, () =>
        requestAnimationFrame(() => subRef.current?.focus({ preventScroll: true })),
      );
    },
    [select, flashKey, transition],
  );

  const back = useCallback(() => {
    if (view === "main") return;
    audio.back();
    flashKey("back");
    const returnTo = view;
    transition("main", window.innerWidth * 0.25, window.innerHeight * 0.5, () =>
      requestAnimationFrame(() => tabRefs.current[returnTo]?.focus({ preventScroll: true })),
    );
  }, [view, flashKey, transition]);

  // Inside a submenu: jump to the previous or next section, like LB / RB in the game.
  const cycle = useCallback(
    (dir: 1 | -1) => {
      if (view === "main") return;
      const i = MENU.findIndex((m) => m.id === view);
      const next = MENU[(i + dir + MENU.length) % MENU.length];
      setView(next.id);
      setCursor(next.id);
      setCut((c) => c + 1);
      audio.blip(MENU.findIndex((m) => m.id === next.id));
      flashKey("switch");
    },
    [view, flashKey],
  );

  const goTo = useCallback(
    (id: SectionId) => {
      if (id === view) return;
      setView(id);
      setCursor(id);
      setCut((c) => c + 1);
      audio.confirm();
    },
    [view],
  );

  // Keyboard: arrows move the cursor, Esc goes back, Q/E or ←/→ switch sections in a submenu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      audio.unlock();
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (view === "main") {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          move(e.key === "ArrowDown" ? 1 : -1);
        }
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        back();
      } else if (e.key === "q" || e.key === "Q" || e.key === "ArrowLeft") cycle(-1);
      else if (e.key === "e" || e.key === "E" || e.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, back, move, cycle]);

  // Mouse parallax: layers drift by different amounts so the scene has depth.
  useEffect(() => {
    const el = screenRef.current;
    if (!el || reducedMotion()) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Clicking the water releases bubbles. The first click also unlocks audio.
  const onPointerDown = (e: React.PointerEvent) => {
    audio.unlock();
    const target = e.target as HTMLElement;
    if (target.closest(".sub-scroll, .wm-controls, input")) return;
    burst(e.clientX, e.clientY, 10);
    if (!target.closest("button, a")) audio.bubble();
  };

  return (
    <main
      ref={screenRef}
      className="screen"
      data-view={inSub ? "sub" : "main"}
      onPointerDown={onPointerDown}
    >
      <div className="backdrop" aria-hidden="true">
        <OceanCanvas />
        <Stairs />
      </div>
      <Bubbles />

      {/* White plate: a wedge on the main menu, a wide diagonal in submenus */}
      <div className="wedge" aria-hidden="true">
        <span className="wedge-name">NOURELDIN</span>
      </div>

      {section && (
        <div className="ghost" key={`g-${section.id}`} aria-hidden="true">
          {section.label}
        </div>
      )}

      {/* The illustrated character, on the main menu only */}
      <div className="hero" data-pose={view} aria-hidden="true">
        <div className="hero-float">
          <HeroModel />
        </div>
      </div>

      <Shards />
      <Walkman />

      <header className="hud" inert={inSub}>
        <h1 className="hud-name">{profile.name}</h1>
        <p className="hud-sub">{profile.role}</p>
      </header>

      <nav className="party" aria-label="Elsewhere" inert={inSub}>
        <PartyBadge href={profile.github} label="GitHub" glyph="gh" fill={0.92} i={0} />
        <PartyBadge href={profile.linkedin} label="LinkedIn" glyph="in" fill={0.74} i={1} />
        <PartyBadge href={`mailto:${profile.email}`} label="Email" glyph="@" fill={0.83} i={2} />
      </nav>

      <nav className="menu" aria-label="Portfolio sections" inert={inSub}>
        {MENU.map((m, i) => {
          const isSel = m.id === cursor;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabRefs.current[m.id] = el;
              }}
              className="menu-item"
              data-selected={isSel}
              tabIndex={isSel ? 0 : -1}
              aria-label={`${m.label}: ${m.hint}`}
              style={
                {
                  "--size": m.size,
                  "--indent": `${m.indent}em`,
                  "--tilt": `${m.tilt}deg`,
                  "--depth": i / (MENU.length - 1),
                  "--delay": `${150 + i * 75}ms`,
                  "--bob": `${3.1 + (i % 3) * 0.55}s`,
                  "--phase": `${-i * 0.7}s`,
                } as React.CSSProperties
              }
              onPointerEnter={() => select(m.id)}
              onFocus={() => select(m.id)}
              onClick={(e) => open(m.id, e.detail > 0 ? { x: e.clientX, y: e.clientY } : undefined)}
            >
              <span className="menu-float">
                <span className="menu-label" data-text={m.label}>
                  {m.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {section && (
        <section
          ref={subRef}
          className="sub"
          aria-labelledby="sub-title"
          tabIndex={-1}
          key="sub"
        >
          <button className="sub-back" onClick={back}>
            <span aria-hidden="true">◀</span> Back
          </button>

          <nav className="sub-nav" aria-label="Sections">
            {MENU.map((m, i) => (
              <button
                key={m.id}
                className="sub-nav-item"
                data-current={m.id === section.id}
                aria-current={m.id === section.id ? "page" : undefined}
                style={{ "--i": i } as React.CSSProperties}
                onPointerEnter={() => audio.blip(i)}
                onClick={() => goTo(m.id)}
              >
                {m.label}
              </button>
            ))}
          </nav>

          <Side
            key={`side-${section.id}`}
            id={section.id}
            proj={proj}
            pickProj={pickProj}
            hobby={hobby}
            pickHobby={pickHobby}
            ranks={ranks}
            skill={skill}
          />

          <div className="sub-col">
            <div className="cutin" key={`cut-${cut}`} aria-hidden="true" />
            <header className="sub-tabs">
              <button className="sub-arrow" onClick={() => cycle(-1)} aria-label="Previous section">
                <span aria-hidden="true">◀</span>
                <kbd>Q</kbd>
              </button>
              <div className="sub-heading">
                <h2 id="sub-title" key={`h-${section.id}`}>
                  {section.label}
                </h2>
                <span className="sub-dots" aria-hidden="true">
                  {MENU.map((m) => (
                    <i key={m.id} data-on={m.id === section.id} />
                  ))}
                </span>
              </div>
              <button className="sub-arrow" onClick={() => cycle(1)} aria-label="Next section">
                <kbd>E</kbd>
                <span aria-hidden="true">▶</span>
              </button>
            </header>
            <div className="sub-scroll">
              <div className="sub-body" key={`b-${section.id}-${cut}`}>
                {section.id === "profile" && <ProfilePanel />}
                {section.id === "projects" && <ProjectsPanel proj={proj} pickProj={pickProj} />}
                {section.id === "skills" && <SkillsPanel skill={skill} setSkill={setSkill} />}
                {section.id === "activities" && (
                  <ActivitiesPanel
                    hobby={hobby}
                    pickHobby={pickHobby}
                    ranks={ranks}
                    rankUp={rankUp}
                    onScore={scoreHobby}
                  />
                )}
                {section.id === "contact" && <ContactPanel />}
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="prompt" aria-hidden="true">
        <p className="prompt-title" key={section ? `a-${section.id}` : `h-${cursor}`}>
          {section ? section.ask : hovered.hint}
        </p>
        <span className="prompt-rule" />
        <p className="prompt-keys">
          {section ? (
            <>
              <span className="key" data-down={pressed === "switch"}>
                <kbd>Q</kbd>
                <kbd>E</kbd> Switch
              </span>
              <span className="key" data-down={pressed === "back"}>
                <kbd>Esc</kbd> Back
              </span>
            </>
          ) : (
            <>
              <span className="key" data-down={pressed === "nav"}>
                <kbd>↑↓</kbd> Select
              </span>
              <span className="key" data-down={pressed === "open"}>
                <kbd>↵</kbd> Open
              </span>
            </>
          )}
        </p>
      </footer>

      {wipe && (
        <div
          className="wipe"
          data-phase={wipe.phase}
          aria-hidden="true"
          style={{ "--x": `${wipe.x}px`, "--y": `${wipe.y}px` } as React.CSSProperties}
        />
      )}
    </main>
  );
}

/** Faint staircase rising toward the light, drawn in perspective. */
function Stairs() {
  const steps = 34;
  const lines: { y: number; x1: number; x2: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const e = 1 - Math.pow(1 - k, 1.9); // steps bunch up as they recede
    const y = 100 - e * 88;
    const half = 22 - e * 17;
    lines.push({ y, x1: 54 - half, x2: 54 + half });
  }
  return (
    <svg className="stairs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {lines.map((l) => (
        <line key={l.y} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} />
      ))}
      <line x1={32} y1={100} x2={49} y2={12} />
      <line x1={76} y1={100} x2={59} y2={12} />
    </svg>
  );
}

/** Drifting glass shards. */
function Shards() {
  const shards = [
    { l: "24%", t: "14%", w: 64, h: 40, c: "var(--surf)", p: "polygon(0 30%, 100% 0, 70% 100%)", d: 14, z: 1.4 },
    { l: "19%", t: "47%", w: 36, h: 54, c: "var(--pink)", p: "polygon(20% 0, 100% 40%, 0 100%)", d: 11, z: 1.8 },
    { l: "15%", t: "70%", w: 90, h: 70, c: "var(--ocean)", p: "polygon(0 0, 100% 35%, 30% 100%)", d: 17, z: 1.1 },
    { l: "27%", t: "31%", w: 28, h: 22, c: "var(--paper)", p: "polygon(0 0, 100% 50%, 10% 100%)", d: 9, z: 2.2 },
    { l: "44%", t: "8%", w: 22, h: 30, c: "var(--paper)", p: "polygon(50% 0, 100% 100%, 0 80%)", d: 13, z: 0.8 },
    { l: "36%", t: "86%", w: 46, h: 30, c: "var(--surf)", p: "polygon(0 60%, 100% 0, 80% 100%)", d: 16, z: 1.3 },
    { l: "8%", t: "22%", w: 30, h: 46, c: "var(--pink)", p: "polygon(0 0, 100% 30%, 40% 100%)", d: 12, z: 1.6 },
    { l: "49%", t: "62%", w: 18, h: 14, c: "var(--paper)", p: "polygon(0 0, 100% 40%, 30% 100%)", d: 10, z: 0.6 },
  ];
  return (
    <div className="shards" aria-hidden="true">
      {shards.map((s, i) => (
        <span
          key={i}
          className="shard"
          style={
            {
              left: s.l,
              top: s.t,
              width: s.w,
              height: s.h,
              background: s.c,
              clipPath: s.p,
              "--dur": `${s.d}s`,
              "--del": `${-i * 1.7}s`,
              "--z": s.z,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function PartyBadge({
  href,
  label,
  glyph,
  fill,
  i,
}: {
  href: string;
  label: string;
  glyph: string;
  fill: number;
  i: number;
}) {
  const external = href.startsWith("http");
  return (
    <a
      className="badge"
      href={href}
      aria-label={label}
      style={{ "--i": i } as React.CSSProperties}
      onPointerEnter={() => audio.blip(i + 2)}
      onClick={() => audio.confirm()}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="badge-glyph">{glyph}</span>
      <span className="badge-name">{label}</span>
      <span className="badge-bars" style={{ "--fill": fill } as React.CSSProperties}>
        <i />
        <i />
      </span>
    </a>
  );
}

function ProfilePanel() {
  return (
    <div className="stack">
      <p className="lead entry" style={{ "--i": 0 } as React.CSSProperties}>
        {profile.intro}
      </p>
      <dl className="stats entry" style={{ "--i": 1 } as React.CSSProperties}>
        <div>
          <dt>School</dt>
          <dd>{education.school}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{education.program}</dd>
        </div>
        <div>
          <dt>Graduating</dt>
          <dd>{education.date}</dd>
        </div>
        <div>
          <dt>Based in</dt>
          <dd>{profile.location}</dd>
        </div>
      </dl>
    </div>
  );
}

/* ---------- Side panel: fills the space on the left of every submenu ---------- */

// Which skills each piece of work uses, so picking a skill lights up where it shows up.
const USES: { id: string; title: string; skills: string[] }[] = [
  {
    id: "recommender",
    title: "AI Movie Recommender",
    skills: ["Python", "SQL", "React", "FastAPI", "PyTorch", "PostgreSQL", "REST APIs", "Docker", "GitHub Actions", "Railway", "Vercel", "Hugging Face Hub", "Unit testing", "System design"],
  },
  {
    id: "tilawah",
    title: "Tilawah",
    skills: ["TypeScript", "React", "Express", "REST APIs", "OAuth2", "Azure Cognitive Services", "Gemini API", "Groq SDK"],
  },
  { id: "msa-library", title: "MSA Library System", skills: ["TypeScript", "React", "Supabase", "SQL", "Agile", "Unit testing"] },
  { id: "wizard-duel", title: "Wizard Duel", skills: ["Luau", "OOP", "System design"] },
  { id: "site", title: "This website", skills: ["TypeScript", "React", "Next.js", "Vercel", "Bash"] },
  { id: "school", title: "uOttawa coursework", skills: ["Java", "Python", "OOP", "SQL", "Bash"] },
];

const STATS = [
  { k: "Code", lv: 5, title: "Genius", why: "Full-stack apps, machine learning models and Roblox games." },
  { k: "Creativity", lv: 4, title: "Visionary", why: "Designs his own games, and this pause menu." },
  { k: "Courage", lv: 4, title: "Daring", why: "Rock climbing, hackathons, and shipping before it feels ready." },
  { k: "Teamwork", lv: 5, title: "Captain", why: "An 8-developer Agile team, soccer, and events for 100+ people." },
  { k: "Charm", lv: 4, title: "Stylish", why: "Fashion is a hobby. The fits are on purpose." },
];

function Side({
  id,
  proj,
  pickProj,
  hobby,
  pickHobby,
  ranks,
  skill,
}: {
  id: SectionId;
  proj: number;
  pickProj: (i: number) => void;
  hobby: number;
  pickHobby: (i: number) => void;
  ranks: Record<string, number>;
  skill: string | null;
}) {
  return (
    <aside className="side" data-kind={id}>
      {id === "profile" && <StatsRadar />}
      {id === "projects" && (
        <>
          <p className="side-kicker">Select a project</p>
          <ProjectPicker proj={proj} pickProj={pickProj} />
        </>
      )}
      {id === "activities" && (
        <>
          <p className="side-kicker">Social links</p>
          <HobbyPicker hobby={hobby} pickHobby={pickHobby} ranks={ranks} />
        </>
      )}
      {id === "skills" && (
        <>
          <p className="side-kicker">{skill ? `Where ${skill} shows up` : "Pick a skill to see where it shows up"}</p>
          <ul className="uses">
            {USES.map((u, i) => {
              const on = !!skill && u.skills.includes(skill);
              return (
                <li key={u.id} data-on={on} data-dim={!!skill && !on} style={{ "--i": i } as React.CSSProperties}>
                  {u.title}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {id === "contact" && <Invite />}
    </aside>
  );
}

function ProjectPicker({ proj, pickProj, inline }: { proj: number; pickProj: (i: number) => void; inline?: boolean }) {
  return (
    <div className={inline ? "picker picker-inline" : "picker"} role="tablist" aria-label="Projects">
      {projects.map((p, i) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={i === proj}
          className="pick"
          data-on={i === proj}
          style={{ "--i": i } as React.CSSProperties}
          onClick={() => pickProj(i)}
        >
          <span className="pick-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="pick-text">
            <span className="pick-name">{p.title}</span>
            <span className="pick-sub">{p.kind}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function HobbyPicker({
  hobby,
  pickHobby,
  ranks,
  inline,
}: {
  hobby: number;
  pickHobby: (i: number) => void;
  ranks: Record<string, number>;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "picker picker-inline picker-hobby" : "picker picker-hobby"} role="tablist" aria-label="Hobbies">
      {hobbies.map((h, i) => {
        const r = ranks[h.id] ?? 1;
        return (
          <button
            key={h.id}
            role="tab"
            aria-selected={i === hobby}
            className="pick"
            data-on={i === hobby}
            style={{ "--i": i } as React.CSSProperties}
            onClick={() => pickHobby(i)}
          >
            <span className="pick-text">
              <span className="pick-name">{h.name}</span>
              <span className="pick-pips" aria-label={`Rank ${r} of 5`}>
                {[1, 2, 3, 4, 5].map((k) => (
                  <i key={k} data-on={k <= r} />
                ))}
              </span>
            </span>
            <span className="pick-rank">{r === 5 ? "MAX" : `R${r}`}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatsRadar() {
  const [hover, setHover] = useState(0);
  const n = STATS.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r] as const;
  };
  const ring = (r: number) => STATS.map((_, i) => pt(i, r).join(",")).join(" ");
  const shape = STATS.map((s, i) => pt(i, (s.lv / 5) * 72).join(",")).join(" ");
  const cur = STATS[hover];
  return (
    <div className="radar">
      <p className="side-kicker">Social stats</p>
      <svg viewBox="-20 -6 240 212" className="radar-svg" role="img" aria-label="Social stats chart">
        {[1, 2, 3, 4, 5].map((k) => (
          <polygon key={k} points={ring((k / 5) * 72)} className="radar-ring" />
        ))}
        {STATS.map((_, i) => {
          const [x, y] = pt(i, 72);
          return <line key={i} x1="100" y1="100" x2={x} y2={y} className="radar-spoke" />;
        })}
        <polygon points={shape} className="radar-shape" />
        {STATS.map((s, i) => {
          const [x, y] = pt(i, (s.lv / 5) * 72);
          const [lx, ly] = pt(i, 92);
          return (
            <g key={s.k} className="radar-axis" data-on={i === hover} onPointerEnter={() => { setHover(i); audio.blip(i); }} onClick={() => setHover(i)}>
              <circle cx={x} cy={y} r="4.5" className="radar-dot" />
              <text x={lx} y={ly + 4} textAnchor="middle" className="radar-label">
                {s.k}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="radar-info" key={cur.k}>
        <span className="radar-title">
          {cur.k} <b>Lv {cur.lv}</b> <em>{cur.title}</em>
        </span>
        <span className="radar-why">{cur.why}</span>
      </div>
    </div>
  );
}

function Invite() {
  const [joined, setJoined] = useState(0);
  const invite = async (e: React.MouseEvent) => {
    burst(e.clientX, e.clientY, 28);
    audio.rankUp();
    setJoined(Date.now());
    try {
      await navigator.clipboard.writeText(profile.email);
    } catch {
      /* clipboard blocked: the email is still on screen */
    }
  };
  return (
    <div className="invite">
      <p className="side-kicker">New party member?</p>
      <button className="invite-btn" onClick={invite}>
        <span>Invite to party</span>
      </button>
      <p className="invite-msg" key={joined} data-on={joined > 0} aria-live="polite">
        {joined > 0 ? (
          <>
            <b>Noureldin joined your party!</b>
            <span>His email is copied. Paste it anywhere.</span>
          </>
        ) : (
          <span>One click copies his email.</span>
        )}
      </p>
    </div>
  );
}

/* ---------- Section bodies ---------- */

function ProjectsPanel({ proj, pickProj }: { proj: number; pickProj: (i: number) => void }) {
  const p = projects[proj];
  return (
    <div className="stack">
      <ProjectPicker proj={proj} pickProj={pickProj} inline />
      <ProjectEntry key={p.id} p={p} />
    </div>
  );
}

function ProjectStage({ p }: { p: Project }) {
  if (p.id === "recommender") return <RecommenderStage />;
  if (p.id === "tilawah") return <TilawahStage />;
  if (p.id === "msa-library") return <LibraryStage />;
  if (p.id === "wizard-duel") return <DuelStage image={p.image} />;
  return null;
}

function ProjectEntry({ p }: { p: Project }) {
  return (
    <article className="entry project">
      <div className="entry-bar">
        <h3>{p.title}</h3>
        <span>{p.date}</span>
      </div>
      <p className="entry-kind">{p.kind}</p>
      <p className="entry-summary">{p.summary}</p>
      <ProjectStage p={p} />
      <ul className="entry-points">
        {p.points.map((pt) => (
          <li key={pt}>{pt}</li>
        ))}
      </ul>
      <ul className="tags" aria-label="Built with">
        {p.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {p.links.length > 0 && (
        <div className="entry-links">
          {p.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" onClick={() => audio.confirm()}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function SkillsPanel({ skill, setSkill }: { skill: string | null; setSkill: (s: string | null) => void }) {
  const where = skill ? USES.filter((u) => u.skills.includes(skill)).map((u) => u.title) : [];
  return (
    <div className="skills">
      {skills.map((g, i) => (
        <div className="skill-row entry" key={g.group} style={{ "--i": i } as React.CSSProperties}>
          <h3>{g.group}</h3>
          <ul className="tags tags-pick">
            {g.items.map((s) => (
              <li key={s}>
                <button
                  data-on={s === skill}
                  aria-pressed={s === skill}
                  onClick={() => {
                    setSkill(s === skill ? null : s);
                    audio.blip(i);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="skill-where" aria-live="polite">
        {skill ? `${skill}: ${where.join(", ")}` : "Tap a skill to see where it shows up."}
      </p>
    </div>
  );
}

function ActivitiesPanel({
  hobby,
  pickHobby,
  ranks,
  rankUp,
  onScore,
}: {
  hobby: number;
  pickHobby: (i: number) => void;
  ranks: Record<string, number>;
  rankUp: { id: string; rank: number; n: number } | null;
  onScore: (id: string) => void;
}) {
  const h = hobbies[hobby];
  const rank = ranks[h.id] ?? 1;
  const Game = GAMES[h.id];
  return (
    <div className="stack">
      <HobbyPicker hobby={hobby} pickHobby={pickHobby} ranks={ranks} inline />
      <article className="entry hobby" key={h.id}>
        <div className="entry-bar">
          <h3>{h.name}</h3>
          <span>{rank === 5 ? "Rank MAX" : `Rank ${rank}`}</span>
        </div>
        <p className="entry-kind">{h.tag}</p>
        <div className="stage">
          <div className="stage-top">
            <span className="stage-label">Play</span>
            <span className="stage-hint">Win to rank up this social link</span>
          </div>
          <div className="stage-body">
            <Game onScore={() => onScore(h.id)} />
          </div>
          {rankUp && rankUp.id === h.id && (
            <div className="rankup" key={rankUp.n} aria-live="polite">
              <b>Rank up!</b>
              <span>
                {h.name} reached {rankUp.rank === 5 ? "MAX rank" : `rank ${rankUp.rank}`}
              </span>
            </div>
          )}
        </div>
        <ol className="ranks">
          {h.ranks.map((line, i) => (
            <li key={i} data-open={i < rank} data-new={rankUp?.id === h.id && i === rank - 1}>
              <span className="ranks-n">{i === 4 ? "MAX" : `R${i + 1}`}</span>
              <span className="ranks-line">{i < rank ? line : "Locked. Win the game above to rank up."}</span>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}

function ContactPanel() {
  const [copied, setCopied] = useState(false);
  const rows = [
    { label: "GitHub", value: "github.com/ibragot", href: profile.github },
    { label: "LinkedIn", value: "linkedin.com/in/noureldin-ibrahim", href: profile.linkedin },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      audio.confirm();
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still shown and selectable */
    }
  };
  return (
    <div className="stack">
      <p className="lead entry" style={{ "--i": 0 } as React.CSSProperties}>
        Looking for software engineering co-op roles. The fastest way to reach me is email.
      </p>
      <div className="email entry" style={{ "--i": 1 } as React.CSSProperties}>
        <a href={`mailto:${profile.email}`} className="email-address">
          {profile.email}
        </a>
        <button className="email-copy" onClick={copy} data-copied={copied}>
          {copied ? "Copied" : "Copy email"}
        </button>
      </div>
      <ul className="contact-list entry" style={{ "--i": 2 } as React.CSSProperties}>
        {rows.map((r) => (
          <li key={r.label}>
            <a href={r.href} target="_blank" rel="noreferrer" onClick={() => audio.confirm()}>
              <span className="contact-label">{r.label}</span>
              <span className="contact-value">{r.value}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

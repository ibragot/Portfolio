"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import Bubbles, { burst } from "./Bubbles";
import OceanCanvas from "./OceanCanvas";
import Walkman from "./Walkman";
import {
  activities,
  education,
  experience,
  profile,
  projects,
  skills,
  type Project,
} from "./content";

type SectionId = "profile" | "projects" | "experience" | "skills" | "activities" | "contact";

// Each entry has its own size, indent and tilt so the list staggers like the game menu.
const MENU: { id: SectionId; label: string; size: number; indent: number; tilt: number; hint: string }[] = [
  { id: "profile", label: "Profile", size: 1.0, indent: 2.2, tilt: -1.5, hint: "Who I am" },
  { id: "projects", label: "Projects", size: 1.25, indent: 0.6, tilt: 1, hint: "Things I built" },
  { id: "experience", label: "Experience", size: 1.05, indent: 1.4, tilt: -0.5, hint: "Where I work" },
  { id: "skills", label: "Skills", size: 0.95, indent: 2.6, tilt: 2, hint: "What I use" },
  { id: "activities", label: "Activities", size: 1.0, indent: 1.0, tilt: -1, hint: "Community work" },
  { id: "contact", label: "Contact", size: 1.1, indent: 2.0, tilt: 0.5, hint: "Say hello" },
];

type Key = "nav" | "open" | "back" | null;

export default function PauseMenu() {
  const [selected, setSelected] = useState<SectionId>("projects");
  const [open, setOpen] = useState(false); // only matters on small screens
  const [cut, setCut] = useState(0); // bumps on every confirm to replay the cut-in
  const [pressed, setPressed] = useState<Key>(null);
  const screenRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLElement | null>(null);

  const current = MENU.find((m) => m.id === selected)!;

  const flashKey = useCallback((k: Key) => {
    setPressed(k);
    window.setTimeout(() => setPressed((p) => (p === k ? null : p)), 160);
  }, []);

  const select = useCallback((id: SectionId) => {
    setSelected((prev) => {
      if (prev !== id) audio.blip(MENU.findIndex((m) => m.id === id));
      return id;
    });
  }, []);

  const move = useCallback(
    (dir: 1 | -1) => {
      const i = MENU.findIndex((m) => m.id === selected);
      const next = MENU[(i + dir + MENU.length) % MENU.length];
      select(next.id);
      tabRefs.current[next.id]?.focus();
      flashKey("nav");
    },
    [selected, select, flashKey],
  );

  const confirm = useCallback(
    (id: SectionId) => {
      select(id);
      setOpen(true);
      setCut((c) => c + 1);
      audio.confirm();
      flashKey("open");
      const r = tabRefs.current[id]?.getBoundingClientRect();
      if (r) burst(r.left + r.width * 0.6, r.top + r.height / 2, 22);
      // Move focus into the panel so keyboard and screen reader users land on the content.
      requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    },
    [select, flashKey],
  );

  const back = useCallback(() => {
    setOpen(false);
    audio.back();
    flashKey("back");
    tabRefs.current[selected]?.focus();
  }, [selected, flashKey]);

  // Keyboard: arrows move the cursor from anywhere, Enter confirms, Esc goes back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      audio.unlock();
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea")) return;
      if (e.key === "Escape") back();
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (target.closest(".panel")) return; // let the panel scroll
        e.preventDefault();
        move(e.key === "ArrowDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, move]);

  // Mouse parallax: layers drift by different amounts so the scene has depth.
  useEffect(() => {
    const el = screenRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    if (target.closest(".panel-scroll, .wm-controls, input")) return;
    burst(e.clientX, e.clientY, 10);
    if (!target.closest("button, a")) audio.bubble();
  };

  return (
    <main ref={screenRef} className="screen" data-open={open} onPointerDown={onPointerDown}>
      <div className="backdrop" aria-hidden="true">
        <OceanCanvas />
        <Stairs />
      </div>
      <Bubbles />

      {/* White wedge with the giant vertical name */}
      <div className="wedge" aria-hidden="true">
        <span className="wedge-name">NOURELDIN</span>
      </div>

      <Shards />
      <Walkman />

      <header className="hud">
        <h1 className="hud-name">{profile.name}</h1>
        <p className="hud-sub">{profile.role}</p>
      </header>

      <nav className="party" aria-label="Elsewhere">
        <PartyBadge href={profile.github} label="GitHub" glyph="gh" fill={0.92} i={0} />
        <PartyBadge href={profile.linkedin} label="LinkedIn" glyph="in" fill={0.74} i={1} />
        <PartyBadge href={`mailto:${profile.email}`} label="Email" glyph="@" fill={0.83} i={2} />
      </nav>

      <div className="menu" role="tablist" aria-orientation="vertical" aria-label="Portfolio sections">
        {MENU.map((m, i) => {
          const isSel = m.id === selected;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabRefs.current[m.id] = el;
              }}
              role="tab"
              id={`tab-${m.id}`}
              aria-selected={isSel}
              aria-controls="panel"
              tabIndex={isSel ? 0 : -1}
              className="menu-item"
              data-selected={isSel}
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
              onClick={() => confirm(m.id)}
            >
              <span className="menu-float">
                <span className="menu-label" data-text={m.label}>
                  {m.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section
        id="panel"
        ref={panelRef}
        className="panel"
        role="tabpanel"
        aria-labelledby={`tab-${selected}`}
        tabIndex={-1}
      >
        <div className="cutin" key={`cut-${cut}`} data-active={cut > 0} aria-hidden="true" />
        <div className="panel-scroll">
          <div className="panel-head">
            <button className="panel-back" onClick={back}>
              Back
            </button>
            <h2 className="panel-title" key={`t-${selected}-${cut}`}>
              {current.label}
            </h2>
          </div>
          <div className="panel-body" key={`b-${selected}-${cut}`}>
            {selected === "profile" && <ProfilePanel />}
            {selected === "projects" && <ProjectsPanel />}
            {selected === "experience" && <ExperiencePanel />}
            {selected === "skills" && <SkillsPanel />}
            {selected === "activities" && <ActivitiesPanel />}
            {selected === "contact" && <ContactPanel />}
          </div>
        </div>
      </section>

      <footer className="prompt" aria-hidden="true">
        <p className="prompt-title" key={selected}>
          {current.hint}
        </p>
        <span className="prompt-rule" />
        <p className="prompt-keys">
          <span className="key" data-down={pressed === "nav"}>
            <kbd>↑↓</kbd> Select
          </span>
          <span className="key" data-down={pressed === "open"}>
            <kbd>↵</kbd> Open
          </span>
          <span className="key" data-down={pressed === "back"}>
            <kbd>Esc</kbd> Back
          </span>
        </p>
      </footer>
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

function ProjectsPanel() {
  return (
    <div className="stack">
      {projects.map((p, i) => (
        <ProjectEntry key={p.id} p={p} i={i} />
      ))}
    </div>
  );
}

function ProjectEntry({ p, i }: { p: Project; i: number }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  return (
    <article className="entry" style={{ "--i": i } as React.CSSProperties}>
      <div className="entry-bar">
        <h3>{p.title}</h3>
        <span>{p.date}</span>
      </div>
      {p.image && imgOk && (
        // Hosted on Roblox's CDN; hidden if it ever stops loading.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="entry-shot"
          src={p.image}
          alt={`${p.title} gameplay`}
          loading="lazy"
          onError={() => setImgOk(false)}
        />
      )}
      <p className="entry-kind">{p.kind}</p>
      <p className="entry-summary">{p.summary}</p>
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
      <div className="entry-links">
        {p.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" onClick={() => audio.confirm()}>
            {l.label}
          </a>
        ))}
      </div>
    </article>
  );
}

function ExperiencePanel() {
  return (
    <div className="stack">
      {experience.map((x, i) => (
        <article className="entry" key={x.title + x.org} style={{ "--i": i } as React.CSSProperties}>
          <div className="entry-bar">
            <h3>{x.title}</h3>
            <span>{x.date}</span>
          </div>
          <p className="entry-kind">
            {x.org}, {x.where}
          </p>
          <ul className="entry-points">
            {x.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function SkillsPanel() {
  return (
    <div className="skills">
      {skills.map((g, i) => (
        <div className="skill-row entry" key={g.group} style={{ "--i": i } as React.CSSProperties}>
          <h3>{g.group}</h3>
          <ul className="tags">
            {g.items.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ActivitiesPanel() {
  return (
    <div className="stack">
      {activities.map((a, i) => (
        <article className="entry" key={a.title} style={{ "--i": i } as React.CSSProperties}>
          <div className="entry-bar">
            <h3>{a.org}</h3>
            <span>{a.date}</span>
          </div>
          <p className="entry-kind">{a.title}</p>
          <ul className="entry-points">
            {a.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </article>
      ))}
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

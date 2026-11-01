"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  activities,
  education,
  experience,
  profile,
  projects,
  skills,
  type Project,
} from "./content";

type SectionId =
  "profile" | "projects" | "experience" | "skills" | "activities" | "contact";

// Each menu entry gets its own size and indent so the list staggers like a game pause menu.
const MENU: {
  id: SectionId;
  label: string;
  size: number;
  indent: number;
  hint: string;
}[] = [
  { id: "profile", label: "Profile", size: 1.0, indent: 2.2, hint: "Who I am" },
  {
    id: "projects",
    label: "Projects",
    size: 1.25,
    indent: 0.6,
    hint: "Things I built",
  },
  {
    id: "experience",
    label: "Experience",
    size: 1.05,
    indent: 1.4,
    hint: "Where I work",
  },
  {
    id: "skills",
    label: "Skills",
    size: 0.95,
    indent: 2.6,
    hint: "What I use",
  },
  {
    id: "activities",
    label: "Activities",
    size: 1.0,
    indent: 1.0,
    hint: "Community work",
  },
  {
    id: "contact",
    label: "Contact",
    size: 1.1,
    indent: 2.0,
    hint: "Say hello",
  },
];

export default function PauseMenu() {
  const [selected, setSelected] = useState<SectionId>("projects");
  const [open, setOpen] = useState(false); // only matters on small screens
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);

  const current = MENU.find((m) => m.id === selected)!;

  const move = useCallback(
    (dir: 1 | -1) => {
      const i = MENU.findIndex((m) => m.id === selected);
      const next = MENU[(i + dir + MENU.length) % MENU.length];
      setSelected(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [selected],
  );

  const confirm = useCallback((id: SectionId) => {
    setSelected(id);
    setOpen(true);
    // Move focus into the panel so keyboard and screen reader users land on the content.
    requestAnimationFrame(() => panelRef.current?.focus());
  }, []);

  const back = useCallback(() => {
    setOpen(false);
    tabRefs.current[selected]?.focus();
  }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  return (
    <main className="screen" data-open={open}>
      <Backdrop />

      {/* White wedge with the giant vertical name */}
      <div className="wedge" aria-hidden="true">
        <span className="wedge-name">NOURELDIN</span>
        <span className="shard s1" />
        <span className="shard s2" />
        <span className="shard s3" />
        <span className="shard s4" />
      </div>

      <header className="hud">
        <h1 className="hud-name">{profile.name}</h1>
        <p className="hud-sub">{profile.role}</p>
      </header>

      <nav className="party" aria-label="Elsewhere">
        <PartyBadge
          href={profile.github}
          label="GitHub"
          glyph="gh"
          fill={0.92}
        />
        <PartyBadge
          href={profile.linkedin}
          label="LinkedIn"
          glyph="in"
          fill={0.74}
        />
        <PartyBadge
          href={`mailto:${profile.email}`}
          label="Email"
          glyph="@"
          fill={0.83}
        />
      </nav>

      <div
        className="menu"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Portfolio sections"
      >
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
                  "--depth": i / (MENU.length - 1),
                  "--delay": `${120 + i * 70}ms`,
                } as React.CSSProperties
              }
              onMouseEnter={() => setSelected(m.id)}
              onFocus={() => setSelected(m.id)}
              onClick={() => confirm(m.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  move(1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  move(-1);
                }
              }}
            >
              <span className="menu-label">{m.label}</span>
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
        <div className="panel-scroll">
          <div className="panel-head">
            <button className="panel-back" onClick={back}>
              Back
            </button>
            <h2 className="panel-title" key={selected}>
              {current.label}
            </h2>
          </div>
          <div className="panel-body" key={`b-${selected}`}>
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
        <p className="prompt-title">
          {current.hint}
          <span className="prompt-rule" />
        </p>
        <p className="prompt-keys">
          <kbd>↑↓</kbd> Select <kbd>↵</kbd> Open <kbd>Esc</kbd> Back
        </p>
      </footer>
    </main>
  );
}

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {/* Underwater light ripples: turbulence noise squeezed into thin bright ridges */}
      <svg
        className="caustics"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <filter id="caustic" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.014"
            numOctaves="2"
            seed="7"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.25"
          />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 0.05 0.9 0.05 0 0" />
          </feComponentTransfer>
        </filter>
        <rect width="1200" height="800" filter="url(#caustic)" />
      </svg>
      <div className="shafts" />
      <div className="vignette" />
    </div>
  );
}

function PartyBadge({
  href,
  label,
  glyph,
  fill,
}: {
  href: string;
  label: string;
  glyph: string;
  fill: number;
}) {
  const external = href.startsWith("http");
  return (
    <a
      className="badge"
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="badge-glyph">{glyph}</span>
      <span className="badge-name">{label}</span>
      <span
        className="badge-bars"
        style={{ "--fill": fill } as React.CSSProperties}
      >
        <i />
        <i />
      </span>
    </a>
  );
}

function ProfilePanel() {
  return (
    <div className="stack">
      <p className="lead">{profile.intro}</p>
      <dl className="stats">
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
      {projects.map((p) => (
        <ProjectEntry key={p.id} p={p} />
      ))}
    </div>
  );
}

function ProjectEntry({ p }: { p: Project }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  return (
    <article className="entry">
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
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
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
      {experience.map((x) => (
        <article className="entry" key={x.title + x.org}>
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
      {skills.map((g) => (
        <div className="skill-row" key={g.group}>
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
      {activities.map((a) => (
        <article className="entry" key={a.title}>
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
  const rows = [
    { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    { label: "GitHub", value: "github.com/ibragot", href: profile.github },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/noureldin-ibrahim",
      href: profile.linkedin,
    },
  ];
  return (
    <div className="stack">
      <p className="lead">
        Looking for software engineering co-op roles. The fastest way to reach
        me is email.
      </p>
      <ul className="contact-list">
        {rows.map((r) => (
          <li key={r.label}>
            <a
              href={r.href}
              {...(r.href.startsWith("http")
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              <span className="contact-label">{r.label}</span>
              <span className="contact-value">{r.value}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

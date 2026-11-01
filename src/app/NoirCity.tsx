"use client";

import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import Radio from "./Radio";
import Scene from "./Scene";
import { alley, lookup, moon, redroofs, rooftop } from "./scenes";
import { activities, education, experience, profile, projects, skills, type Project } from "./content";

const FLOORS = [
  { id: "lobby", label: "Above the city", n: "R" },
  { id: "about", label: "About", n: "9" },
  { id: "projects", label: "Projects", n: "7" },
  { id: "experience", label: "Experience", n: "5" },
  { id: "skills", label: "Skills", n: "3" },
  { id: "activities", label: "Activities", n: "2" },
  { id: "contact", label: "Contact", n: "1" },
] as const;

type FloorId = (typeof FLOORS)[number]["id"];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;

export default function NoirCity() {
  const [floor, setFloor] = useState<FloorId>("lobby");

  useEffect(() => {
    document.documentElement.classList.add("js");

    // Smooth, weighted scrolling for the descent
    let raf = 0;
    if (!reduced()) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));

    const floors = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setFloor(e.target.id as FloorId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    FLOORS.forEach((f) => {
      const el = document.getElementById(f.id);
      if (el) floors.observe(el);
    });

    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onThunder = () => audio.thunder(0.2 + Math.random() * 0.3);
    window.addEventListener("noir:thunder", onThunder);

    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
      reveal.disconnect();
      floors.disconnect();
      window.removeEventListener("noir:thunder", onThunder);
    };
  }, []);

  const goTo = useCallback((id: FloorId) => {
    audio.blip(FLOORS.findIndex((f) => f.id === id));
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
  }, []);

  return (
    <>
      <Elevator floor={floor} onGo={goTo} />
      <Radio />

      <main className="page">
        <Hero onGo={goTo} />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Activities />
        <Contact />
      </main>
    </>
  );
}

/* ---------- Elevator floor dial ---------- */

function Elevator({ floor, onGo }: { floor: FloorId; onGo: (id: FloorId) => void }) {
  const i = FLOORS.findIndex((f) => f.id === floor);
  const angle = -80 + (160 * i) / (FLOORS.length - 1);
  const [open, setOpen] = useState(false);
  return (
    <nav className="elevator" aria-label="Floors" data-open={open}>
      <button
        className="elevator-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="elevator-list"
        aria-label={`Floor: ${FLOORS[i].label}. Show all floors`}
      />
      <div className="elevator-dial" aria-hidden="true">
        {FLOORS.map((f, k) => {
          const a = ((-80 + (160 * k) / (FLOORS.length - 1)) * Math.PI) / 180;
          return (
            <span
              key={f.id}
              className="elevator-num"
              data-on={k === i}
              style={{ left: `${50 + Math.sin(a) * 38}%`, top: `${88 - Math.cos(a) * 66}%` }}
            >
              {f.n}
            </span>
          );
        })}
        <span className="elevator-needle" style={{ transform: `rotate(${angle}deg)` }} />
        <span className="elevator-hub" />
      </div>
      <p className="elevator-floor" aria-live="polite">
        {FLOORS[i].label}
      </p>
      <ul className="elevator-list" id="elevator-list">
        {FLOORS.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => {
                onGo(f.id);
                setOpen(false);
              }}
              aria-current={f.id === floor ? "true" : undefined}
            >
              <span className="elevator-btn-n">{f.n}</span>
              <span className="elevator-btn-label">{f.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- A painted plate: full-bleed scene with a caption ---------- */

function Plate({
  factory,
  caption,
  className,
  children,
  label,
}: {
  factory: Parameters<typeof Scene>[0]["factory"];
  caption: string;
  className?: string;
  children?: React.ReactNode;
  label: string;
}) {
  return (
    <div className={`plate ${className ?? ""}`}>
      <Scene factory={factory} className="plate-canvas" label={label} />
      <span className="plate-fade" aria-hidden="true" />
      <p className="plate-caption" aria-hidden="true">
        {caption}
      </p>
      {children}
    </div>
  );
}

/* ---------- Lobby: above the rooftops, under the moon ---------- */

function Hero({ onGo }: { onGo: (id: FloorId) => void }) {
  const first = "NOURELDIN";
  const last = "IBRAHIM";
  return (
    <section id="lobby" className="hero">
      <Plate factory={moon} caption="Above the city, a little after midnight" className="plate-hero" label="Moonlit rooftops and spires">
        <div className="hero-copy">
          <h1 className="hero-name" aria-label={profile.name}>
            <span className="hero-line" aria-hidden="true">
              {first.split("").map((ch, i) => (
                <span key={i} className="hero-ch" style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="hero-line hero-line-2" aria-hidden="true">
              {last.split("").map((ch, i) => (
                <span key={i} className="hero-ch" style={{ "--i": i + first.length } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          </h1>
          <p className="hero-role">Software engineer, Computer Science at uOttawa</p>
          <div className="hero-actions">
            <button className="btn" onClick={() => onGo("projects")}>
              See my work
            </button>
            <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
          <p className="hero-hint">Scroll down into the city. Hover the windows, click the sky.</p>
        </div>
      </Plate>
    </section>
  );
}

/* ---------- About ---------- */

function About() {
  return (
    <section id="about" className="about">
      <Plate factory={rooftop} caption="The rooftops, east side" className="plate-mid" label="Rooftops at night under the moon" />
      <div className="about-body">
        <div className="blade" data-reveal aria-hidden="true">
          {"NOUR".split("").map((ch, i) => (
            <span key={i} className="blade-ch" style={{ "--i": i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </div>
        <div className="about-text" data-reveal>
          <h2 className="title">About</h2>
          <p className="lead">{profile.intro}</p>
          <dl className="facts">
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
      </div>
    </section>
  );
}

/* ---------- Projects ---------- */

const ARCH: Record<string, string> = {
  "wizard-duel": "arch-duel",
  recommender: "arch-cinema",
  tilawah: "arch-moon",
};

function Projects() {
  return (
    <section id="projects" className="projects">
      <Plate factory={redroofs} caption="Looking down over midtown" className="plate-mid" label="Red sky over rooftops seen from above">
        <h2 className="plate-title" data-reveal>
          Projects
        </h2>
      </Plate>
      <div className="project-list">
        {projects.map((p, i) => (
          <ProjectRow key={p.id} p={p} i={i} />
        ))}
      </div>
    </section>
  );
}

function ProjectRow({ p, i }: { p: Project; i: number }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  const archRef = useRef<HTMLDivElement | null>(null);
  // The scene inside the arch leans toward the cursor, like looking through a window
  const onMove = (e: React.PointerEvent) => {
    const el = archRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--ly", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  return (
    <article className="project" data-reveal style={{ "--i": i } as React.CSSProperties} onPointerMove={onMove}>
      <div className={`arch ${ARCH[p.id] ?? ""}`} ref={archRef} aria-hidden="true">
        <span className="arch-back" />
        <span className="arch-front" />
        <span className="arch-fx">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="arch-frame" />
      </div>
      <div className="project-body">
        <p className="project-n">
          {String(i + 1).padStart(2, "0")}
          <span>{p.kind}</span>
          <span>{p.date}</span>
        </p>
        <h3>{p.title}</h3>
        <p className="project-summary">{p.summary}</p>
        {p.image && imgOk && (
          // Hosted on Roblox's CDN; hidden if it ever stops loading.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="project-shot" src={p.image} alt={`${p.title} gameplay`} loading="lazy" onError={() => setImgOk(false)} />
        )}
        <ul className="points">
          {p.points.slice(0, 3).map((pt) => (
            <li key={pt}>{pt}</li>
          ))}
        </ul>
        <ul className="tags" aria-label="Built with">
          {p.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div className="links">
          {p.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" onClick={() => audio.confirm()}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

/* ---------- Experience: street level, looking up ---------- */

function Experience() {
  return (
    <section id="experience" className="experience">
      <Plate factory={lookup} caption="Street level, looking up" className="plate-tall" label="Lit towers seen from below">
        <div className="exp-overlay">
          <h2 className="plate-title" data-reveal>
            Experience
          </h2>
          {experience.map((x) => (
            <article key={x.title + x.org} className="panel exp-card" data-reveal data-no-strike>
              <p className="exp-org">{x.org}</p>
              <h3>{x.title}</h3>
              <p className="meta">
                {x.date}, {x.where}
              </p>
              <ul className="points">
                {x.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Plate>
    </section>
  );
}

/* ---------- Skills: lit windows on a building face ---------- */

function Skills() {
  return (
    <section id="skills" className="skills">
      <h2 className="title title-xl" data-reveal>
        Skills
      </h2>
      <div className="building" data-reveal data-no-strike>
        <span className="building-crown" aria-hidden="true" />
        {skills.map((g, f) => (
          <div className="floor" key={g.group} style={{ "--f": f } as React.CSSProperties}>
            <h3 className="floor-label">
              <span aria-hidden="true">{skills.length - f}</span>
              {g.group}
            </h3>
            <ul className="floor-windows">
              {g.items.map((s, k) => (
                <li key={s} style={{ "--k": k } as React.CSSProperties} onPointerEnter={() => audio.blip(k)}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Activities ---------- */

function Activities() {
  return (
    <section id="activities" className="activities">
      {activities.map((a) => (
        <article key={a.title} className="panel plaque" data-reveal>
          <h2 className="title">Activities</h2>
          <h3>{a.org}</h3>
          <p className="meta">
            {a.title}, {a.date}
          </p>
          <ul className="points">
            {a.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

/* ---------- Contact: the alley, one lamp ---------- */

function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      audio.confirm();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the address stays visible and selectable */
    }
  };
  return (
    <section id="contact" className="contact">
      <Plate factory={alley} caption="The alley off 5th, one lamp still on" className="plate-alley" label="A dark rainy alley lit by a single street lamp">
        <div className="contact-card" data-reveal data-no-strike>
          <h2 className="marquee-title">Contact</h2>
          <p className="lead">Looking for software engineering co-op roles. Email is the fastest way to reach me.</p>
          <a className="contact-email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <div className="contact-actions">
            <button className="btn" onClick={copy} data-done={copied}>
              {copied ? "Copied" : "Copy email"}
            </button>
            <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>
      </Plate>
      <footer className="foot">
        <p>Noureldin Ibrahim, Ottawa</p>
        <p>City illustrations used with the artist&apos;s permission.</p>
      </footer>
    </section>
  );
}

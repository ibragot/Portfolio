"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio } from "./audio";
import CityCanvas from "./CityCanvas";
import Radio from "./Radio";
import { activities, education, experience, profile, projects, skills, type Project } from "./content";

const FLOORS = [
  { id: "lobby", label: "Lobby", n: "L" },
  { id: "about", label: "About", n: "1" },
  { id: "projects", label: "Projects", n: "2" },
  { id: "experience", label: "Experience", n: "3" },
  { id: "skills", label: "Skills", n: "4" },
  { id: "activities", label: "Activities", n: "5" },
  { id: "contact", label: "Contact", n: "6" },
] as const;

type FloorId = (typeof FLOORS)[number]["id"];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function NoirCity() {
  const [floor, setFloor] = useState<FloorId>("lobby");

  // Reveal blocks as they come into view; mark which floor is in the middle of the screen
  useEffect(() => {
    document.documentElement.classList.add("js");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
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
    return () => {
      reveal.disconnect();
      floors.disconnect();
    };
  }, []);

  const goTo = useCallback((id: FloorId) => {
    audio.blip(FLOORS.findIndex((f) => f.id === id));
    document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
  }, []);

  return (
    <>
      <CityCanvas />
      <Elevator floor={floor} onGo={goTo} />
      <Radio />

      <main className="page">
        <Hero />
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

/* ---------- Elevator floor dial: fixed navigation ---------- */

function Elevator({ floor, onGo }: { floor: FloorId; onGo: (id: FloorId) => void }) {
  const i = FLOORS.findIndex((f) => f.id === floor);
  // Needle sweeps a half circle from -80deg (lobby) to +80deg (top floor)
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

/* ---------- Lobby ---------- */

function Hero() {
  const first = "NOURELDIN";
  const last = "IBRAHIM";
  return (
    <section id="lobby" className="hero">
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
      <div className="hero-plate">
        <p className="hero-role">Software engineer, Computer Science at uOttawa</p>
        <p className="hero-hint">
          Scroll down into the city. Move your cursor over the windows, and click the sky.
        </p>
      </div>
      <span className="hero-scroll" aria-hidden="true">
        <i />
      </span>
    </section>
  );
}

/* ---------- About ---------- */

function About() {
  return (
    <section id="about" className="about">
      <div className="blade" data-reveal data-no-strike aria-hidden="true">
        {"NOUR".split("").map((ch, i) => (
          <span key={i} className="blade-ch" style={{ "--i": i } as React.CSSProperties}>
            {ch}
          </span>
        ))}
      </div>
      <div className="panel about-text" data-reveal>
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
    </section>
  );
}

/* ---------- Projects: a walk along a row of towers ---------- */

function Projects() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // While the section is pinned, vertical scroll pans the row of towers sideways
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (window.innerWidth < 900) {
        track.style.transform = "";
        return;
      }
      const r = section.getBoundingClientRect();
      const span = section.offsetHeight - window.innerHeight;
      const t = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
      const max = track.scrollWidth - window.innerWidth;
      track.style.transform = `translate3d(${-t * max}px, 0, 0)`;
      section.style.setProperty("--walk", t.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="projects" ref={sectionRef} className="projects" style={{ "--count": projects.length } as React.CSSProperties}>
      <div className="projects-pin">
        <div className="projects-track" ref={trackRef}>
          <div className="projects-intro" data-reveal>
            <h2 className="title title-xl">Projects</h2>
            <p className="lead">Three things I built. Hover a tower to light it up.</p>
            <span className="projects-arrow" aria-hidden="true">
              Keep scrolling
              <i />
            </span>
          </div>
          {projects.map((p, i) => (
            <Tower key={p.id} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tower({ p, i }: { p: Project; i: number }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  // A fixed pseudo-random pattern per tower, so the windows light in a scattered order
  const windows = useMemo(
    () =>
      Array.from({ length: 48 }, (_, k) => {
        const v = Math.sin((k + 1) * (i + 3) * 12.9898) * 43758.5453;
        return v - Math.floor(v);
      }),
    [i],
  );
  return (
    <article
      className="tower"
      data-reveal
      style={{ "--i": i } as React.CSSProperties}
      onPointerEnter={() => audio.blip(i + 2)}
    >
      <div className="tower-crown" aria-hidden="true">
        {windows.map((r, k) => (
          <i key={k} style={{ "--d": `${Math.round(r * 520)}ms`, "--r": r } as React.CSSProperties} />
        ))}
      </div>
      <div className="tower-body">
        <header className="tower-head">
          <h3>{p.title}</h3>
          <p>
            {p.kind}
            <span>{p.date}</span>
          </p>
        </header>
        {p.image && imgOk && (
          // Hosted on Roblox's CDN; hidden if it ever stops loading.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="tower-shot"
            src={p.image}
            alt={`${p.title} gameplay`}
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        )}
        <p className="tower-summary">{p.summary}</p>
        <ul className="tower-points">
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

/* ---------- Experience: a facade caught in a spotlight ---------- */

function Experience() {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };
  return (
    <section id="experience" className="experience">
      <h2 className="title title-xl" data-reveal>
        Experience
      </h2>
      <div className="facade" ref={ref} onPointerMove={onMove} data-reveal data-no-strike>
        <span className="facade-piers" aria-hidden="true" />
        <span className="facade-spot" aria-hidden="true" />
        {experience.map((x) => (
          <article key={x.title + x.org} className="facade-card">
            <p className="facade-sign">{x.org}</p>
            <h3>{x.title}</h3>
            <p className="facade-meta">
              {x.date}, {x.where}
            </p>
            <ul className="tower-points">
              {x.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Skills: a building face where every lit window is a skill ---------- */

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
          <p className="facade-meta">
            {a.title}, {a.date}
          </p>
          <ul className="tower-points">
            {a.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

/* ---------- Contact: a marquee on the wet street ---------- */

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
      <div className="lamp" aria-hidden="true">
        <span className="lamp-head" />
        <span className="lamp-cone" />
        <span className="lamp-post" />
      </div>
      <div className="marquee" data-reveal data-no-strike>
        <h2 className="marquee-title">Contact</h2>
        <p className="lead">Looking for software engineering co-op roles. Email is the fastest way to reach me.</p>
        <a className="marquee-email" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
        <div className="marquee-actions">
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
      <footer className="foot">
        <p>Noureldin Ibrahim, Ottawa</p>
      </footer>
    </section>
  );
}

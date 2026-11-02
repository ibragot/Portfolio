import CityScene from "@/components/city/CityScene";
import CopyEmail from "@/components/CopyEmail";
import Interactions from "@/components/Interactions";
import ProjectPlate from "@/components/ProjectPlate";
import { profile, projects, toolkit } from "@/data/site";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const nav = [
  { numeral: "II", label: "Story", href: "#story" },
  { numeral: "III", label: "Work", href: "#work" },
  { numeral: "IV", label: "Toolkit", href: "#toolkit" },
  { numeral: "V", label: "Contact", href: "#contact" },
];

function External({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Eyebrow({ numeral, children }: { numeral: string; children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span>Plate {numeral}</span>
      <span className="eyebrow__rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function Home() {
  return (
    <>
      <Interactions />
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <nav className="topbar" aria-label="Primary">
        <a href="#top" className="brand">
          <span className="brand__ring" aria-hidden="true" />
          {profile.name}
        </a>
        <ul className="topbar__links">
          {nav.map((item) => (
            <li key={item.href}>
              <a href={item.href}>
                <span className="topbar__numeral" aria-hidden="true">
                  {item.numeral}
                </span>
                {item.label}
              </a>
            </li>
          ))}
          <li className="topbar__external">
            <External href={profile.github}>
              GitHub <span aria-hidden="true">↗</span>
            </External>
          </li>
        </ul>
      </nav>

      <header className="hero" id="top">
        <CityScene />

        <div className="hero__intro">
          <p className="hero__greeting rise" style={{ "--d": "0.5s" } as React.CSSProperties}>
            hi, my name is
          </p>
          <h1 className="hero__name">
            <span className="rise" style={{ "--d": "0.65s" } as React.CSSProperties}>
              {profile.firstName}
            </span>
            <span className="rise" style={{ "--d": "0.8s" } as React.CSSProperties}>
              {profile.lastName}
            </span>
          </h1>
          <p className="hero__tagline rise" style={{ "--d": "1s" } as React.CSSProperties}>
            A <em>developer</em> drawn to <em>security</em> and <em>AI</em>.
          </p>
          <p className="hero__summary rise" style={{ "--d": "1.1s" } as React.CSSProperties}>
            {profile.role}. Building trustworthy systems that protect people, and experimenting with tooling
            that helps teams ship.
          </p>
          <ul className="hero__links rise" style={{ "--d": "1.2s" } as React.CSSProperties}>
            <li>
              <a href="#work">
                Explore my work <span aria-hidden="true">↓</span>
              </a>
            </li>
            <li>
              <External href={profile.github}>
                GitHub <span aria-hidden="true">↗</span>
              </External>
            </li>
            <li>
              <External href={profile.linkedin}>
                LinkedIn <span aria-hidden="true">↗</span>
              </External>
            </li>
          </ul>
        </div>

        <p className="hero__caption" aria-hidden="true">
          Plate I <span className="eyebrow__rule" /> The skyline
        </p>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="story" className="section" aria-labelledby="story-heading">
          <Eyebrow numeral="II">Story</Eyebrow>
          <div className="story" data-reveal>
            <div>
              <h2 id="story-heading" className="display">
                Working the <em>night shift</em> on good software.
              </h2>
              <p className="lede">
                I&apos;m a Computer Science student at <strong>uOttawa</strong> exploring how thoughtful
                engineering, delightful interfaces, and collaborative learning can ship products people love.
              </p>
              <p className="lede">
                I&apos;m especially energized by cyber security and AI: building trustworthy systems that protect
                people while experimenting with intelligent tooling that amplifies what teams can deliver.
              </p>
            </div>

            <dl className="dossier">
              <div>
                <dt>Name</dt>
                <dd>{profile.name}</dd>
              </div>
              <div>
                <dt>Studying</dt>
                <dd>{profile.role}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{profile.focus.join(" · ")}</dd>
              </div>
              <div>
                <dt>Elsewhere</dt>
                <dd className="dossier__links">
                  <External href={profile.github}>GitHub</External>
                  <External href={profile.linkedin}>LinkedIn</External>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="work" className="section" aria-labelledby="work-heading">
          <Eyebrow numeral="III">Work</Eyebrow>
          <div data-reveal>
            <h2 id="work-heading" className="display">
              Selected <em>work</em>.
            </h2>
            <p className="lede">Concepts and works in progress. Full write-ups are on the way.</p>
          </div>

          <ul className="projects">
            {projects.map((project, i) => (
              <li key={project.title} data-reveal style={{ "--d": `${(i % 3) * 0.08}s` } as React.CSSProperties}>
                <article className="project">
                  <ProjectPlate seed={i + 1} sky={project.sky} numeral={NUMERALS[i] ?? String(i + 1)} />
                  <div className="project__body">
                    <h3 className="project__title">{project.title}</h3>
                    <p className="project__description">{project.description}</p>
                    <ul className="chips" aria-label="Built with">
                      {project.skills.map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                    <div className="project__links">
                      {project.demo ? (
                        <External href={project.demo}>
                          Live demo <span aria-hidden="true">↗</span>
                        </External>
                      ) : (
                        <span className="project__pending">Demo coming soon</span>
                      )}
                      {project.source && (
                        <External href={project.source}>
                          Source <span aria-hidden="true">↗</span>
                        </External>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section id="toolkit" className="section" aria-labelledby="toolkit-heading">
          <Eyebrow numeral="IV">Toolkit</Eyebrow>
          <h2 id="toolkit-heading" className="display" data-reveal>
            What I <em>build with</em>.
          </h2>
          <div className="toolkit">
            {toolkit.map((group, i) => (
              <div key={group.title} className="toolkit__group" data-reveal style={{ "--d": `${i * 0.1}s` } as React.CSSProperties}>
                <h3 className="toolkit__title">{group.title}</h3>
                <ul className="toolkit__items">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="section section--contact" aria-labelledby="contact-heading">
          <Eyebrow numeral="V">Contact</Eyebrow>
          <div data-reveal>
            <h2 id="contact-heading" className="display display--xl">
              Say <em>hello</em>.
            </h2>
            <p className="lede">Questions, collaborations, or just to talk shop: my inbox is open.</p>
            <div className="contact__row">
              <a className="contact__email" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
              <CopyEmail email={profile.email} />
            </div>
            <ul className="hero__links contact__links">
              <li>
                <External href={profile.linkedin}>
                  LinkedIn <span aria-hidden="true">↗</span>
                </External>
              </li>
              <li>
                <External href={profile.github}>
                  GitHub <span aria-hidden="true">↗</span>
                </External>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <a href="#top">Back to the skyline ↑</a>
      </footer>
    </>
  );
}

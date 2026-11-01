import NightScene from "@/components/NightScene";
import ProjectPlate from "@/components/ProjectPlate";
import { profile, projects } from "@/data/site";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const nav = [
  { numeral: "II", label: "About", href: "#about" },
  { numeral: "III", label: "Work", href: "#work" },
  { numeral: "IV", label: "Contact", href: "#contact" },
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
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="hero" id="top">
        <NightScene />

        <nav className="topbar" aria-label="Primary">
          <a href="#top" className="brand">
            <span className="brand__moon" aria-hidden="true" />
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
            <li>
              <External href={profile.github}>
                GitHub <span aria-hidden="true">↗</span>
              </External>
            </li>
          </ul>
        </nav>

        <div className="hero__intro">
          <p className="hero__greeting">good evening, my name is</p>
          <h1 className="hero__name">
            {profile.firstName}
            <br />
            {profile.lastName}
          </h1>
          <p className="hero__tagline">
            A <em>developer</em> drawn to <em>security</em> and <em>AI</em>.
          </p>
          <p className="hero__summary">
            {profile.role}. Building trustworthy systems that protect people, and experimenting with tooling
            that helps teams ship.
          </p>
          <ul className="hero__links">
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
          Plate I <span className="eyebrow__rule" /> The city at night
        </p>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="about" className="section" aria-labelledby="about-heading">
          <Eyebrow numeral="II">About</Eyebrow>
          <div className="about">
            <div>
              <h2 id="about-heading" className="display">
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
                <dt>Toolkit</dt>
                <dd>
                  <ul className="chips">
                    {profile.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{profile.focus.join(" · ")}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="work" className="section" aria-labelledby="work-heading">
          <Eyebrow numeral="III">Work</Eyebrow>
          <h2 id="work-heading" className="display">
            Selected <em>work</em>.
          </h2>
          <p className="lede">Concepts and works in progress. Full write-ups are on the way.</p>

          <ul className="projects">
            {projects.map((project, i) => (
              <li key={project.title}>
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

        <section id="contact" className="section section--contact" aria-labelledby="contact-heading">
          <Eyebrow numeral="IV">Contact</Eyebrow>
          <h2 id="contact-heading" className="display display--xl">
            Say <em>hello</em>.
          </h2>
          <p className="lede">Questions, collaborations, or just to talk shop: my inbox is open.</p>
          <a className="contact__email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
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
        </section>
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p>Drawn by moonlight</p>
      </footer>
    </>
  );
}

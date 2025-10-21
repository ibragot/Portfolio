export default function Home() {
  const projects = [
    {
      title: "Atlas Analytics Platform",
      description:
        "A data storytelling dashboard concept that highlights product KPIs with expressive visualizations and personalized insights for stakeholders.",
      skills: ["TypeScript", "Next.js", "Tailwind CSS", "tRPC"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #7795f8 0%, #67d7e2 100%)",
    },
    {
      title: "Pinnacle Project Tracker",
      description:
        "Placeholder tool for keeping class and side projects organized with lightweight sprints, status reporting, and teammate updates.",
      skills: ["React", "Prisma", "PostgreSQL", "GraphQL"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #f67280 0%, #845ef7 100%)",
    },
    {
      title: "Nova Study Planner",
      description:
        "Responsive planner concept that syncs lectures, deliverables, and personal goals into one calm interface for busy semesters.",
      skills: ["TypeScript", "Expo", "Supabase", "Figma"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #34d399 0%, #38bdf8 100%)",
    },
    {
      title: "Orbit AI Assistant",
      description:
        "Exploration of an AI copiloted workspace that summarizes research, drafts documentation, and surfaces key decisions at a glance.",
      skills: ["Next.js", "OpenAI", "Redis", "Zustand"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #a855f7 0%, #f97316 100%)",
    },
    {
      title: "Pulse Health Dashboard",
      description:
        "Healthcare-themed dashboard mockup that aggregates wearable data, predicts trends, and suggests next steps for providers.",
      skills: ["Python", "FastAPI", "TimescaleDB", "Plotly"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #ff9f1c 0%, #ff7eb3 100%)",
    },
    {
      title: "Waypoint Travel Journal",
      description:
        "A minimalist travel log concept that geotags memories, curates photo sets, and shares itineraries with friends in real-time.",
      skills: ["Next.js", "PlanetScale", "Mapbox", "Cloudinary"],
      demo: "https://example.com",
      source: "https://github.com/ibragot",
      gradient: "linear-gradient(135deg, #60a5fa 0%, #facc15 100%)",
    },
  ];

  const terminalStatements = [
    { label: "Noureldin.name", value: '"Noureldin Ibrahim"' },
    { label: "Noureldin.role", value: '"Computer Science @ UOttawa"' },
    {
      label: "Noureldin.contact",
      links: [
        {
          label: "LinkedIn",
          href: "https://www.linkedin.com/in/noureldin-ibrahim-264576214/",
        },
        {
          label: "GitHub",
          href: "https://github.com/ibragot",
        },
      ],
    },
    {
      label: "Noureldin.skills",
      value: '["TypeScript", "React", "Next.js", "Python"]',
    },
    {
      label: "Noureldin.focus",
      value: '"UX-friendly systems, AI-assisted tooling, community impact"',
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="top-slope" aria-hidden="true" />
      <main className="page-shell">
        <header className="navbar">
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </header>

        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="hero-content">
            <h1 id="hero-heading" className="hero-title">
              Noureldin Ibrahim
              <br />
              <span>crafts reliable digital experiences.</span>
            </h1>
            <p className="hero-copy">
              I&apos;m a Computer Science student at <strong>UOttawa</strong> exploring how thoughtful
              engineering, delightful interfaces, and collaborative learning can ship products people love.
              I&apos;m especially energized by cyber security and AI—building trustworthy systems that protect
              people while experimenting with intelligent tooling that amplifies what teams can deliver.
            </p>
          </div>

          <aside className="terminal-card" aria-label="Quick facts terminal">
            <div className="terminal-card__header">
              <span className="terminal-card__dot terminal-card__dot--red" />
              <span className="terminal-card__dot terminal-card__dot--amber" />
              <span className="terminal-card__dot terminal-card__dot--green" />
            </div>
            <div className="terminal-card__body">
              {terminalStatements.map((statement) => (
                <div key={statement.label} className="terminal-line">
                  <span className="terminal-input">{statement.label}</span>
                  {statement.links ? (
                    <span className="terminal-value">
                      [
                      {statement.links.map((link, index) => (
                        <span key={link.href}>
                          &quot;
                          <a href={link.href} rel="noopener noreferrer" target="_blank">
                            {link.label}
                          </a>
                          &quot;
                          {index < statement.links.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      ]
                    </span>
                  ) : (
                    <span className="terminal-value">{statement.value}</span>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </section>

        <h2 id="projects" className="section-heading">
          Projects
        </h2>
        <section className="projects-grid" aria-label="Project showcase">
          {projects.map((project) => (
            <article key={project.title} className="project-card">
              <div
                className="project-card__media"
                style={{ background: project.gradient }}
                aria-hidden="true"
              />
              <div className="project-card__body">
                <h3 className="project-card__title">{project.title}</h3>
                <p className="project-card__description">{project.description}</p>
                <div className="project-card__skills">
                  {project.skills.map((skill) => (
                    <span key={skill} className="project-chip">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="project-card__actions">
                  <a
                    className="project-link"
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={project.demo === "https://example.com"}
                  >
                    Live Preview ↗
                  </a>
                  <a
                    className="project-link secondary"
                    href={project.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Repo
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        <h2 id="contact" className="section-heading contact-section">
          Contact me!
        </h2>
        <div className="contact-links">
          <a href="mailto:nourmgi04@gmail.com">nourmgi04@gmail.com</a>
          <a
            href="https://www.linkedin.com/in/noureldin-ibrahim-264576214/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a href="https://github.com/ibragot" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </main>
      <footer className="site-footer">
        <span>Made by Noureldin Ibrahim © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

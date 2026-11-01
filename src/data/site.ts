export const profile = {
  name: "Noureldin Ibrahim",
  firstName: "Noureldin",
  lastName: "Ibrahim",
  role: "Computer Science @ uOttawa",
  email: "nourmgi04@gmail.com",
  github: "https://github.com/ibragot",
  linkedin: "https://www.linkedin.com/in/noureldin-ibrahim-264576214/",
  skills: ["TypeScript", "React", "Next.js", "Python"],
  focus: ["UX-friendly systems", "AI-assisted tooling", "Community impact"],
};

export type Project = {
  title: string;
  description: string;
  skills: string[];
  /** Leave undefined until there is a real deployment to link to. */
  demo?: string;
  source?: string;
  /** Sky colours for the project's plate illustration: [zenith, horizon]. */
  sky: [string, string];
};

export const projects: Project[] = [
  {
    title: "Atlas Analytics Platform",
    description:
      "A data storytelling dashboard concept that highlights product KPIs with expressive visualizations and personalized insights for stakeholders.",
    skills: ["TypeScript", "Next.js", "Tailwind CSS", "tRPC"],
    source: profile.github,
    sky: ["#16302a", "#8ea55c"],
  },
  {
    title: "Pinnacle Project Tracker",
    description:
      "Placeholder tool for keeping class and side projects organized with lightweight sprints, status reporting, and teammate updates.",
    skills: ["React", "Prisma", "PostgreSQL", "GraphQL"],
    source: profile.github,
    sky: ["#161f2c", "#6d86a6"],
  },
  {
    title: "Nova Study Planner",
    description:
      "Responsive planner concept that syncs lectures, deliverables, and personal goals into one calm interface for busy semesters.",
    skills: ["TypeScript", "Expo", "Supabase", "Figma"],
    source: profile.github,
    sky: ["#12262a", "#5fa3a0"],
  },
  {
    title: "Orbit AI Assistant",
    description:
      "Exploration of an AI copiloted workspace that summarizes research, drafts documentation, and surfaces key decisions at a glance.",
    skills: ["Next.js", "OpenAI", "Redis", "Zustand"],
    source: profile.github,
    sky: ["#241a26", "#a7766a"],
  },
  {
    title: "Pulse Health Dashboard",
    description:
      "Healthcare-themed dashboard mockup that aggregates wearable data, predicts trends, and suggests next steps for providers.",
    skills: ["Python", "FastAPI", "TimescaleDB", "Plotly"],
    source: profile.github,
    sky: ["#252114", "#c4a159"],
  },
  {
    title: "Waypoint Travel Journal",
    description:
      "A minimalist travel log concept that geotags memories, curates photo sets, and shares itineraries with friends in real-time.",
    skills: ["Next.js", "PlanetScale", "Mapbox", "Cloudinary"],
    source: profile.github,
    sky: ["#17271d", "#7fb08a"],
  },
];

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

export const toolkit = [
  { title: "Languages & frameworks", items: profile.skills },
  { title: "Drawn to", items: ["Cyber security", "AI-assisted tooling", "UX-friendly systems"] },
  { title: "Beyond code", items: ["Community impact", "Collaborative learning", "Shipping things people love"] },
];

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
    sky: ["#16303a", "#5f9c9c"],
  },
  {
    title: "Pinnacle Project Tracker",
    description:
      "Placeholder tool for keeping class and side projects organized with lightweight sprints, status reporting, and teammate updates.",
    skills: ["React", "Prisma", "PostgreSQL", "GraphQL"],
    source: profile.github,
    sky: ["#1a2740", "#6d86a6"],
  },
  {
    title: "Nova Study Planner",
    description:
      "Responsive planner concept that syncs lectures, deliverables, and personal goals into one calm interface for busy semesters.",
    skills: ["TypeScript", "Expo", "Supabase", "Figma"],
    source: profile.github,
    sky: ["#123039", "#4f8f95"],
  },
  {
    title: "Orbit AI Assistant",
    description:
      "Exploration of an AI copiloted workspace that summarizes research, drafts documentation, and surfaces key decisions at a glance.",
    skills: ["Next.js", "OpenAI", "Redis", "Zustand"],
    source: profile.github,
    sky: ["#2a2140", "#b48a6a"],
  },
  {
    title: "Pulse Health Dashboard",
    description:
      "Healthcare-themed dashboard mockup that aggregates wearable data, predicts trends, and suggests next steps for providers.",
    skills: ["Python", "FastAPI", "TimescaleDB", "Plotly"],
    source: profile.github,
    sky: ["#1d2a3a", "#d1a35e"],
  },
  {
    title: "Waypoint Travel Journal",
    description:
      "A minimalist travel log concept that geotags memories, curates photo sets, and shares itineraries with friends in real-time.",
    skills: ["Next.js", "PlanetScale", "Mapbox", "Cloudinary"],
    source: profile.github,
    sky: ["#163236", "#7fb0a0"],
  },
];

export type Link = { label: string; href: string };

export type Project = {
  id: string;
  title: string;
  kind: string;
  date: string;
  stack: string[];
  summary: string;
  points: string[];
  links: Link[];
  image?: string;
};

export const profile = {
  name: "Noureldin Ibrahim",
  role: "Software engineer, CS at uOttawa",
  location: "Ottawa, Ontario",
  email: "nourmgi04@gmail.com",
  github: "https://github.com/ibragot",
  linkedin: "https://linkedin.com/in/noureldin-ibrahim",
  intro:
    "I build full-stack apps, machine learning systems, and Roblox games. I like shipping things people actually use, from a Quran recitation tutor to a movie recommender trained on 100K ratings.",
};

export const projects: Project[] = [
  {
    id: "wizard-duel",
    title: "Wizard Duel",
    kind: "Roblox game",
    date: "In development",
    stack: ["Luau", "Roblox Studio"],
    summary:
      "A wizard dueling game where players face off with spells across a bright floating-island arena.",
    points: [
      "Spells are ranked in tiers up to Mythic, topped by an Insane tier of signature moves.",
      "Insane spells trigger fast, action-heavy cutscenes that play out in the live arena instead of cutting to a separate scene.",
      "Celestial floating-island map built and lit to match a single art direction.",
    ],
    links: [
      { label: "Play on Roblox", href: "https://www.roblox.com/games/103624964787159/Wizard-Duel" },
    ],
    image:
      "https://tr.rbxcdn.com/180DAY-980ef4b4b4639b6cfe29a484e537e847/768/432/GameMediaItem4/Png/noFilter",
  },
  {
    id: "recommender",
    title: "AI Movie Recommender",
    kind: "Machine learning, full stack",
    date: "Feb 2026 to now",
    stack: ["Python", "PyTorch", "FastAPI", "PostgreSQL", "React", "Docker"],
    summary:
      "Personalized movie picks from a matrix factorization model trained on 100,836 MovieLens ratings.",
    points: [
      "Learns 64-dimensional embeddings for users and movies, reaching a test RMSE of 0.87 on a matrix that is 98.3% empty.",
      "FastAPI and PostgreSQL backend in Docker Compose, deployed to Railway with a React frontend on Vercel.",
      "GitHub Actions pipeline runs tests, linting, and Docker builds before every deploy.",
      "Trained model lives on Hugging Face Hub and loads at server startup, keeping the image small.",
    ],
    links: [
      { label: "Try it live", href: "https://airecommender.noureldin.dev" },
      { label: "Source", href: "https://github.com/ibragot/ai-recommender-system" },
    ],
  },
  {
    id: "tilawah",
    title: "Tilawah",
    kind: "Hackathon, full stack",
    date: "Apr 2026",
    stack: ["React", "Express", "Groq SDK", "Azure Speech", "Gemini", "OAuth2"],
    summary:
      "Built at the Quran.com Hackathon: read, listen to, and practice Quran recitation with real-time AI feedback.",
    points: [
      "Transcribes recitation with Azure Speech and scores it with Gemini for per-word accuracy and tajweed feedback.",
      "Express proxy handles Quran Foundation OAuth2 so the client secret never reaches the browser.",
      "Caches tokens, refreshes them before expiry, and retries once on a 401.",
    ],
    links: [{ label: "Source", href: "https://github.com/ibragot/Tilawah" }],
  },
];

export const experience = [
  {
    title: "Software Engineer",
    org: "University of Ottawa MSA",
    date: "Oct 2025 to now",
    where: "Remote",
    points: [
      "Part of an 8-developer Agile team rebuilding IT infrastructure for 1,000+ students.",
      "Built a multi-organization library system in React and Supabase used by 5+ organizations to share book inventories.",
      "Ship through pull requests, sprint planning, and CI/CD pipelines.",
    ],
  },
];

export const skills = [
  { group: "Languages", items: ["Python", "Java", "TypeScript", "SQL", "Bash", "Luau"] },
  { group: "Frameworks", items: ["React", "Next.js", "FastAPI", "Express", "PyTorch"] },
  { group: "Data and backend", items: ["PostgreSQL", "Supabase", "REST APIs", "OAuth2"] },
  { group: "Cloud and DevOps", items: ["Docker", "GitHub Actions", "Railway", "Vercel", "Hugging Face Hub"] },
  { group: "AI services", items: ["Azure Cognitive Services", "Gemini API", "Groq SDK"] },
  { group: "Practices", items: ["OOP", "System design", "Agile", "Unit testing"] },
];

export const activities = [
  {
    title: "Organizer and technical contributor",
    org: "MAC Youth, Ottawa MSA",
    date: "2025 to now",
    points: [
      "Run bi-weekly community events for 100+ attendees, from logistics to promotion.",
      "Help build internal tools and improve digital infrastructure.",
    ],
  },
];

export const education = {
  school: "University of Ottawa",
  program: "Biomedical Science, intended major Computer Science",
  date: "Expected 2028",
};

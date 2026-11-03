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
    id: "aegis",
    title: "Aegis",
    kind: "Cloud security, machine learning",
    date: "Nov 2026",
    stack: ["Python", "Kafka", "scikit-learn", "XGBoost", "Claude API", "PostgreSQL", "Docker", "Kubernetes", "Terraform", "AWS"],
    summary:
      "A cloud security detection platform: rules and machine learning flag suspicious activity, an entity graph links it into incidents, and an AI investigator explains them.",
    points: [
      "23 ATT&CK-mapped detection rules written as YAML, plus an ML ensemble (Isolation Forest, autoencoder, XGBoost, Markov sequence model) reaching F1 0.97 at a 0.2% false-positive rate on held-out data.",
      "A graph-based correlator turns 18 weak alerts into one explainable CRITICAL incident, catching an exfiltration from an IP that appears in no login event.",
      "A RAG and Claude investigator writes cited incident reports, with defenses against prompt injection hidden in attacker-controlled logs.",
      "Kafka microservices deployed with Docker, Kubernetes and Terraform on AWS EKS, monitored with Prometheus, Grafana and OpenTelemetry, and tested in GitHub Actions CI.",
    ],
    links: [{ label: "Source", href: "https://github.com/ibragot/Aegis" }],
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
  {
    id: "msa-library",
    title: "MSA Library System",
    kind: "Team project, full stack",
    date: "Oct 2025 to now",
    stack: ["React", "Supabase", "PostgreSQL", "CI/CD"],
    summary:
      "One shared catalog for 5+ student organizations, built with the University of Ottawa MSA's 8-developer team.",
    points: [
      "Multi-organization library in React and Supabase: each organization keeps its own shelf, everyone searches one catalog.",
      "Part of an Agile team rebuilding IT infrastructure for 1,000+ students.",
      "Shipped through pull requests, sprint planning and CI/CD pipelines.",
    ],
    links: [],
  },
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
];

export const skills = [
  { group: "Languages", items: ["Python", "Java", "TypeScript", "SQL", "Bash", "Luau"] },
  { group: "Frameworks", items: ["React", "Next.js", "FastAPI", "Express", "PyTorch", "scikit-learn"] },
  { group: "Data and backend", items: ["PostgreSQL", "Supabase", "Kafka", "Redis", "REST APIs", "OAuth2"] },
  { group: "Cloud and DevOps", items: ["Docker", "Kubernetes", "Terraform", "AWS", "GitHub Actions", "Railway", "Vercel", "Hugging Face Hub"] },
  { group: "AI services", items: ["Claude API", "Azure Cognitive Services", "Gemini API", "Groq SDK"] },
  { group: "Practices", items: ["OOP", "System design", "Agile", "Unit testing"] },
];

export type Hobby = {
  id: string;
  name: string;
  tag: string;
  ranks: string[];
};

// Each hobby is a Social Link: playing its mini game ranks it up and unlocks the next line.
export const hobbies: Hobby[] = [
  {
    id: "gaming",
    name: "Gaming",
    tag: "Player One",
    ranks: [
      "Games are why I started coding: I wanted to know how they worked.",
      "These days I play them and build them, which ruins and improves them at the same time.",
      "Wizard Duel exists because I wanted a duel game that felt the way I imagined it.",
      "Timing, combos, game feel: I care about the half second after you press a button.",
      "Max rank. You found the secret: the whole site is a pause menu.",
    ],
  },
  {
    id: "climbing",
    name: "Rock climbing",
    tag: "Bouldering",
    ranks: [
      "Climbing is problem solving with your whole body.",
      "Every route is a puzzle: read it, try it, fall, adjust.",
      "Same loop as debugging, except gravity reviews your code.",
      "The best feeling is sending a problem you failed ten times.",
      "Max rank. Chalk up and come climb.",
    ],
  },
  {
    id: "soccer",
    name: "Soccer",
    tag: "Team sport",
    ranks: [
      "Soccer taught me teamwork before any group project did.",
      "Good teams talk constantly. So do good dev teams.",
      "A clean pass beats a flashy solo run, on the pitch and in a codebase.",
      "I still want the ball when the game is on the line.",
      "Max rank. Pickup game this weekend?",
    ],
  },
  {
    id: "fashion",
    name: "Fashion",
    tag: "Fit check",
    ranks: [
      "Clothes are design you can wear.",
      "Colour, proportion and contrast: the same rules I use for interfaces.",
      "A good fit, like a good UI, looks effortless and isn't.",
      "This site's colours were picked the way I'd pick an outfit.",
      "Max rank. Drip confirmed.",
    ],
  },
  {
    id: "trading",
    name: "Day trading",
    tag: "Charts all day",
    ranks: [
      "I like markets because they are data that never sits still.",
      "Charts are just time series, and I like time series.",
      "Trading taught me risk management the hard way: plan the exit before the entry.",
      "It's also why I respect boring, well-tested code.",
      "Max rank. Not financial advice, just a hobby.",
    ],
  },
  {
    id: "potter",
    name: "Harry Potter",
    tag: "Lifelong fan",
    ranks: [
      "I grew up on the books and films.",
      "Wizard Duel's spell tiers owe a lot to that world.",
      "Ask me about any spell and I'll tell you what it should look like in a game.",
      "Magic systems with rules are the best kind, which is basically programming.",
      "Max rank. Mischief managed.",
    ],
  },
  {
    id: "community",
    name: "Community",
    tag: "MAC Youth, Ottawa MSA",
    ranks: [
      "Organizer and technical contributor for MAC Youth at the Ottawa MSA since 2025.",
      "I run bi-weekly community events for 100+ attendees, from logistics to promotion.",
      "I also help build internal tools and improve the digital infrastructure.",
      "Getting a room of 100 people to show up twice a month is its own kind of shipping.",
      "Max rank. Come to the next event.",
    ],
  },
];

export const education = {
  school: "University of Ottawa",
  program: "Biomedical Science, intended major Computer Science",
  date: "Expected 2028",
};

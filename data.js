/*
 * data.js
 * Single source of truth for every piece of text on the site.
 * main.js reads window.PORTFOLIO_DATA and renders it; nothing here is duplicated in HTML.
 *
 * Editing guide:
 *  - owner     : name, roles, bio, links
 *  - counters  : About section stats (value counts up; prefix/suffix are static)
 *  - skills    : groups of chips; `icon` is a Devicon class (omit when none exists)
 *  - projects  : `category` must be one of `projectFilters` (except "All");
 *                `featured` cards span two columns on desktop; `link: null` hides the GitHub button
 *  - experience: newest first
 *  - education : degree + certifications
 *  - ui        : navigation, section headings, button and form labels
 */
'use strict';

window.PORTFOLIO_DATA = {
  /* ---------- Owner ---------- */
  owner: {
    name: 'Sanjay Kumar',
    initials: 'SK',
    roles: [
      'Backend Engineer',
      'UAV Systems & Autonomy',
      'REST/GraphQL APIs',
      'Event-Driven Services',
    ],
    location: 'Greater Noida, India',
    bio:
      'Backend Engineer with 2+ years building and operating Python-based services, REST APIs and event-driven systems used by multiple clients. Designs containerized microservices with Docker and Kubernetes, works with SQL and DynamoDB, and uses MQTT to synchronize 100+ connected devices in real time. Focused on correctness, performance and reliability.',
    email: 'sanjaykumarr99009@gmail.com',
    github: 'https://github.com/zeus881',
    linkedin: 'https://linkedin.com/in/sanjay-kumar-7689531b5',
    resume: './Sanjay_Kumar_Resume.pdf',
  },

  /* ---------- About counters ---------- */
  counters: [
    { value: 2, prefix: '', suffix: '+', label: 'Years of experience' },
    { value: 100, prefix: '', suffix: '+', label: 'Devices synchronized in real time' },
    { value: 200, prefix: '<', suffix: ' ms', label: 'Video pipeline latency' },
    { value: 30, prefix: '', suffix: '%', label: 'Improvement in targeting accuracy' },
  ],

  /* ---------- Skills ---------- */
  skills: [
    {
      group: 'Languages',
      items: [
        { name: 'Python (primary)', icon: 'devicon-python-plain' },
        { name: 'C++', icon: 'devicon-cplusplus-plain' },
        { name: 'JavaScript', icon: 'devicon-javascript-plain' },
        { name: 'TypeScript', icon: 'devicon-typescript-plain' },
        { name: 'Elixir', icon: 'devicon-elixir-plain' },
        { name: 'SQL', icon: 'devicon-azuresqldatabase-plain' },
        { name: 'HTML', icon: 'devicon-html5-plain' },
        { name: 'CSS', icon: 'devicon-css3-plain' },
      ],
    },
    {
      group: 'Backend & APIs',
      items: [
        { name: 'REST' },
        { name: 'GraphQL', icon: 'devicon-graphql-plain' },
        { name: 'FastAPI', icon: 'devicon-fastapi-plain' },
        { name: 'Microservices' },
        { name: 'Event-Driven Architecture' },
        { name: 'OAuth2/RBAC (Keycloak)' },
      ],
    },
    {
      group: 'Messaging & Real-Time',
      items: [
        { name: 'MQTT' },
        { name: 'WebRTC' },
        { name: 'Device synchronization' },
        { name: 'Telemetry' },
      ],
    },
    {
      group: 'Cloud & DevOps',
      items: [
        { name: 'AWS (EC2, Lambda, S3, DynamoDB, API Gateway, IAM)', icon: 'devicon-amazonwebservices-plain-wordmark' },
        { name: 'Docker', icon: 'devicon-docker-plain' },
        { name: 'Podman', icon: 'devicon-podman-plain' },
        { name: 'Kubernetes', icon: 'devicon-kubernetes-plain' },
        { name: 'Git', icon: 'devicon-git-plain' },
      ],
    },
    {
      group: 'Automation & CI/CD',
      items: [
        { name: 'GitHub Actions', icon: 'devicon-githubactions-plain' },
        { name: 'CI/CD pipelines' },
        { name: 'Python scripting', icon: 'devicon-python-plain' },
        { name: 'AWS Lambda automation', icon: 'devicon-amazonwebservices-plain-wordmark' },
      ],
    },
    {
      group: 'Databases',
      items: [
        { name: 'SQL', icon: 'devicon-azuresqldatabase-plain' },
        { name: 'DynamoDB', icon: 'devicon-dynamodb-plain' },
      ],
    },
    {
      group: 'Performance & Reliability',
      items: [
        { name: 'Latency profiling' },
        { name: 'Logging' },
        { name: 'Log and telemetry analysis' },
        { name: 'Anomaly detection' },
      ],
    },
    {
      group: 'Applied AI/ML',
      items: [
        { name: 'PyTorch', icon: 'devicon-pytorch-original' },
        { name: 'YOLOv8' },
        { name: 'OpenCV', icon: 'devicon-opencv-plain' },
        { name: 'LangChain' },
        { name: 'RAG' },
        { name: 'NLP' },
      ],
    },
    {
      group: 'Practices',
      items: [
        { name: 'Agile/Scrum' },
        { name: 'Jira', icon: 'devicon-jira-plain' },
        { name: 'Unit Testing' },
        { name: 'Technical Documentation' },
        { name: 'Linux', icon: 'devicon-linux-plain' },
      ],
    },
  ],

  /* ---------- Projects ---------- */
  projectFilters: ['All', 'Drones', 'Backend', 'AI', 'Web'],

  projects: [
    {
      id: 'gandiv-gcs',
      title: 'GANDIV GCS',
      category: 'Drones',
      featured: true,
      description:
        'Ground control system for 50+ ArduPilot vehicles over MAVLink 2.0, with signed links, role-based access, a two-person rule and a live CesiumJS 3D map.',
      features: [
        'Six backend services over NATS',
        'MAVLink 2 signing with per-vehicle keys',
        'Link failover',
        'Five operator roles',
        'Missions, geofences and swarm formations',
        'TimescaleDB telemetry history and replay',
      ],
      tags: ['Rust', 'Go', 'React', 'CesiumJS', 'NATS', 'TimescaleDB'],
      link: null,
    },
    {
      id: 'swarm-simulator',
      title: 'Drone Swarm Simulator',
      category: 'Drones',
      featured: true,
      description:
        'Simulates up to 50 drones at 30 Hz with ORCA collision avoidance, formations, mission planning, replay and a browser 3D ground station.',
      features: [
        'ORCA with potential-field fallback and a hard 4 m separation floor',
        'Eight formations with Hungarian slot assignment',
        'A* and RRT* routing',
        'Kalman filter per drone',
        'MAVLink and MAVSDK adapters for SITL vehicles',
        '203 automated tests',
      ],
      tags: ['Python', 'NumPy', 'FastAPI', 'Three.js', 'MAVLink'],
      link: 'https://github.com/zeus881/swarm-simualation',
    },
    {
      id: 'retail-automation',
      title: 'Real-Time Retail Automation System',
      category: 'Backend',
      featured: true,
      description:
        'Real-time IoT backend in Elixir/Phoenix that syncs 100+ devices over MQTT, with Docker deployments, Kubernetes orchestration and Keycloak auth.',
      features: [],
      tags: ['Elixir', 'Phoenix', 'MQTT', 'Docker', 'Kubernetes', 'Keycloak'],
      link: null,
    },
    {
      id: 'aastha',
      title: 'Aastha, Local AI Desktop Assistant',
      category: 'AI',
      featured: false,
      description:
        'Fully offline, voice-activated desktop assistant in Python with a tool-dispatcher architecture, self-healing execution layer and long-term semantic memory in ChromaDB.',
      features: [],
      tags: ['Python', 'ChromaDB', 'Voice', 'Local LLM'],
      link: null,
    },
    {
      id: 'client-ranking',
      title: 'AI Client Ranking System',
      category: 'AI',
      featured: false,
      description:
        'Crawls company websites, extracts product and technology signals with a local LLM and ranks leads; falls back to keywords when the LLM is unavailable.',
      features: [],
      tags: ['Python', 'Ollama', 'Flask', 'scikit-learn'],
      link: 'https://github.com/zeus881/clinet-ranking-system-LLM',
    },
    {
      id: 'shop-in',
      title: 'Shop-In',
      category: 'Web',
      featured: false,
      description: 'Django online store with catalogue, search, cart, Paytm checkout and order tracking.',
      features: [],
      tags: ['Django', 'SQLite', 'Paytm'],
      link: 'https://github.com/zeus881/shop-in',
    },
    {
      id: 'weather-app',
      title: 'Weather Forecast App',
      category: 'Web',
      featured: false,
      description: 'Current conditions and 5-day forecast by city or GPS location.',
      features: [],
      tags: ['JavaScript', 'Tailwind', 'OpenWeather'],
      link: 'https://github.com/zeus881/Weather-app-real',
    },
    {
      id: 'tech-traveler',
      title: 'Tech-Traveler',
      category: 'Web',
      featured: false,
      description: 'Eight-page animated content site on travel technology.',
      features: [],
      tags: ['HTML', 'Tailwind', 'GSAP', 'Three.js'],
      link: 'https://github.com/zeus881/Tech-Traveler',
    },
    {
      id: 'tcp-chat',
      title: 'TCP Chat',
      category: 'Backend',
      featured: false,
      description: 'Threaded client-server chat on raw TCP sockets.',
      features: [],
      tags: ['Python', 'sockets', 'threading'],
      link: 'https://github.com/zeus881/server-and-clinet',
    },
  ],

  /* ---------- Experience (newest first) ---------- */
  experience: [
    {
      role: 'Software Engineer, UAV Systems & Autonomy',
      company: 'Gandiv AI and Defence System Pvt. Ltd.',
      location: 'Noida',
      start: 'May 2026',
      end: 'Present',
      points: [
        'Builds real-time backend services and data pipelines, including a GStreamer/WebRTC video pipeline optimized for sub-200 ms latency.',
        'Integrates MAVLink/PX4 telemetry into a custom Ground Control Station, validated end to end in simulation.',
        'Analyzes logs and telemetry to detect anomalies and find performance gains.',
        'Contributes to distributed, multi-node coordination logic.',
      ],
      tags: ['Python', 'MAVLink', 'PX4', 'GStreamer', 'WebRTC'],
    },
    {
      role: 'Software Engineer, Backend & Integrations',
      company: 'Rebhu Computing Pvt. Ltd.',
      location: 'Greater Noida',
      start: 'Feb 2026',
      end: 'May 2026',
      points: [
        'Built containerized backend services with Docker and Podman; OAuth2/RBAC via Keycloak across microservices.',
        'Developed REST APIs and event-driven services in Python and Elixir/Phoenix, syncing 100+ devices via MQTT.',
        'Integrated LLM-based automation into a Python application, improving targeting accuracy by 30%.',
      ],
      tags: ['Python', 'Elixir', 'Phoenix', 'MQTT', 'Docker', 'Keycloak'],
    },
    {
      role: 'Junior Engineer, Project Coordinator (Python & AWS Automation)',
      company: 'Yottec System LLP',
      location: 'Bengaluru',
      start: 'Jan 2025',
      end: 'Feb 2026',
      points: [
        'Delivered Python automation tools and AWS Lambda/EC2 pipelines for defence-grade software projects.',
        'Built RESTful APIs integrated with S3, DynamoDB, API Gateway and IAM.',
        'Led Agile/Scrum ceremonies and improved CI/CD pipelines with GitHub Actions.',
      ],
      tags: ['Python', 'AWS', 'GitHub Actions', 'Agile'],
    },
  ],

  /* ---------- Education & certifications ---------- */
  education: {
    degrees: [
      {
        degree: 'B.Tech, Computer Science & Engineering',
        institute: 'Shambhunath Institute of Engineering and Technology, Prayagraj',
        years: '2021 to 2024',
      },
    ],
    certifications: [
      { title: 'Full Stack Web Development', issuer: 'Internshala' },
      { title: 'Python Programming', issuer: 'Mapping Skills Institute' },
      { title: 'AWS Cloud Computing', issuer: 'IIIT Institute' },
    ],
  },

  /* ---------- UI labels ---------- */
  ui: {
    skipLink: 'Skip to content',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    resumeButton: 'Download Resume',
    footer: 'Built with Three.js, Tailwind CSS and plain JavaScript.',
    // Order here = order on the page. `id` must match a <section id> in index.html.
    sections: [
      { id: 'home', nav: 'Home', eyebrow: '', title: '' },
      { id: 'about', nav: 'About', eyebrow: '01', title: 'About Me' },
      { id: 'skills', nav: 'Skills', eyebrow: '02', title: 'Skills' },
      { id: 'projects', nav: 'Projects', eyebrow: '03', title: 'Projects' },
      { id: 'experience', nav: 'Experience', eyebrow: '04', title: 'Experience' },
      { id: 'education', nav: 'Education', eyebrow: '05', title: 'Education & Certifications' },
      { id: 'contact', nav: 'Contact', eyebrow: '06', title: 'Get In Touch' },
    ],
  },
};

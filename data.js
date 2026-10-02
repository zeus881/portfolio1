/*
 * data.js
 * Single source of truth for every piece of text on the site.
 *  - Browser: sets window.PORTFOLIO_DATA (main.js, diagrams.js and palette.js read it).
 *  - Node:    module.exports (scripts/build.mjs writes the page markup, head meta, manifest,
 *             robots.txt, sitemap.xml and 404.html from it; tests/smoke.mjs validates it).
 * After editing, run `node scripts/build.mjs` and `node tests/smoke.mjs`.
 *
 * Editing guide
 *  site        public URL (canonical, sitemap, QR code), page title and description, manifest names,
 *              FormSubmit endpoint
 *  owner       name, roles (typed line), status strip, bio, links
 *  counters    About stats; `value` counts up, optional `prefix`/`suffix` stay fixed
 *  whatIDo     the three About cards; `icon` is a key of ICONS in scripts/icons.mjs
 *  skills      groups of plain-text chips
 *  projects    `slug` drives deep links (#project-<slug>); `category` must be in projectFilters;
 *              `featured` cards span two columns and carry a `diagram`; `link: null` hides the GitHub button
 *  diagram     nodes on a col/row grid; edges between node or group ids (`both: true` = two-way arrow);
 *              groups draw a frame around member nodes; `sub` is an optional second line;
 *              `kind` styles a node: external | service | bus | store | client
 *  experience  newest first; `current: true` shows the NOW marker
 *  palette     command palette actions (sections and projects are added automatically)
 *  ui          navigation, section labels, buttons, form text, notices
 */
(function (root) {
  'use strict';

  var DATA = {
    /* ===== Site ===== */
    site: {
      url: 'https://zeus881.github.io/portfolio/',
      title: 'Sanjay Kumar | Full Stack Developer & UAV Systems',
      description:
        'Sanjay Kumar, Full Stack Developer in Noida, India: Python services, REST APIs, event-driven systems, real-time 3D web interfaces and UAV ground control software.',
      shareImage: 'og-image.jpg',
      shareImageAlt: 'Sanjay Kumar, Full Stack Developer and UAV Systems, mission-control style title card',
      appName: 'Sanjay Kumar Portfolio',
      appShortName: 'Sanjay K',
      themeColor: '#050816',
      locale: 'en_IN',
      // The only network call the page makes at runtime
      formEndpoint: 'https://formsubmit.co/ajax/sanjaykumarr99009@gmail.com',
    },

    /* ===== Owner ===== */
    owner: {
      name: 'Sanjay Kumar',
      initials: 'SK',
      roles: ['Full Stack Developer', 'Backend & APIs', 'UAV Systems & Autonomy', 'Real-Time Web & 3D'],
      location: 'Noida, India',
      country: 'IN',
      timeZone: 'Asia/Kolkata',
      timeZoneLabel: 'IST',
      status: 'Available for opportunities',
      bio:
        'Full Stack Developer with 2+ years building Python-based services, REST APIs, event-driven systems and the web interfaces that sit on top of them. Designs containerized microservices with Docker and Kubernetes, works with SQL and DynamoDB, and uses MQTT to synchronize 100+ connected devices in real time. Focused on correctness, performance and reliability.',
      email: 'sanjaykumarr99009@gmail.com',
      github: 'https://github.com/zeus881',
      linkedin: 'https://linkedin.com/in/sanjay-kumar-7689531b5',
      resume: './Sanjay_Kumar_Resume.pdf',
    },

    /* ===== About: counters ===== */
    counters: [
      { value: 2, suffix: '+', label: 'Years of experience' },
      { value: 100, suffix: '+', label: 'Devices synchronized in real time' },
      { value: 200, prefix: '<', suffix: ' ms', label: 'Video pipeline latency' },
      { value: 30, suffix: '%', label: 'Improvement in targeting accuracy' },
    ],

    /* ===== About: what I do ===== */
    whatIDo: [
      {
        title: 'Frontend & 3D Web',
        icon: 'web',
        text: 'Web interfaces in HTML, CSS, JavaScript and TypeScript, with Tailwind CSS and Three.js for interactive 3D.',
      },
      {
        title: 'Backend & APIs',
        icon: 'api',
        text: 'REST and GraphQL APIs, event-driven services and containerized microservices in Python and Elixir, secured with OAuth2/RBAC via Keycloak.',
      },
      {
        title: 'UAV & Real-Time Systems',
        icon: 'drone',
        text: 'MAVLink/PX4 telemetry for a custom Ground Control Station, a sub-200 ms GStreamer/WebRTC video pipeline and MQTT sync for 100+ devices.',
      },
    ],

    /* ===== Skills (10 groups) ===== */
    skills: [
      { group: 'Languages', items: ['Python (primary)', 'C++', 'JavaScript', 'TypeScript', 'Elixir', 'SQL', 'HTML', 'CSS'] },
      { group: 'Frontend', items: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Three.js'] },
      {
        group: 'Backend & APIs',
        items: ['REST', 'GraphQL', 'FastAPI', 'Microservices', 'Event-Driven Architecture', 'OAuth2/RBAC (Keycloak)'],
      },
      { group: 'Messaging & Real-Time', items: ['MQTT', 'WebRTC', 'Device synchronization', 'Telemetry'] },
      {
        group: 'Cloud & DevOps',
        items: ['AWS (EC2, Lambda, S3, DynamoDB, API Gateway, IAM)', 'Docker', 'Podman', 'Kubernetes', 'Git'],
      },
      { group: 'Automation & CI/CD', items: ['GitHub Actions', 'CI/CD pipelines', 'Python scripting', 'AWS Lambda automation'] },
      { group: 'Databases', items: ['SQL', 'DynamoDB'] },
      {
        group: 'Performance & Reliability',
        items: ['Latency profiling', 'Logging', 'Log and telemetry analysis', 'Anomaly detection'],
      },
      { group: 'Applied AI/ML', items: ['PyTorch', 'YOLOv8', 'OpenCV', 'LangChain', 'RAG', 'NLP'] },
      { group: 'Practices', items: ['Agile/Scrum', 'Jira', 'Unit Testing', 'Technical Documentation', 'Linux'] },
    ],

    /* ===== Projects ===== */
    projectFilters: ['All', 'Drones', 'Backend', 'AI', 'Web'],

    projects: [
      {
        slug: 'gandiv-gcs',
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
        diagram: {
          cols: 5,
          rows: 5,
          nodes: [
            { id: 'vehicles', label: 'Vehicles', kind: 'external', col: 0, row: 2 },
            { id: 'mavlink', label: 'mavlink-core', sub: 'Rust', kind: 'service', col: 1, row: 2 },
            { id: 'nats', label: 'NATS', kind: 'bus', col: 2, row: 2 },
            { id: 'vehicle-manager', label: 'vehicle-manager', sub: 'Go', kind: 'service', col: 3, row: 0 },
            { id: 'mission-service', label: 'mission-service', sub: 'Go', kind: 'service', col: 3, row: 1 },
            { id: 'telemetry-recorder', label: 'telemetry-recorder', sub: 'Rust', kind: 'service', col: 3, row: 2 },
            { id: 'swarm-engine', label: 'swarm-engine', sub: 'Python', kind: 'service', col: 3, row: 3 },
            { id: 'api-gateway', label: 'api-gateway', sub: 'Go', kind: 'service', col: 3, row: 4 },
            { id: 'db', label: 'PostgreSQL + TimescaleDB', kind: 'store', col: 4, row: 1 },
            { id: 'console', label: 'React + CesiumJS console', kind: 'client', col: 4, row: 4 },
          ],
          groups: [
            { id: 'services', label: 'Services', members: ['vehicle-manager', 'mission-service', 'telemetry-recorder', 'swarm-engine', 'api-gateway'] },
          ],
          edges: [
            { from: 'vehicles', to: 'mavlink', both: true },
            { from: 'mavlink', to: 'nats', both: true },
            { from: 'nats', to: 'vehicle-manager', both: true },
            { from: 'nats', to: 'mission-service', both: true },
            { from: 'nats', to: 'telemetry-recorder', both: true },
            { from: 'nats', to: 'swarm-engine', both: true },
            { from: 'nats', to: 'api-gateway', both: true },
            { from: 'services', to: 'db' },
            { from: 'api-gateway', to: 'console', both: true },
          ],
        },
      },
      {
        slug: 'drone-swarm-simulator',
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
        diagram: {
          cols: 4,
          rows: 4,
          nodes: [
            { id: 'gcs', label: 'Browser GCS', sub: 'Three.js', kind: 'client', col: 0, row: 1 },
            { id: 'api', label: 'FastAPI', sub: 'REST + WebSocket', kind: 'service', col: 1, row: 1 },
            { id: 'engine', label: 'Simulation engine', sub: '30 Hz', kind: 'bus', col: 2, row: 1 },
            { id: 'algorithms', label: 'Algorithms', sub: 'ORCA, formations, flocking', kind: 'service', col: 3, row: 0 },
            { id: 'missions', label: 'Missions', kind: 'service', col: 3, row: 1 },
            { id: 'kalman', label: 'Kalman estimation', kind: 'service', col: 3, row: 2 },
            { id: 'reports', label: 'Replay and reports', kind: 'client', col: 0, row: 3 },
            { id: 'recorder', label: 'Recorder', kind: 'store', col: 1, row: 3 },
            { id: 'adapters', label: 'MAVLink adapters', kind: 'service', col: 2, row: 3 },
            { id: 'sitl', label: 'SITL vehicles', kind: 'external', col: 3, row: 3 },
          ],
          groups: [],
          edges: [
            { from: 'gcs', to: 'api', both: true },
            { from: 'api', to: 'engine', both: true },
            { from: 'algorithms', to: 'engine' },
            { from: 'missions', to: 'engine' },
            { from: 'kalman', to: 'engine' },
            { from: 'engine', to: 'recorder' },
            { from: 'recorder', to: 'reports' },
            { from: 'engine', to: 'adapters', both: true },
            { from: 'adapters', to: 'sitl', both: true },
          ],
        },
      },
      {
        slug: 'retail-automation-system',
        title: 'Real-Time Retail Automation System',
        category: 'Backend',
        featured: true,
        description:
          'Real-time IoT backend in Elixir/Phoenix that syncs 100+ devices over MQTT, with Docker deployments, Kubernetes orchestration and Keycloak auth.',
        features: [],
        tags: ['Elixir', 'Phoenix', 'MQTT', 'Docker', 'Kubernetes', 'Keycloak'],
        link: null,
        diagram: {
          cols: 5,
          rows: 1,
          nodes: [
            { id: 'clients', label: 'Client apps', kind: 'client', col: 0, row: 0 },
            { id: 'keycloak', label: 'Keycloak', sub: 'OAuth2/RBAC', kind: 'service', col: 1, row: 0 },
            { id: 'phoenix', label: 'Phoenix backend', kind: 'service', col: 2, row: 0 },
            { id: 'mqtt', label: 'MQTT broker', kind: 'bus', col: 3, row: 0 },
            { id: 'devices', label: '100+ devices', kind: 'external', col: 4, row: 0 },
          ],
          groups: [{ id: 'cluster', label: 'Docker / Kubernetes', members: ['phoenix'] }],
          edges: [
            { from: 'clients', to: 'keycloak' },
            { from: 'keycloak', to: 'phoenix' },
            { from: 'phoenix', to: 'mqtt', both: true },
            { from: 'mqtt', to: 'devices', both: true },
          ],
        },
      },
      {
        slug: 'aastha-ai-assistant',
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
        slug: 'ai-client-ranking',
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
        slug: 'shop-in',
        title: 'Shop-In',
        category: 'Web',
        featured: false,
        description: 'Django online store with catalogue, search, cart, Paytm checkout and order tracking.',
        features: [],
        tags: ['Django', 'SQLite', 'Paytm'],
        link: 'https://github.com/zeus881/shop-in',
      },
      {
        slug: 'weather-forecast-app',
        title: 'Weather Forecast App',
        category: 'Web',
        featured: false,
        description: 'Current conditions and 5-day forecast by city or GPS location.',
        features: [],
        tags: ['JavaScript', 'Tailwind', 'OpenWeather'],
        link: 'https://github.com/zeus881/Weather-app-real',
      },
      {
        slug: 'tech-traveler',
        title: 'Tech-Traveler',
        category: 'Web',
        featured: false,
        description: 'Eight-page animated content site on travel technology.',
        features: [],
        tags: ['HTML', 'Tailwind', 'GSAP', 'Three.js'],
        link: 'https://github.com/zeus881/Tech-Traveler',
      },
      {
        slug: 'tcp-chat',
        title: 'TCP Chat',
        category: 'Backend',
        featured: false,
        description: 'Threaded client-server chat on raw TCP sockets.',
        features: [],
        tags: ['Python', 'sockets', 'threading'],
        link: 'https://github.com/zeus881/server-and-clinet',
      },
    ],

    /* ===== Experience (newest first) ===== */
    experience: [
      {
        role: 'Software Engineer, UAV Systems & Autonomy',
        company: 'Gandiv AI and Defence System Pvt. Ltd.',
        location: 'Noida',
        start: 'May 2026',
        end: 'Present',
        current: true,
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
        current: false,
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
        current: false,
        points: [
          'Delivered Python automation tools and AWS Lambda/EC2 pipelines for defence-grade software projects.',
          'Built RESTful APIs integrated with S3, DynamoDB, API Gateway and IAM.',
          'Led Agile/Scrum ceremonies and improved CI/CD pipelines with GitHub Actions.',
        ],
        tags: ['Python', 'AWS', 'GitHub Actions', 'Agile'],
      },
    ],

    /* ===== Education and certifications ===== */
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

    /* ===== Command palette actions ===== */
    palette: {
      actions: [
        { id: 'resume', label: 'Download resume' },
        { id: 'copy-email', label: 'Copy email' },
        { id: 'toggle-3d', label: 'Toggle 3D' },
        { id: 'github', label: 'Open GitHub' },
      ],
    },

    /* ===== UI labels ===== */
    ui: {
      skipLink: 'Skip to content',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      resumeButton: 'Download Resume',
      toggle3dOn: '3D on',
      toggle3dOff: '3D off',
      toggle3dLabel: 'Toggle 3D effects',
      toggle3dUnavailable: '3D is not available on this device',
      search: 'Search',
      searchLabel: 'Open search and commands',
      backToTop: 'Back to top',
      newTab: '(opens in a new tab)',
      noscript: 'This page works without JavaScript; the 3D effects, filters and contact form need it. Resume:',
      noscriptEmail: 'Email:',
      // Order = page order. `id` is the <section id>; `label` becomes "// 03 PROJECTS".
      sections: [
        { id: 'home', nav: 'Home', label: 'HOME' },
        { id: 'about', nav: 'About', label: 'ABOUT', title: 'About Me' },
        { id: 'skills', nav: 'Skills', label: 'SKILLS', title: 'Skills' },
        { id: 'projects', nav: 'Projects', label: 'PROJECTS', title: 'Projects' },
        { id: 'experience', nav: 'Experience', label: 'EXPERIENCE', title: 'Experience' },
        { id: 'education', nav: 'Education', label: 'EDUCATION', title: 'Education & Certifications' },
        { id: 'contact', nav: 'Contact', label: 'CONTACT', title: 'Get In Touch' },
      ],
      hero: {
        greeting: "Hi, I'm",
        ctaProjects: 'View Projects',
        ctaContact: 'Contact',
        scrollHint: 'Scroll',
        localTime: 'Local time',
      },
      about: { whatIDoHeading: 'What I do' },
      projects: {
        filterLabel: 'Filter projects by category',
        status: 'Showing {n} of {total} projects',
        featured: 'Featured',
        details: 'View details',
        features: 'Key features',
        stack: 'Tech stack',
        architecture: 'Architecture',
        diagramLabel: 'Architecture diagram of {title}',
        diagramScroll: 'Scroll sideways to see the whole diagram',
        github: 'View on GitHub',
        close: 'Close project details',
      },
      experience: { now: 'NOW' },
      education: { degrees: 'Degree', certifications: 'Certifications' },
      contact: {
        directHeading: 'Reach me directly',
        formHeading: 'Send a message',
        copyEmail: 'Copy email',
        copied: 'Copied',
        copyFailed: 'Copy failed, select the address instead',
        github: 'GitHub',
        linkedin: 'LinkedIn',
        fields: { name: 'Name', email: 'Email', subject: 'Subject', message: 'Message' },
        submit: 'Send Message',
        sending: 'Sending…',
        success: 'Thanks! Your message has been sent.',
        failure: 'The message could not be sent from this page, so your email app has been opened with it pre-filled.',
        failureLink: 'Open the email draft again',
        errors: {
          required: '{field} is required.',
          email: 'Enter a valid email address, for example name@example.com.',
        },
      },
      palette: {
        title: 'Search and commands',
        placeholder: 'Search sections, projects and actions',
        empty: 'No matches',
        close: 'Close search',
        groups: { sections: 'Sections', projects: 'Projects', actions: 'Actions' },
        hint: 'Arrow keys to move, Enter to run, Esc to close',
      },
      notFound: {
        title: 'Page not found',
        text: 'This address does not exist on the site.',
        home: 'Back to the home page',
      },
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  if (root) root.PORTFOLIO_DATA = DATA;
})(typeof window !== 'undefined' ? window : null);

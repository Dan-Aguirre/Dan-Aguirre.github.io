// Everything the site says lives here. Edit text freely; keep the keys.
// Three languages: en, es, nl. If a string is missing in es/nl it falls back to en.

export const LINKS = {
  email: 'danielaguirre3141@protonmail.com',
  linkedin: 'https://www.linkedin.com/in/dan-aguirre',
  github: 'https://github.com/Dan-Aguirre',
  resume: 'resume.pdf',
};

export const SKILLS = [
  'Python', 'C#', 'Java', 'C++', 'x86/x64 Assembly', 'SQL', 'Bash', 'PowerShell', 'JavaScript',
  'Burp Suite Pro', 'Cobalt Strike', 'Sliver', 'Metasploit', 'Nmap', 'Wireshark', 'Fuzzing',
  'Azure', 'AWS', 'Docker', 'Kubernetes', 'AD / GPO', 'OPNsense', 'Security Onion', 'Defender EDR',
  'Snort / Suricata', 'MITRE ATT&CK', 'NIST 800-53 / CSF', 'PCI DSS', 'RAG pipelines', 'LLM red-teaming',
];

export const CERTS = [
  ['CompTIA Security+', ''],
  ['CompTIA Network+', ''],
  ['CompTIA A+', ''],
  ['Cisco CCST Cybersecurity', ''],
  ['HTB CPTS', 'wip'],
];

const en = {
  ui: {
    kicker: 'Weston, FL · Gainesville, FL · usually somewhere outside',
    tagline: 'Offensive security, consulting, teaching, and whatever is on the workbench this week.',
    intro: "This is my desk at 3am. Drive around, bump into things, and read whatever you crash into. There are flags hidden all over, and the window is technically out of scope.",
    start: 'Drive in',
    recruiter: 'Recruiter mode',
    recruiterSub: 'no driving, just the good stuff',
    loading: 'warming up the desk lamp',
    keys: [['W A S D', 'drive'], ['Shift', 'boost'], ['Space', 'brake'], ['E', 'open'], ['R', 'reset']],
    touch: 'Hold anywhere and drag to drive',
    flags: 'flags',
    places: 'Places',
    sound: 'sound',
    lang: 'language',
    termHint: 'Press E to open the terminal',
    termHintTouch: 'Tap to open the terminal',
    portalHint: 'Drive into the laptop to head back to the desk',
    toOutside: ['$ ssh dan@outside', 'warning: target is out of scope', 'client approval: granted (I am the client)', 'touching grass ...'],
    toDesk: ['$ ssh dan@desk', 'Connection established.', 'back to work.'],
    fell: 'kernel panic: fell off the desk. respawning',
    goal: 'GOOOOOL',
    flag: 'flag captured',
    allFlags: "You found every single flag. That's genuinely impressive, now you kind of have to email me.",
    noWebgl: "Your browser can't run the 3D part right now, so here's the readable version.",
    close: 'close',
    open: 'open',
    hire: 'Hire me',
    back: 'Back to the desk',
    download: 'Resume (PDF)',
    offClock: 'Off the clock',
    deskWorld: 'The desk',
    outWorld: 'Outside',
    cvIntro: "Same content as the 3D desk, just without the driving. Everything here is also on my resume.",
    garage: 'Garage',
    garageTitle: 'Pick your ride',
    locked: 'Find 10 flags to unlock (or get root)',
    vehicles: { buggy: 'RC buggy', moto: 'Moto', bus: 'Camioneta', tank: 'Tank', hiker: 'On foot', duck: 'Rubber duck' },
    tankNote: 'Tank mode is just for fun. Things will break, that is kind of the point.',
    resetMap: 'Reset map',
    fire: 'Fire',
    lap: 'lap', best: 'best',
    termAct: 'open the terminal', cookAct: 'make Cuban empanadas', fishAct: 'cast a line', windowAct: 'Drive through the window to go outside →',
    flagHint: '10 flags unlock something in the garage',
    ach: 'achievement unlocked',
    achs: { swim: 'Swimming with the fishes', fish: 'Gone fishing', wrap: 'The world is round (ish)', lap: 'First lap', chef: 'Chef de cocina', lumber: 'Lumberjack', rmrf: 'You monster', tank: 'Tank unlocked', duck: 'Quack', quetzal: 'Spotted a quetzal', goal: 'Golazo', summit: '3,976 m' },
    map: 'Map',
    mapHelp: 'Click a place to fly there. The fog clears as you explore.',
    cookTitle: 'Cuban empanadas',
    cookCrimp: 'Crimp the edge: hit E (or tap) when the fork is over a dot',
    cookFry: 'Fry: hit E (or tap) to pull it out when it turns golden',
    cookResults: ['Perfect empanadas. ¡Buen provecho!', 'Pretty good. A little filling escaped.', 'Burnt. Still eating it though.'],
    fishes: ['a mojarra', 'a tiny bass', 'an old boot', 'a USB stick (do NOT plug it in)', 'a crab with opinions'],
    caught: 'You caught',
    fuego: 'Volcán de Fuego (active)',
    tankUnlocked: 'Tank unlocked in the garage. Press F to fire.',
  },
  places: {
    spawn: 'Desk',
    terminal: 'Terminal',
    about: 'About',
    work: 'Experience',
    comps: 'Competitions',
    certs: 'Certs & school',
    lab: 'The lab',
    teach: 'Teaching',
    biz: 'Business',
    contact: 'Contact',
    outside: 'Outside',
    familia: 'Antigua',
    summit: 'Acatenango',
    lake: 'Lake Atitlán',
    pitch: 'The pitch',
    fire: 'Camp kitchen',
    hammock: 'Hammock',
    gym: 'Gym',
    dance: 'Dance floor',
    race: 'Race track',
  },
  s: {
    about: {
      label: 'about.txt',
      title: "Hey, I'm Dan!",
      body: [
        "I'm studying Computer Science (Cybersecurity) and Business Administration at the University of Florida, and most of my time goes into offensive security: web app and network pentesting, red teaming, and lately a lot of research on getting AI agents to attack and defend each other.",
        "What I really love though is the part after the hack. Sitting down with someone, explaining what we found in plain words, and turning a pile of findings into a plan that actually makes sense for their business. After all, what good is a pentest if nobody can act on it?",
        "I'm bilingual (English and Spanish) with family roots in Guatemala, Colombia and Cuba, I've been teaching this stuff since 2020, and when I'm not at a keyboard I'm probably on a trail somewhere.",
      ],
      facts: [['studying', 'UF · CS (Cyber) + Business · 2028'], ['gpa', '4.0'], ['speaks', 'English · Español'], ['looking for', 'Summer 2027 internships: offensive security, consulting, and the business side of tech']],
    },
    work: {
      label: 'engagements/',
      title: "Where I've worked",
      items: [
        { h: 'Aegis IT Solutions', role: 'Web App & Network Penetration Testing Intern', when: 'Apr – Aug 2026', where: 'Fort Lauderdale, FL',
          t: "Black, gray and white-box pentests for clients across a bunch of industries. I found the OWASP classics (SQLi, XSS, IDOR, SSRF, broken auth) with Burp Suite Pro, Nmap and my own tooling, and went past what scanners catch with multi-step auth bypass chains and API abuse. Then I wrote the reports, which is the part clients actually keep, with remediation roadmaps that engineers and executives could both use." },
        { h: 'University of Florida', role: 'Cybersecurity Detection & Response Intern', when: 'Aug 2025 – Apr 2026', where: 'Gainesville, FL',
          t: "Rotated through pentesting, incident response, IT audits and forensics, and automated a lot of manual workflows with Python and Bash. During the busy stretches I worked as a SOC analyst running full-cycle IR on state-level infrastructure and hunting adversary TTPs with Security Onion and Defender EDR. Honestly the best way to get better at red team is learning exactly how blue team catches you." },
        { h: 'University of Florida', role: 'IT Account Specialist', when: 'Aug 2024 – Aug 2025', where: 'Gainesville, FL',
          t: "Identity-based incident response for a 200,000+ user ecosystem: digging through Active Directory and Duo telemetry, cleaning up compromised accounts, and shutting down social engineering attempts." },
        { h: 'Freelance', role: 'Independent Security Consultant & Instructor', when: '2020 – now', where: 'Remote',
          t: "Security consulting for small businesses, turning technical risk into executive summaries that line up with what the business actually cares about. I also design and teach custom CompTIA curriculum for students who come in with zero tech background." },
      ],
    },
    comps: {
      label: 'trophies/',
      title: 'Competitions',
      items: [
        { h: 'CPTC', role: 'Team Captain · Lead Consultant · Cloud Lead', when: '2024 – 2025', badge: '2nd place global · 1st Southeast',
          t: "I captained our Collegiate Penetration Testing Competition team and ran client relations as lead consultant, which meant owning the final report on business risk and compliance gaps (NIST, PCI DSS). I was also our cloud lead, building real-world attack paths across Azure, AWS, Kubernetes and Docker." },
        { h: 'CCDC', role: 'Red Team Volunteer', when: '2025 – 2026',
          t: "One of a 10-person red team throwing simulated APTs at collegiate blue teams under live fire. Post-exploitation on Windows and Linux with Cobalt Strike and Sliver: persistence, lateral movement, exfil, all of it, and then helping teams see how they could have caught us." },
        { h: 'CTFs & labs', role: 'Ongoing',
          t: "picoCTF, ångstromCTF and DEADFACE, plus a pretty steady diet of HackTheBox, TryHackMe and CloudFoxable. Also BSides and DEF CON whenever I can make it." },
      ],
    },
    certs: {
      label: 'certs/',
      title: 'Certs & school',
      lead: "The book stack on the desk is real. The one with the bookmark sticking out is the one I'm working through right now.",
      wip: 'in progress',
      school: "University of Florida. B.S. in Computer Science (Cybersecurity) and B.A. in Business Administration, expected April 2028. 4.0 GPA, Dean's List, Florida Academic Scholarship. Also a member of ColorStack and SHPE.",
    },
    lab: {
      label: 'lab/',
      title: 'The lab',
      lead: 'I learn best by building something and then breaking it.',
      items: [
        { h: "Agentic AI security research", when: "2026 – now", t: "Red vs. blue swarms of LLM agents attacking and defending each other inside sandboxed infrastructure, with RAG pipelines feeding them tactical context, so I can study how autonomous agents actually behave and build countermeasures. Part of this I build alongside an industry red teamer: I contribute to an agentless forensics framework that mounts VM disks straight off an ESXi hypervisor to pull artifacts after an attack, plus tooling for swarm-vs-swarm testing." },
        { h: "Guardrail DoS research", when: "2026", t: "A local framework that reproduces and extends recent research on denial-of-service attacks against LLM safety guardrails: getting a guardrail to burn wildly disproportionate compute on harmless-looking content. It runs against a fast simulator or real local models, and turns the finding into a defensive tarpit. (Private, ask me about it.)" },
        { h: "Vuln Forge", when: "2026", t: "An automated lab generator that spins up randomly vulnerable VMs, instruments them with telemetry and exports them ready to drop into an ESXi range, so humans and agent swarms always have a fresh target to break. (Private, still wrestling it into shape.)" },
        { h: "Auto Skiller²", when: "2026", t: "Type in a technique like \"kerberoasting\" and a fully local RAG pipeline searches the big offensive security wikis, balances methodology against raw payloads, follows the cross-references, and hands an AI agent a clean skill pack. No cloud, no API keys." },
        { h: "AutoApply", when: "2026", t: "An agentic job-application pipeline in Python: Playwright browser automation, LLM-driven form filling that writes in my own voice, an encrypted credential vault, CAPTCHA handling, and tests against real applicant tracking systems like Workday. Basically I automated the most tedious part of being a student." },
        { h: "This website", when: "2026", t: "Designed and built with Claude Code as my pair programmer: three.js, hand-rolled physics, a synthesized salsa band, a working terminal, 15 flags, three languages and a strict Content Security Policy. No frameworks, no build step, no cookies." },
        { h: "Multi-tenant cyber range", when: "2021 – 2024", t: "A high-availability backbone for 100+ nodes on OPNsense and UniFi, run Zero Trust with 802.1X NAC, VLAN segmentation and Layer 3 ACLs, plus a remote access edge on OpenVPN and Shadowsocks with WAN load balancing so it stayed up." },
        { h: "Robotics & Arduino", when: "always", t: "Arduino builds like a filament extruder controller, a people counter for a campus lab, LCD dashboards and I2C links between boards, plus robotics projects full of sensors and servos (and the occasional build that smokes a little). The arm on the desk actually moves, go look." },
        { h: "Smaller stuff", when: "along the way", t: "A desktop app for a software engineering class, Minesweeper in C++, a multimedia downloader and a bash flashcard app. Everyone starts somewhere." },
      ],
      skills: 'Toolbox',
    },
    teach: {
      label: 'teaching/',
      title: 'Teaching',
      body: [
        "I've been teaching since 2020: custom CompTIA prep for people coming in with no tech background, and math tutoring at Mathnasium. Explaining the OSI model or PKI to someone who has never heard of either is honestly one of my favorite things to do.",
        "It's also the exact same skill as a good readout. If I can get a nervous student to understand certificate chains, I can get a CFO to understand why that SSRF matters.",
      ],
    },
    biz: {
      label: 'business/',
      title: 'The business side',
      body: [
        "I'm doing a second degree in Business Administration on purpose. Security only matters when it lines up with what the business is trying to do, and I want to be the person in the room who can talk to the engineers and to the people signing the budget.",
        "That's a big reason I love consulting: scoping, client relations, risk narratives, executive summaries. I'm also really curious about the finance world (financial advising is on my radar), so if your team sits where security meets business, we should definitely talk.",
      ],
    },
    contact: {
      label: 'contact',
      title: "Let's talk",
      body: ["Hiring for summer 2027, need a pentest explained in plain English (or Spanish), or just want to talk volcanoes? My inbox is open and I reply fast."],
    },
    familia: {
      label: '~/familia',
      title: 'Familia',
      body: ["My family has roots in Guatemala, Colombia and Cuba, and they're a big part of why I work as hard as I do. That yellow arch is the Arco de Santa Catalina in Antigua, so of course it had to be here."],
    },
    summit: {
      label: '~/acatenango (3,976 m)',
      title: '3,976 m',
      body: ["Hiking and backpacking are my reset button, and yes, I've summited Acatenango. It's a long cold climb, and at the top you get to watch Fuego erupt right next door, which is still one of the coolest things I've ever seen. Slow steady progress and then a huge payoff, pretty much the same thing I like about a long engagement."],
    },
    lake: {
      label: '~/atitlan',
      title: 'Sailing',
      body: ["Lake Atitlán, with three volcanoes standing around it. Sailing is basically incident response with wind: read the conditions, adjust constantly, and don't panic when things shift."],
    },
    pitch: {
      label: '~/cancha',
      title: 'Fútbol',
      body: ["Soccer has always been a constant for me. Being a good teammate on the pitch is the same thing as on a CPTC team: talk constantly, cover for each other, know when to pass. Go push the ball into the goal, I dare you."],
    },
    fire: {
      label: '~/cocina',
      title: 'Cooking',
      body: ["I love to cook. A recipe is just a runbook you get to eat, and the good ones get a little better every time you run them."],
    },
    hammock: {
      label: '~/lectura',
      title: 'Reading',
      body: ["Whatever is in the hammock this month: security, business, and the occasional novel so my brain gets a day off."],
    },
    gym: {
      label: '~/gym',
      title: 'Gym',
      body: ["Most mornings. Consistency beats motivation every time, and that has worked for certs just as much as for lifting."],
    },
    dance: {
      label: '~/baile',
      title: 'Salsa & Bachata',
      body: ["I really love to dance salsa and bachata. It's all timing, reading your partner and leading without forcing it, which honestly isn't that different from running a client meeting. Stay on the floor for a bit, the music is on me."],
    },
    race: {
      label: '~/pista',
      title: 'Race track',
      body: ["Driving this thing ended up being my favorite part of building it, so here's a track. Cross the checkered line to start the clock, go all the way around, and try to beat your best lap (it's saved on this device)."],
    },
  },
};

const es = {
  ui: {
    kicker: 'Weston, FL · Gainesville, FL · casi siempre en algún lugar al aire libre',
    tagline: 'Seguridad ofensiva, consultoría, enseñanza, y lo que sea que esté armando esta semana.',
    intro: 'Este es mi escritorio a las 3 de la mañana. Maneja por ahí, choca con cosas y lee lo que te encuentres. Hay flags escondidas por todos lados, y la ventana técnicamente está fuera de alcance.',
    start: 'Entrar',
    recruiter: 'Modo reclutador',
    recruiterSub: 'sin manejar, solo lo importante',
    loading: 'prendiendo la lámpara',
    keys: [['W A S D', 'manejar'], ['Shift', 'turbo'], ['Espacio', 'frenar'], ['E', 'abrir'], ['R', 'reiniciar']],
    touch: 'Mantén presionado y arrastra para manejar',
    flags: 'flags',
    places: 'Lugares',
    sound: 'sonido',
    lang: 'idioma',
    termHint: 'Presiona E para abrir la terminal',
    termHintTouch: 'Toca para abrir la terminal',
    portalHint: 'Maneja hacia la laptop para volver al escritorio',
    toOutside: ['$ ssh dan@afuera', 'advertencia: objetivo fuera de alcance', 'aprobación del cliente: concedida (el cliente soy yo)', 'saliendo a tocar pasto ...'],
    toDesk: ['$ ssh dan@escritorio', 'Conexión establecida.', 'de vuelta al trabajo.'],
    fell: 'kernel panic: te caíste del escritorio. reapareciendo',
    goal: 'GOOOOOL',
    flag: 'flag capturada',
    allFlags: 'Encontraste todas las flags. En serio impresionante, ahora sí me tienes que escribir.',
    noWebgl: 'Tu navegador no puede correr la parte 3D ahora mismo, así que aquí está la versión para leer.',
    close: 'cerrar',
    open: 'abrir',
    hire: 'Contrátame',
    back: 'Volver al escritorio',
    download: 'Currículum (PDF)',
    offClock: 'Fuera del trabajo',
    deskWorld: 'El escritorio',
    outWorld: 'Afuera',
    cvIntro: 'El mismo contenido del escritorio 3D, pero sin manejar. Todo esto también está en mi currículum.',
    garage: 'Garaje',
    garageTitle: 'Escoge tu vehículo',
    locked: 'Encuentra 10 flags para desbloquear (o consigue root)',
    vehicles: { buggy: 'Buggy RC', moto: 'Moto', bus: 'Camioneta', tank: 'Tanque', hiker: 'A pie', duck: 'Patito de hule' },
    tankNote: 'El modo tanque es solo por diversión. Las cosas se van a romper, esa es la idea.',
    resetMap: 'Reiniciar mapa',
    fire: 'Disparar',
    lap: 'vuelta', best: 'mejor',
    termAct: 'abrir la terminal', cookAct: 'hacer empanadas cubanas', fishAct: 'tirar la caña', windowAct: 'Maneja a través de la ventana para salir →',
    flagHint: '10 flags desbloquean algo en el garaje',
    ach: 'logro desbloqueado',
    achs: { swim: 'Nadando con los peces', fish: 'Me fui a pescar', wrap: 'El mundo es redondo (más o menos)', lap: 'Primera vuelta', chef: 'Chef de cocina', lumber: 'Leñador', rmrf: 'Eres un monstruo', tank: 'Tanque desbloqueado', duck: 'Cuac', quetzal: 'Viste un quetzal', goal: 'Golazo', summit: '3,976 m' },
    map: 'Mapa',
    mapHelp: 'Haz clic en un lugar para volar ahí. La niebla se despeja mientras exploras.',
    cookTitle: 'Empanadas cubanas',
    cookCrimp: 'Cierra el borde: presiona E (o toca) cuando el tenedor esté sobre un punto',
    cookFry: 'A freír: presiona E (o toca) para sacarla cuando esté dorada',
    cookResults: ['Empanadas perfectas. ¡Buen provecho!', 'Bastante buenas. Se salió un poquito de relleno.', 'Quemadas. Igual me las como.'],
    fishes: ['una mojarra', 'una lubina chiquita', 'una bota vieja', 'una memoria USB (NO la conectes)', 'un cangrejo con opiniones'],
    caught: 'Pescaste',
    fuego: 'Volcán de Fuego (activo)',
    tankUnlocked: 'Tanque desbloqueado en el garaje. Presiona F para disparar.',
  },
  places: {
    spawn: 'Escritorio', terminal: 'Terminal', about: 'Sobre mí', work: 'Experiencia', comps: 'Competencias',
    certs: 'Certificaciones', lab: 'El laboratorio', teach: 'Enseñanza', biz: 'Negocios', contact: 'Contacto',
    outside: 'Afuera', familia: 'Antigua', summit: 'Acatenango', lake: 'Lago de Atitlán', pitch: 'La cancha',
    fire: 'Cocina de campamento', hammock: 'Hamaca', gym: 'Gym', dance: 'Pista de baile', race: 'La pista',
  },
  s: {
    about: {
      title: '¡Hola, soy Dan!',
      body: [
        'Estudio Ciencias de la Computación (Ciberseguridad) y Administración de Empresas en la Universidad de Florida, y casi todo mi tiempo se va en seguridad ofensiva: pentesting de aplicaciones web y redes, red teaming, y últimamente mucha investigación sobre agentes de IA que se atacan y se defienden entre sí.',
        'Pero lo que de verdad me encanta es lo que viene después del hackeo. Sentarme con alguien, explicarle lo que encontramos en palabras simples y convertir un montón de hallazgos en un plan que tenga sentido para su negocio. Al final, ¿de qué sirve un pentest si nadie puede actuar sobre él?',
        'Soy bilingüe (inglés y español), mi familia tiene raíces en Guatemala, Colombia y Cuba, enseño estas cosas desde 2020, y cuando no estoy en el teclado probablemente estoy en algún sendero.',
      ],
      facts: [['estudio', 'UF · CS (Ciber) + Negocios · 2028'], ['gpa', '4.0'], ['idiomas', 'English · Español'], ['busco', 'Pasantías para el verano 2027: seguridad ofensiva, consultoría y el lado de negocios de la tecnología']],
    },
    work: {
      title: 'Dónde he trabajado',
      items: [
        { t: 'Pentests de caja negra, gris y blanca para clientes de muchas industrias. Encontré los clásicos de OWASP (SQLi, XSS, IDOR, SSRF, autenticación rota) con Burp Suite Pro, Nmap y mis propias herramientas, y fui más allá de lo que detectan los escáneres con cadenas de bypass de autenticación y abuso de APIs. Después escribí los reportes, que es lo que el cliente de verdad se queda, con hojas de ruta de remediación que servían tanto para ingenieros como para ejecutivos.', role: 'Pasante de Pentesting de Aplicaciones Web y Redes' },
        { t: 'Roté por pentesting, respuesta a incidentes, auditorías de TI y forense, y automaticé muchos procesos manuales con Python y Bash. En las temporadas más pesadas trabajé como analista de SOC haciendo respuesta a incidentes completa en infraestructura a nivel estatal y cazando TTPs de adversarios con Security Onion y Defender EDR. La mejor manera de mejorar en red team es aprender exactamente cómo te atrapa el blue team.', role: 'Pasante de Detección y Respuesta de Ciberseguridad' },
        { t: 'Respuesta a incidentes de identidad para un ecosistema de más de 200,000 usuarios: analizando telemetría de Active Directory y Duo, limpiando cuentas comprometidas y frenando intentos de ingeniería social.', role: 'Especialista de Cuentas de TI' },
        { t: 'Consultoría de seguridad para pequeñas empresas, convirtiendo riesgo técnico en resúmenes ejecutivos alineados con lo que de verdad le importa al negocio. También diseño y enseño cursos de CompTIA a la medida para estudiantes que llegan sin ninguna base técnica.', role: 'Consultor de Seguridad e Instructor Independiente', h: 'Independiente', when: '2020 – hoy' },
      ],
    },
    comps: {
      title: 'Competencias',
      items: [
        { t: 'Fui capitán de nuestro equipo de la Collegiate Penetration Testing Competition y manejé la relación con el cliente como consultor principal, o sea que el reporte final sobre riesgo de negocio y brechas de cumplimiento (NIST, PCI DSS) era mío. También fui el líder de nube, armando rutas de ataque reales en Azure, AWS, Kubernetes y Docker.', role: 'Capitán · Consultor principal · Líder de nube', badge: '2º lugar mundial · 1º del Sureste' },
        { t: 'Parte de un red team de 10 personas lanzando APTs simulados contra blue teams universitarios en vivo. Post-explotación en Windows y Linux con Cobalt Strike y Sliver: persistencia, movimiento lateral, exfiltración, todo, y después ayudar a los equipos a ver cómo nos pudieron haber detectado.', role: 'Voluntario del Red Team' },
        { t: 'picoCTF, ångstromCTF y DEADFACE, además de una dieta bastante constante de HackTheBox, TryHackMe y CloudFoxable. Y BSides y DEF CON cuando puedo ir.', role: 'Siempre', h: 'CTFs y labs' },
      ],
    },
    certs: {
      title: 'Certificaciones y estudios',
      lead: 'La pila de libros del escritorio es real. El que tiene el separador salido es el que estoy estudiando ahora.',
      wip: 'en progreso',
      school: 'Universidad de Florida. B.S. en Ciencias de la Computación (Ciberseguridad) y B.A. en Administración de Empresas, graduación esperada en abril de 2028. GPA 4.0, Dean\'s List, Florida Academic Scholarship. También miembro de ColorStack y SHPE.',
    },
    lab: {
      title: 'El laboratorio',
      lead: 'Aprendo mejor construyendo algo y después rompiéndolo.',
      items: [
        { h: "Investigación de seguridad en IA agéntica", when: "2026 – hoy", t: "Enjambres de agentes LLM rojos contra azules que se atacan y se defienden en infraestructura aislada, con pipelines RAG que les dan contexto táctico, para estudiar cómo se comportan de verdad los agentes autónomos y construir contramedidas. Parte de esto lo construyo junto a un red teamer de la industria: contribuyo a un framework forense sin agentes que monta los discos de las VMs directamente desde un hipervisor ESXi para extraer artefactos después de un ataque, además de herramientas para probar enjambre contra enjambre." },
        { h: "Investigación de DoS a guardrails", when: "2026", t: "Un framework local que reproduce y extiende investigación reciente sobre ataques de denegación de servicio contra los guardrails de seguridad de LLMs: hacer que un guardrail gaste una cantidad absurda de cómputo en contenido que parece inofensivo. Corre contra un simulador rápido o contra modelos locales reales, y convierte el hallazgo en un tarpit defensivo. (Privado, pregúntame.)" },
        { h: "Vuln Forge", when: "2026", t: "Un generador automático de laboratorios que crea VMs vulnerables al azar, las instrumenta con telemetría y las exporta listas para un cyber range en ESXi, para que humanos y enjambres de agentes siempre tengan un objetivo nuevo. (Privado, todavía domándolo.)" },
        { h: "Auto Skiller²", when: "2026", t: "Escribes una técnica como \"kerberoasting\" y un pipeline RAG totalmente local busca en las grandes wikis de seguridad ofensiva, balancea metodología con payloads, sigue las referencias cruzadas y le entrega a un agente de IA un paquete de habilidades limpio. Sin nube, sin API keys." },
        { h: "AutoApply", when: "2026", t: "Un pipeline agéntico para aplicar a trabajos en Python: automatización de navegador con Playwright, formularios llenados por LLM que escriben con mi propia voz, una bóveda de credenciales cifrada, manejo de CAPTCHAs y pruebas contra sistemas reales como Workday. Básicamente automaticé la parte más tediosa de ser estudiante." },
        { h: "Este sitio web", when: "2026", t: "Diseñado y construido con Claude Code como mi compañero de programación: three.js, física hecha a mano, una banda de salsa sintetizada, una terminal funcional, 15 flags, tres idiomas y una Content Security Policy estricta. Sin frameworks, sin build, sin cookies." },
        { h: "Cyber range multi-tenant", when: "2021 – 2024", t: "Una red troncal de alta disponibilidad para más de 100 nodos con OPNsense y UniFi, bajo Zero Trust con 802.1X NAC, segmentación por VLANs y ACLs de capa 3, más un acceso remoto con OpenVPN y Shadowsocks con balanceo de carga WAN para que nunca se cayera." },
        { h: "Robótica y Arduino", when: "siempre", t: "Proyectos de Arduino como un controlador para un extrusor de filamento, un contador de personas para un laboratorio del campus, pantallas LCD y comunicación I2C entre placas, más robótica llena de sensores y servos (y de vez en cuando algo que echa un poquito de humo). El brazo del escritorio de verdad se mueve, ve a verlo." },
        { h: "Cosas más pequeñas", when: "en el camino", t: "Una app de escritorio para una clase de ingeniería de software, Buscaminas en C++, un descargador multimedia y una app de flashcards en bash. Todos empezamos en algún lado." },
      ],
      skills: 'Herramientas',
    },
    teach: {
      title: 'Enseñanza',
      body: [
        'Enseño desde 2020: preparación de CompTIA a la medida para gente que llega sin base técnica, y tutorías de matemáticas en Mathnasium. Explicarle el modelo OSI o PKI a alguien que nunca ha oído de ninguno de los dos es, honestamente, de mis cosas favoritas.',
        'Y es exactamente la misma habilidad que una buena presentación de resultados. Si puedo hacer que un estudiante nervioso entienda las cadenas de certificados, puedo hacer que un CFO entienda por qué ese SSRF importa.',
      ],
    },
    biz: {
      title: 'El lado de negocios',
      body: [
        'Estoy haciendo una segunda carrera en Administración de Empresas a propósito. La seguridad solo importa cuando está alineada con lo que el negocio quiere lograr, y quiero ser la persona en la sala que puede hablar con los ingenieros y con quienes firman el presupuesto.',
        'Por eso me encanta la consultoría: definir el alcance, la relación con el cliente, contar el riesgo, los resúmenes ejecutivos. También tengo mucha curiosidad por el mundo de las finanzas (la asesoría financiera está en mi radar), así que si tu equipo está donde la seguridad se cruza con el negocio, hablemos.',
      ],
    },
    contact: {
      title: 'Hablemos',
      body: ['¿Buscas a alguien para el verano 2027, necesitas que te expliquen un pentest en español claro (o en inglés), o simplemente quieres hablar de volcanes? Mi bandeja está abierta y respondo rápido.'],
    },
    familia: { title: 'Familia', body: ['Mi familia tiene raíces en Guatemala, Colombia y Cuba, y es una gran parte de la razón por la que trabajo tan duro. Ese arco amarillo es el Arco de Santa Catalina en Antigua, obviamente tenía que estar aquí.'] },
    summit: { body: ['Caminar y hacer mochilazo son mi botón de reinicio, y sí, he subido el Acatenango. Es una subida larga y fría, y arriba ves al Fuego hacer erupción justo al lado, que sigue siendo de las cosas más impresionantes que he visto. Progreso lento y constante y después una recompensa enorme, más o menos lo mismo que me gusta de un proyecto largo.'] },
    lake: { title: 'Velear', body: ['El Lago de Atitlán, con tres volcanes alrededor. Velear es básicamente respuesta a incidentes con viento: lees las condiciones, ajustas todo el tiempo y no entras en pánico cuando las cosas cambian.'] },
    pitch: { body: ['El fútbol siempre ha sido una constante para mí. Ser buen compañero en la cancha es lo mismo que en un equipo de CPTC: hablar todo el tiempo, cubrirse entre todos y saber cuándo pasarla. Ve y mete la pelota en la portería, te reto.'] },
    fire: { title: 'Cocinar', body: ['Me encanta cocinar. Una receta es solo un runbook que te puedes comer, y las buenas mejoran un poquito cada vez que las corres.'] },
    hammock: { title: 'Leer', body: ['Lo que esté en la hamaca este mes: seguridad, negocios, y alguna novela de vez en cuando para que el cerebro descanse.'] },
    gym: { body: ['Casi todas las mañanas. La constancia le gana a la motivación siempre, y eso me ha funcionado igual para las certificaciones que para las pesas.'] },
    dance: { body: ['Me encanta bailar salsa y bachata. Todo es ritmo, leer a tu pareja y guiar sin forzar, que honestamente no es tan diferente a llevar una reunión con un cliente. Quédate un rato en la pista, la música corre por mi cuenta.'] },
    race: { title: 'La pista', body: ['Manejar esta cosa terminó siendo mi parte favorita de construirla, así que aquí hay una pista. Cruza la línea de cuadros para arrancar el reloj, da la vuelta completa y trata de superar tu mejor vuelta (se guarda en este dispositivo).'] },
  },
};

const nl = {
  ui: {
    kicker: 'Weston, FL · Gainesville, FL · meestal ergens buiten',
    tagline: 'Offensive security, consultancy, lesgeven, en waar ik deze week ook maar aan aan het knutselen ben.',
    intro: 'Dit is mijn bureau om 3 uur \'s nachts. Rijd rond, bots tegen dingen aan en lees wat je tegenkomt. Er liggen overal flags verstopt, en het raam valt technisch gezien buiten de scope.',
    start: 'Rijden',
    recruiter: 'Recruitermodus',
    recruiterSub: 'niet rijden, alleen de belangrijke dingen',
    loading: 'bureaulamp aan het opwarmen',
    keys: [['W A S D', 'rijden'], ['Shift', 'boost'], ['Spatie', 'remmen'], ['E', 'openen'], ['R', 'reset']],
    touch: 'Houd ergens ingedrukt en sleep om te rijden',
    flags: 'flags',
    places: 'Plekken',
    sound: 'geluid',
    lang: 'taal',
    termHint: 'Druk op E om de terminal te openen',
    termHintTouch: 'Tik om de terminal te openen',
    portalHint: 'Rijd de laptop in om terug te gaan naar het bureau',
    toOutside: ['$ ssh dan@buiten', 'waarschuwing: doel valt buiten de scope', 'goedkeuring klant: verleend (ik ben de klant)', 'even naar buiten ...'],
    toDesk: ['$ ssh dan@bureau', 'Verbinding gemaakt.', 'weer aan het werk.'],
    fell: 'kernel panic: van het bureau gevallen. respawnen',
    goal: 'GOOOOOL',
    flag: 'flag gevonden',
    allFlags: 'Je hebt echt alle flags gevonden. Heel indrukwekkend, nu moet je me eigenlijk wel even mailen.',
    noWebgl: 'Je browser kan het 3D-gedeelte nu niet draaien, dus hier is de leesbare versie.',
    close: 'sluiten',
    open: 'openen',
    hire: 'Neem me aan',
    back: 'Terug naar het bureau',
    download: 'Cv (PDF)',
    offClock: 'Na werktijd',
    deskWorld: 'Het bureau',
    outWorld: 'Buiten',
    cvIntro: 'Dezelfde inhoud als het 3D-bureau, alleen zonder rijden. Alles hier staat ook op mijn cv.',
    garage: 'Garage',
    garageTitle: 'Kies je voertuig',
    locked: 'Vind 10 flags om te ontgrendelen (of word root)',
    vehicles: { buggy: 'RC-buggy', moto: 'Motor', bus: 'Camioneta', tank: 'Tank', hiker: 'Te voet', duck: 'Badeendje' },
    tankNote: 'Tankmodus is gewoon voor de lol. Dingen gaan kapot, dat is een beetje het idee.',
    resetMap: 'Kaart resetten',
    fire: 'Vuur',
    lap: 'ronde', best: 'beste',
    termAct: 'de terminal openen', cookAct: 'Cubaanse empanadas maken', fishAct: 'een lijntje uitwerpen', windowAct: 'Rijd door het raam om naar buiten te gaan →',
    flagHint: '10 flags ontgrendelen iets in de garage',
    ach: 'prestatie ontgrendeld',
    achs: { swim: 'Zwemmen met de vissen', fish: 'Uit vissen', wrap: 'De wereld is rond (ongeveer)', lap: 'Eerste ronde', chef: 'Chef de cocina', lumber: 'Houthakker', rmrf: 'Monster', tank: 'Tank ontgrendeld', duck: 'Kwak', quetzal: 'Quetzal gespot', goal: 'Golazo', summit: '3.976 m' },
    map: 'Kaart',
    mapHelp: 'Klik op een plek om erheen te vliegen. De mist trekt op terwijl je verkent.',
    cookTitle: 'Cubaanse empanadas',
    cookCrimp: 'Rand dichtdrukken: druk op E (of tik) als de vork boven een stip staat',
    cookFry: 'Frituren: druk op E (of tik) om hem eruit te halen als hij goudbruin is',
    cookResults: ['Perfecte empanadas. ¡Buen provecho!', 'Best goed. Er liep een beetje vulling uit.', 'Aangebrand. Ik eet ze toch.'],
    fishes: ['een mojarra', 'een piepkleine baars', 'een oude laars', 'een USB-stick (NIET insteken)', 'een krab met meningen'],
    caught: 'Je ving',
    fuego: 'Volcán de Fuego (actief)',
    tankUnlocked: 'Tank ontgrendeld in de garage. Druk op F om te vuren.',
  },
  places: {
    spawn: 'Bureau', terminal: 'Terminal', about: 'Over mij', work: 'Werkervaring', comps: 'Competities',
    certs: 'Certificaten', lab: 'Het lab', teach: 'Lesgeven', biz: 'Business', contact: 'Contact',
    outside: 'Buiten', familia: 'Antigua', summit: 'Acatenango', lake: 'Atitlánmeer', pitch: 'Het veld',
    fire: 'Kampkeuken', hammock: 'Hangmat', gym: 'Gym', dance: 'Dansvloer', race: 'Racebaan',
  },
  s: {
    about: {
      title: 'Hoi, ik ben Dan!',
      body: [
        'Ik studeer Computer Science (Cybersecurity) en Bedrijfskunde aan de University of Florida, en het grootste deel van mijn tijd gaat naar offensive security: pentesten van webapplicaties en netwerken, red teaming, en de laatste tijd veel onderzoek naar AI-agents die elkaar aanvallen en verdedigen.',
        'Maar wat ik echt het leukst vind, is het deel na de hack. Met iemand gaan zitten, in gewone taal uitleggen wat we gevonden hebben, en een stapel bevindingen omzetten in een plan dat ook echt klopt voor hun bedrijf. Want wat heb je aan een pentest als niemand er iets mee kan?',
        'Ik ben tweetalig (Engels en Spaans), mijn familie heeft roots in Guatemala, Colombia en Cuba, ik geef sinds 2020 les in dit soort dingen, en als ik niet achter een toetsenbord zit, ben ik waarschijnlijk ergens op een wandelpad.',
      ],
      facts: [['studie', 'UF · CS (Cyber) + Business · 2028'], ['gpa', '4.0'], ['talen', 'English · Español'], ['zoekt', 'Stages voor zomer 2027: offensive security, consultancy, en de businesskant van tech']],
    },
    work: {
      title: 'Waar ik heb gewerkt',
      items: [
        { t: 'Black-, gray- en white-box pentests voor klanten in allerlei sectoren. Ik vond de OWASP-klassiekers (SQLi, XSS, IDOR, SSRF, broken auth) met Burp Suite Pro, Nmap en eigen tooling, en ging verder dan wat scanners vinden met auth-bypassketens in meerdere stappen en API-misbruik. Daarna schreef ik de rapporten, het deel dat klanten echt bewaren, met remediatie-roadmaps waar zowel engineers als directie mee uit de voeten konden.', role: 'Stagiair Web App & Network Penetration Testing' },
        { t: 'Gerouleerd langs pentesting, incident response, IT-audits en forensisch onderzoek, en veel handmatig werk geautomatiseerd met Python en Bash. In drukke periodes werkte ik als SOC-analist: volledige incident response op infrastructuur op staatsniveau en threat hunting op TTPs van aanvallers met Security Onion en Defender EDR. Eerlijk gezegd word je het beste in red team door precies te leren hoe blue team je betrapt.', role: 'Stagiair Cybersecurity Detection & Response' },
        { t: 'Identiteitsgerichte incident response voor een omgeving met meer dan 200.000 gebruikers: Active Directory- en Duo-telemetrie doorspitten, gecompromitteerde accounts opschonen en social-engineeringpogingen stoppen.', role: 'IT Account Specialist' },
        { t: 'Securityadvies voor kleine bedrijven, waarbij ik technisch risico vertaal naar managementsamenvattingen die aansluiten bij wat het bedrijf echt belangrijk vindt. Ik ontwerp en geef ook CompTIA-lessen op maat voor studenten zonder enige technische achtergrond.', role: 'Zelfstandig Security Consultant & Docent', h: 'Freelance', when: '2020 – nu' },
      ],
    },
    comps: {
      title: 'Competities',
      items: [
        { t: 'Ik was aanvoerder van ons team bij de Collegiate Penetration Testing Competition en deed als lead consultant het klantcontact, dus het eindrapport over bedrijfsrisico\'s en compliance-gaten (NIST, PCI DSS) lag bij mij. Ik was ook onze cloud lead en bouwde realistische aanvalspaden in Azure, AWS, Kubernetes en Docker.', role: 'Aanvoerder · Lead consultant · Cloud lead', badge: '2e plaats wereldwijd · 1e in het zuidoosten' },
        { t: 'Een van de 10 mensen in het red team dat gesimuleerde APT\'s live op studententeams afvuurde. Post-exploitation op Windows en Linux met Cobalt Strike en Sliver: persistence, lateral movement, exfiltratie, alles, en daarna teams laten zien hoe ze ons hadden kunnen vangen.', role: 'Vrijwilliger Red Team' },
        { t: 'picoCTF, ångstromCTF en DEADFACE, plus een vrij vast dieet van HackTheBox, TryHackMe en CloudFoxable. En BSides en DEF CON wanneer het lukt.', role: 'Doorlopend', h: 'CTFs & labs' },
      ],
    },
    certs: {
      title: 'Certificaten & studie',
      lead: 'De stapel boeken op het bureau is echt. Die met de boekenlegger erin is degene waar ik nu mee bezig ben.',
      wip: 'bezig',
      school: 'University of Florida. B.S. Computer Science (Cybersecurity) en B.A. Business Administration, verwacht april 2028. 4.0 GPA, Dean\'s List, Florida Academic Scholarship. Ook lid van ColorStack en SHPE.',
    },
    lab: {
      title: 'Het lab',
      lead: 'Ik leer het best door iets te bouwen en het daarna kapot te maken.',
      items: [
        { h: "Onderzoek naar agentic AI-security", when: "2026 – nu", t: "Rode en blauwe zwermen van LLM-agents die elkaar aanvallen en verdedigen in afgeschermde infrastructuur, met RAG-pipelines die ze tactische context geven, zodat ik kan bestuderen hoe autonome agents zich echt gedragen en tegenmaatregelen kan bouwen. Een deel hiervan bouw ik samen met een red teamer uit de industrie: ik draag bij aan een agentloos forensisch framework dat VM-schijven rechtstreeks van een ESXi-hypervisor koppelt om na een aanval artefacten te verzamelen, plus tooling om zwerm tegen zwerm te testen." },
        { h: "Onderzoek naar DoS op guardrails", when: "2026", t: "Een lokaal framework dat recent onderzoek naar denial-of-service-aanvallen op LLM-veiligheidsguardrails reproduceert en uitbreidt: een guardrail extreem veel rekenkracht laten verbranden op onschuldig ogende content. Het draait tegen een snelle simulator of echte lokale modellen, en zet de bevinding om in een defensieve tarpit. (Privé, vraag me ernaar.)" },
        { h: "Vuln Forge", when: "2026", t: "Een automatische labgenerator die willekeurig kwetsbare VM's opzet, ze voorziet van telemetrie en ze exporteert, klaar voor een ESXi-range, zodat mensen en agentzwermen altijd een nieuw doelwit hebben. (Privé, ik ben hem nog aan het temmen.)" },
        { h: "Auto Skiller²", when: "2026", t: "Typ een techniek in zoals \"kerberoasting\" en een volledig lokale RAG-pipeline doorzoekt de grote offensive-security-wiki's, balanceert methodologie tegen payloads, volgt de kruisverwijzingen en geeft een AI-agent een nette skill-pack. Geen cloud, geen API-keys." },
        { h: "AutoApply", when: "2026", t: "Een agentic pipeline voor sollicitaties in Python: browserautomatisering met Playwright, formulieren ingevuld door een LLM in mijn eigen schrijfstijl, een versleutelde kluis voor inloggegevens, CAPTCHA-afhandeling en tests tegen echte systemen zoals Workday. Eigenlijk heb ik het saaiste deel van student zijn geautomatiseerd." },
        { h: "Deze website", when: "2026", t: "Ontworpen en gebouwd met Claude Code als mijn programmeerpartner: three.js, zelfgeschreven physics, een gesynthetiseerde salsaband, een werkende terminal, 15 flags, drie talen en een strikte Content Security Policy. Geen frameworks, geen build-stap, geen cookies." },
        { h: "Multi-tenant cyber range", when: "2021 – 2024", t: "Een high-availability backbone voor meer dan 100 nodes op OPNsense en UniFi, volgens Zero Trust met 802.1X NAC, VLAN-segmentatie en layer 3-ACL's, plus remote access via OpenVPN en Shadowsocks met WAN-loadbalancing zodat alles bleef draaien." },
        { h: "Robotica & Arduino", when: "altijd", t: "Arduino-projecten zoals een controller voor een filament-extruder, een personenteller voor een lab op de campus, LCD-dashboards en I2C tussen boards, plus robotica vol sensoren en servo's (en af en toe een project dat een beetje gaat roken). De arm op het bureau beweegt echt, ga maar kijken." },
        { h: "Kleinere dingen", when: "onderweg", t: "Een desktop-app voor een vak software engineering, Minesweeper in C++, een multimedia-downloader en een flashcard-app in bash. Iedereen begint ergens." },
      ],
      skills: 'Gereedschapskist',
    },
    teach: {
      title: 'Lesgeven',
      body: [
        'Ik geef sinds 2020 les: CompTIA-voorbereiding op maat voor mensen zonder technische achtergrond, en bijles wiskunde bij Mathnasium. Het OSI-model of PKI uitleggen aan iemand die van geen van beide ooit gehoord heeft, is eerlijk gezegd een van mijn favoriete dingen.',
        'En het is precies dezelfde vaardigheid als een goede rapportage. Als ik een nerveuze student certificaatketens kan laten begrijpen, kan ik een CFO ook laten begrijpen waarom die SSRF ertoe doet.',
      ],
    },
    biz: {
      title: 'De businesskant',
      body: [
        'Ik doe bewust een tweede studie Bedrijfskunde. Security doet er pas toe als het aansluit bij wat het bedrijf wil bereiken, en ik wil degene in de kamer zijn die zowel met de engineers kan praten als met de mensen die het budget tekenen.',
        'Daarom vind ik consultancy zo leuk: scoping, klantcontact, risico\'s helder vertellen, managementsamenvattingen. Ik ben ook erg nieuwsgierig naar de financiële wereld (financieel advies staat op mijn radar), dus als jouw team zit waar security en business elkaar raken, moeten we zeker praten.',
      ],
    },
    contact: {
      title: 'Laten we praten',
      body: ['Op zoek naar iemand voor zomer 2027, een pentest in gewone taal uitgelegd krijgen (Engels of Spaans), of gewoon over vulkanen praten? Mijn inbox staat open en ik reageer snel.'],
    },
    familia: { title: 'Familie', body: ['Mijn familie heeft roots in Guatemala, Colombia en Cuba, en zij zijn een groot deel van de reden dat ik zo hard werk. Die gele boog is de Arco de Santa Catalina in Antigua, die moest er natuurlijk in.'] },
    summit: { body: ['Wandelen en backpacken zijn mijn resetknop, en ja, ik heb de Acatenango beklommen. Het is een lange koude klim, en bovenop zie je de Fuego vlak naast je uitbarsten, nog steeds een van de gaafste dingen die ik ooit heb gezien. Langzame, gestage vooruitgang en dan een enorme beloning, eigenlijk precies wat ik ook leuk vind aan een lang project.'] },
    lake: { title: 'Zeilen', body: ['Het Atitlánmeer, met drie vulkanen eromheen. Zeilen is eigenlijk incident response met wind: lees de omstandigheden, stel constant bij en raak niet in paniek als het omslaat.'] },
    pitch: { title: 'Voetbal', body: ['Voetbal is altijd een constante voor me geweest. Een goede teamgenoot zijn op het veld is hetzelfde als in een CPTC-team: blijven praten, elkaar dekken en weten wanneer je moet passen. Duw de bal maar in het doel, ik daag je uit.'] },
    fire: { title: 'Koken', body: ['Ik kook heel graag. Een recept is gewoon een runbook dat je kunt opeten, en de goede worden elke keer dat je ze draait een beetje beter.'] },
    hammock: { title: 'Lezen', body: ['Wat er deze maand in de hangmat ligt: security, business, en af en toe een roman zodat mijn hoofd een dagje vrij heeft.'] },
    gym: { body: ['De meeste ochtenden. Discipline wint het altijd van motivatie, en dat werkte net zo goed voor certificaten als voor krachttraining.'] },
    dance: { body: ['Ik dans ontzettend graag salsa en bachata. Het draait allemaal om timing, je partner aanvoelen en leiden zonder te forceren, en eerlijk gezegd is dat niet zo heel anders dan een klantgesprek leiden. Blijf even op de dansvloer staan, de muziek is van mij.'] },
    race: { title: 'Racebaan', body: ['Met dit ding rijden werd uiteindelijk mijn favoriete deel van het bouwen, dus hier is een baan. Rijd over de geblokte lijn om de klok te starten, ga helemaal rond en probeer je beste ronde te verbeteren (wordt op dit apparaat bewaard).'] },
  },
};

export const LANG = { en, es, nl };
export const LANG_NAMES = { en: 'EN', es: 'ES', nl: 'NL' };

// Deep merge so es/nl only need the strings that differ.
function merge(base, over) {
  if (Array.isArray(base)) return base.map((b, i) => (over && over[i] !== undefined ? merge(b, over[i]) : b));
  if (base && typeof base === 'object') {
    const out = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(over || {})])) out[k] = merge(base[k], over ? over[k] : undefined);
    return out;
  }
  return over !== undefined ? over : base;
}
const cache = {};
export function pack(code) {
  return (cache[code] ||= code === 'en' ? en : merge(en, LANG[code]));
}
export function pickLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANG[q]) return q;
    const s = localStorage.getItem('dan.lang');
    if (s && LANG[s]) return s;
  } catch {}
  const n = (navigator.language || 'en').slice(0, 2);
  return LANG[n] ? n : 'en';
}
export function saveLang(code) { try { localStorage.setItem('dan.lang', code); } catch {} }

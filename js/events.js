/**
 * ZENTRIX 2026 - Central Event Management System & Data Registry
 * The Kavery Engineering College (Autonomous)
 * Departments of CSE, IT & AI & DS
 * 
 * NOTE FOR ORGANIZERS:
 * All event parameters (rules, venues, event times, team sizes, descriptions) below are fully configurable.
 * Organizers can freely modify objects in the SYMPOSIUM_EVENTS array to adjust event requirements.
 */

const SYMPOSIUM_EVENTS = [
  {
    id: 'startup-spark',
    name: 'STARTUP SPARK',
    displayLabel: 'PPT',
    number: '01',
    tagline: 'Pitch your ideas. Ignite the future.',
    description: 'Present disruptive business models, innovative prototype concepts, and tech startup pitches before expert judges.',
    type: 'TECHNICAL',
    department_code: 'CSE / IT / AI&DS',
    teamBased: true,
    minTeamMembers: 1,
    maxTeamMembers: 3,
    venue: 'Seminar Hall A',
    eventTime: '10:30 AM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
    rules: [
      'Team Size: 1 to 3 members',
      'Abstract & Slide Deck (Max 10 slides) presented on spot',
      '7 minutes presentation + 3 minutes Q&A with judges',
      'Judged on innovation, market feasibility, and presentation clarity'
    ]
  },
  {
    id: 'project-expo',
    name: 'PROJECT EXPO',
    number: '02',
    tagline: 'Innovate. Build. Exhibit.',
    description: 'Demonstrate working hardware, software, or IoT prototypes developed during your academic journey to win top honours.',
    type: 'TECHNICAL',
    department_code: 'CSE / IT / AI&DS',
    teamBased: true,
    minTeamMembers: 1,
    maxTeamMembers: 3,
    venue: 'Main Tech Lab',
    eventTime: '11:00 AM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`,
    rules: [
      'Team Size: 1 to 3 members',
      'Live working prototype demonstration required',
      'Bring own laptops/hardware; power extension boards provided',
      'Evaluated on technical complexity, functionality, and execution'
    ]
  },
  {
    id: 'bug-hunters',
    name: 'BUG HUNTERS',
    number: '03',
    tagline: 'Find the bugs. Fix the world.',
    description: 'High-speed debugging challenge. Diagnose memory leaks, syntax errors, and logic flaws in code snippets across C, C++, Java, and Python.',
    type: 'TECHNICAL',
    department_code: 'CSE / IT',
    teamBased: false,
    minTeamMembers: 1,
    maxTeamMembers: 1,
    venue: 'Computer Lab 1',
    eventTime: '11:30 AM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>`,
    rules: [
      'Individual participation only',
      'Round 1: Code analysis quiz (20 mins)',
      'Round 2: Live code debugging terminal challenge (30 mins)',
      'Languages supported: C, C++, Java, Python'
    ]
  },
  {
    id: 'prompt-master',
    name: 'PROMPT MASTER',
    number: '04',
    tagline: 'Think smart. Prompt sharp.',
    description: 'Craft precise generative AI prompts to generate targeted code, complex images, and technical solutions against live benchmarks.',
    type: 'TECHNICAL',
    department_code: 'AI & DS / IT',
    teamBased: false,
    minTeamMembers: 1,
    maxTeamMembers: 1,
    venue: 'AI Research Lab',
    eventTime: '01:30 PM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>`,
    rules: [
      'Individual entry',
      'Access provided to standard LLM playground environments',
      'Round 1: Text-to-Image precision target matching',
      'Round 2: AI Code Generation & Refactoring prompt challenge'
    ]
  },
  {
    id: 'cinespark',
    name: 'CINESPARK',
    displayLabel: 'SHORT FILM',
    number: '05',
    tagline: 'Lights. Camera. Action!',
    description: 'Short film and cinematic storytelling contest showcasing campus creativity, direction, cinematography, and editing skills.',
    type: 'NON_TECHNICAL',
    department_code: 'ALL DEPARTMENTS',
    teamBased: true,
    minTeamMembers: 1,
    maxTeamMembers: 3,
    venue: 'Auditorium',
    eventTime: '02:00 PM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>`,
    rules: [
      'Team Size: 1 to 3 members',
      'Film duration: 3 to 10 minutes (HD MP4 format)',
      'Must be original work; copyright audio must be credited',
      'Judged on screenplay, direction, sound design, and editing'
    ]
  },
  {
    id: 'meme-creation',
    name: 'MEME CREATION',
    number: '06',
    tagline: 'Create it. Share it. Rule it!',
    description: 'Unleash your humor and tech satire. Design original memes on engineering life, coding struggles, and modern tech trends.',
    type: 'NON_TECHNICAL',
    department_code: 'ALL DEPARTMENTS',
    teamBased: false,
    minTeamMembers: 1,
    maxTeamMembers: 1,
    venue: 'CAD Lab',
    eventTime: '02:30 PM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    rules: [
      'Individual entry',
      'Theme announced on spot',
      'Time duration: 45 minutes',
      'No offensive or personal targeting allowed'
    ]
  },
  {
    id: 'logo-hunting',
    name: 'LOGO HUNTING',
    number: '07',
    tagline: 'Design the identity. Define the brand.',
    description: 'Branding and logo design challenge. Identify hidden tech corporate logos or craft new visual identities for futuristic products.',
    type: 'NON_TECHNICAL',
    department_code: 'ALL DEPARTMENTS',
    teamBased: true,
    minTeamMembers: 1,
    maxTeamMembers: 3,
    venue: 'Web Lab 2',
    eventTime: '03:00 PM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    rules: [
      'Team Size: 1 to 3 members',
      'Round 1: Tech Brand Logo Identification Quiz',
      'Round 2: On-spot vector logo creation challenge',
      'Judged on creativity, typography, and visual brand identity'
    ]
  },
  {
    id: 'video-quiz',
    name: 'VIDEO QUIZ',
    number: '08',
    tagline: 'Watch. Think. Answer. Win!',
    description: 'Visual observation and tech trivia quiz based on fast-paced video clips, technical inventions, and science history.',
    type: 'NON_TECHNICAL',
    department_code: 'ALL DEPARTMENTS',
    teamBased: true,
    minTeamMembers: 1,
    maxTeamMembers: 3,
    venue: 'Seminar Hall B',
    eventTime: '03:30 PM',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`,
    rules: [
      'Team Size: 1 to 3 members',
      'Video clips played on main hall screen',
      'Round 1: Visual observation & recall test',
      'Round 2: Rapid buzzer round'
    ]
  }
];

// Expose globally
window.SYMPOSIUM_EVENTS = SYMPOSIUM_EVENTS;

/**
 * Get Event By ID or Name Helper
 */
function getEventById(eventId) {
  if (!eventId) return null;
  const clean = decodeURIComponent(eventId).toLowerCase().trim();
  return SYMPOSIUM_EVENTS.find(e => 
    e.id.toLowerCase() === clean || 
    e.name.toLowerCase() === clean ||
    e.id.replace(/-/g, '').toLowerCase() === clean.replace(/[^a-z0-9]/g, '')
  ) || null;
}
window.getEventById = getEventById;

/**
 * Render homepage events dynamically
 */
function renderHomepageEvents() {
  const container = document.querySelector('.events-8-grid');
  if (!container) return;

  container.innerHTML = SYMPOSIUM_EVENTS.map(event => `
    <div class="event-8-card" id="card-${event.id}">
      <span class="event-number">${event.number}</span>
      <div class="event-icon-box">
        ${event.icon}
      </div>
      <h3 class="event-8-title">${escapeHtml(event.name)}${event.displayLabel ? ` <span class="event-format-label">${escapeHtml(event.displayLabel)}</span>` : ''}</h3>
      <p class="event-8-tagline">${escapeHtml(event.tagline)}</p>
      <p class="event-8-desc">${escapeHtml(event.description)}</p>
      <a href="register.html?event=${event.id}" class="btn btn-primary btn-sm">Register Now &rarr;</a>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomepageEvents();
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

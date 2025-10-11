<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Solace • TASK Assistant</title>

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23ff8a00'/%3E%3Ctext x='8' y='12' font-size='10' text-anchor='middle' fill='white'%3ES%3C/text%3E%3C/svg%3E">

  <!-- IMPORTANT: compiled Tailwind output (we will build /styles.css in deploy) -->
  <link rel="stylesheet" href="/styles.css">

  <style>
    :root { --brand:#ff8a00; --brand-light:#ffd088; }

    .custom-scrollbar::-webkit-scrollbar{width:6px}
    .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
    .custom-scrollbar::-webkit-scrollbar-thumb{background:#4a5568;border-radius:3px}
    .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#718096}

    @media (prefers-reduced-motion: reduce){
      .animate-spin,.animate-bounce,.transition-all{transition:none!important}
    }
    .sparkle{
      background:conic-gradient(from 0deg,var(--brand) 0%,var(--brand-light) 25%,transparent 40%,transparent 60%,var(--brand-light) 75%,var(--brand) 100%);
      filter:blur(14px) saturate(1.2)
    }
    .composer-shell{
      position:sticky;
      bottom:0;
      background:linear-gradient(to top,rgba(255,255,255,0.9),rgba(255,255,255,0))
    }
    .dark .composer-shell{
      background:linear-gradient(to top,rgba(15,23,42,0.95),rgba(15,23,42,0))
    }
    .history-item-actions{opacity:0;transition:opacity .2s ease-in-out}
    .history-item:hover .history-item-actions{opacity:1}
    .linklike{color:#3b82f6;text-decoration:underline}
    .dark .linklike{color:#93c5fd}
    .prose{color:inherit}
    .prose strong{color:inherit}
    .disabled:disabled{opacity:.6;cursor:not-allowed}
  </style>
</head>
<body class="bg-gray-100 dark:bg-[#0b1220] text-gray-900 dark:text-gray-100 font-sans antialiased">

  <!-- Splash (ONLY Start + Theme + Language) -->
  <div id="splash" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
    <div class="w-full max-w-md p-8 text-center bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1f2937] relative">
      <!-- Theme toggle -->
      <button id="themeToggleSplash" class="absolute top-4 right-4 p-2 rounded-full border border-gray-200 dark:border-[#1f2937]" title="Toggle theme">
        <svg id="themeIconSplash" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
      </button>

      <!-- Language -->
      <div class="absolute top-4 left-4">
        <label for="languageSelector" class="sr-only">Language</label>
        <select id="languageSelector" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-[#1f2937] rounded-md p-1 text-sm">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ht">Kreyòl Ayisyen</option>
        </select>
      </div>

      <div class="relative w-24 h-24 mx-auto mb-6">
        <div class="absolute inset-[-16px] rounded-full sparkle animate-spin [animation-duration:4s]"></div>
        <div class="relative z-10 flex items-center justify-center w-24 h-24 text-5xl font-black text-black bg-brand rounded-2xl shadow-lg">S</div>
      </div>

      <h1 id="splashTitle" class="text-3xl font-extrabold">Solace</h1>
      <p id="splashSubtitle" class="mt-2 text-gray-600 dark:text-[#9aa4b2]">Your guide to career and community resources.</p>

      <div class="mt-8">
        <button id="start" class="w-full px-6 py-3 text-lg font-semibold text-black bg-brand rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand dark:focus:ring-offset-[#0f172a]">Start</button>
      </div>
    </div>
  </div>

  <!-- App Shell -->
  <div id="app" class="hidden h-screen w-screen">

    <!-- FIXED Left Sidebar (ChatGPT-style) -->
    <aside class="fixed left-0 top-0 z-40 hidden h-screen w-[280px] lg:flex flex-col bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-[#1f2937]">
      <div class="flex items-center gap-3 p-3">
        <div class="relative w-10 h-10">
          <div class="absolute inset-[-8px] rounded-full sparkle"></div>
          <div class="relative z-10 flex items-center justify-center w-10 h-10 text-xl font-bold text-black bg-brand rounded-lg">S</div>
        </div>
        <span class="text-xl font-semibold">Solace</span>
      </div>

      <button id="newChat" class="mx-3 flex items-center justify-between w-auto p-3 mt-2 text-left bg-gray-100 rounded-lg dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
        <span>New Chat</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
      </button>

      <!-- Quick Actions (links live ONLY here) -->
      <div class="px-3 mt-4">
        <h3 class="px-1 text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h3>
        <div id="quickActionsContainer" class="mt-2 space-y-2"></div>
      </div>

      <div class="mt-4 flex-1 overflow-y-auto custom-scrollbar px-3">
        <h3 class="px-1 text-sm font-semibold text-gray-500">Recent</h3>
        <div id="historyContainer" class="mt-2 space-y-1"></div>
      </div>

      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <button id="themeToggleApp" class="flex items-center w-full gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg id="themeIconApp" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <span id="themeTextApp" class="text-sm font-medium">Dark Mode</span>
        </button>
      </div>
    </aside>

    <!-- MAIN (pushed right of fixed sidebar) -->
    <main class="relative flex flex-col h-screen lg:ml-[280px] bg-gray-100 dark:bg-[#0b1220]">
      <!-- Mobile header -->
      <header class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#1f2937] lg:hidden">
        <div class="flex items-center gap-3">
          <div class="relative w-8 h-8">
            <div class="absolute inset-[-6px] rounded-full sparkle"></div>
            <div class="relative z-10 flex items-center justify-center w-8 h-8 text-lg font-bold text-black bg-brand rounded-md">S</div>
          </div>
          <span class="text-lg font-semibold">Solace</span>
        </div>
        <button id="menuBtn" class="p-2 rounded-md lg:hidden" title="Menu">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
        </button>
      </header>

      <!-- Chat scroll region -->
      <div id="chat" class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex">
        <div id="chatBody" class="w-full max-w-3xl mx-auto">
          <div id="welcomeScreen" class="flex flex-col items-center justify-center h-full text-center">
            <div class="relative w-20 h-20 mx-auto mb-4">
              <div class="absolute inset-[-12px] rounded-full sparkle"></div>
              <div class="relative z-10 flex items-center justify-center w-20 h-20 text-4xl font-black text-black bg-brand rounded-2xl shadow-lg">S</div>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200">How can I help you today?</h1>
          </div>
        </div>
      </div>

      <!-- Composer (sticky) -->
      <div class="composer-shell px-4 pb-4 md:px-6 md:pb-6">
        <div id="suggestions" class="flex flex-wrap gap-2 mb-3"></div>
        <form id="composer" class="relative" autocomplete="off">
          <textarea id="input" class="w-full p-4 pr-32 text-base bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-[#1f2937] rounded-xl resize-none focus:ring-2 focus:ring-brand focus:outline-none" placeholder="Type your question…" rows="1"></textarea>
          <div class="absolute bottom-2.5 right-3 flex items-center gap-2">
            <button id="send" type="submit" class="p-2 text-white bg-brand rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>
              <svg class="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
            </button>
          </div>
        </form>
        <div id="status" class="mt-2 text-sm text-center text-gray-500"></div>

        <div class="mt-3 text-xs text-center text-gray-500 dark:text-gray-400 space-y-1.5">
          <p><span class="font-semibold">Disclaimer:</span> This AI assistant can make mistakes. Please verify important information.</p>
          <div class="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <p><span class="font-semibold">Crisis?</span> Call/Text <a href="tel:988" class="linklike">988</a></p>
            <p><span class="font-semibold">Emergencies:</span> <a href="tel:911" class="linklike">911</a></p>
            <p><span class="font-semibold">Appointments:</span> <a href="tel:+16093371624" class="linklike">609-337-1624</a></p>
          </div>
        </div>
      </div>
    </main>

    <!-- Mobile slide-over -->
    <div id="mobileMenu" class="fixed inset-0 z-40 hidden bg-black bg-opacity-50 lg:hidden">
      <div class="fixed top-0 left-0 flex flex-col w-64 h-full max-w-xs p-3 bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-[#1f2937]">
        <div class="flex items-center justify-between">
          <span class="text-xl font-semibold">Menu</span>
          <button id="closeMenuBtn" class="p-2 rounded-md" aria-label="Close">&times;</button>
        </div>
        <button id="newChatMobile" class="flex items-center justify-between w-full p-3 mt-6 text-left bg-gray-100 rounded-lg dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
          <span>New Chat</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        </button>

        <div class="px-2 mt-6">
          <h3 class="px-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h3>
          <div id="quickActionsContainerMobile" class="mt-2 space-y-1"></div>
        </div>

        <div class="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <h3 class="px-2 text-sm font-semibold text-gray-500">Recent</h3>
          <div id="historyContainerMobile" class="mt-2 space-y-1"></div>
        </div>

        <div class="p-2 border-t border-gray-200 dark:border-gray-700">
          <button id="themeToggleMobile" class="flex items-center w-full gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg id="themeIconMobile" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            <span id="themeTextMobile" class="text-sm font-medium">Dark Mode</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete modal -->
    <div id="deleteModal" class="fixed inset-0 z-50 items-center justify-center hidden bg-black bg-opacity-50">
      <div class="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 class="text-lg font-bold">Delete Chat?</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">This will permanently delete the chat history.</p>
        <div class="mt-6 flex justify-end gap-3">
          <button id="cancelDelete" class="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button id="confirmDelete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  </div>

<script type="module">
/* ---------------- Constants & Config ---------------- */
const ENGAGE = {
  appointment: "https://bycell.co/ddncs",
  jobOpenings: "https://bycell.co/ddmtq",
  trainings:   "https://bycell.co/ddmtn",
  communityResources: "https://bycell.co/ddmua"
};

const SYSTEM_PROMPT = `You are Solace, a friendly, empathetic, and professional career guide for Task Employment Services. Your primary goal is to provide clear, actionable advice on employment topics (resume, interviews, job search, career development). Be encouraging and break complex topics into simple steps. Use markdown (bold, bullets) for readability. If the user asks for official actions (apply, appointments, forms), guide them to the Engage by Cell portal. When users mention crisis or self-harm, share 988 immediately. When users are frustrated, apologize empathetically and offer options. Do NOT invent URLs or contacts.

When asked about trainings, jobs, resources, or events, first try to read them from the server context (API endpoints). If there’s an error, clearly say so and provide the Engage by Cell link as fallback.`;

// If the UI is hosted on the same Vercel project/domain, use ''.
// If embedded elsewhere, set this to your deployed base to call your APIs.
const DEPLOY_BASE = 'https://task-assistant-xi.vercel.app';
const ON_SAME_SITE = typeof location !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname.endsWith('task-assistant-xi.vercel.app'));
const API_BASE = ON_SAME_SITE ? '' : DEPLOY_BASE;
const api = (path) => `${API_BASE}${path}`;

/* ---------------- Theme ---------------- */
const sunIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 0 0 1 8 0z"></path></svg>`;
const moonIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  const isDark = theme === 'dark';
  const themeIconSplash = document.getElementById('themeIconSplash');
  if (themeIconSplash) themeIconSplash.innerHTML = isDark ? sunIcon : moonIcon;

  const themeIconApp = document.getElementById('themeIconApp');
  const themeTextApp = document.getElementById('themeTextApp');
  if (themeIconApp && themeTextApp) {
    themeIconApp.innerHTML = isDark ? sunIcon : moonIcon;
    themeTextApp.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
  const themeIconMobile = document.getElementById('themeIconMobile');
  const themeTextMobile = document.getElementById('themeTextMobile');
  if (themeIconMobile && themeTextMobile) {
    themeIconMobile.innerHTML = isDark ? sunIcon : moonIcon;
    themeTextMobile.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
}
function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
}

/* ---------------- Language ---------------- */
function setLanguage(lang) {
  const code = (lang || 'en').slice(0,2).toLowerCase();
  const normalized = ['en','es','ht'].includes(code) ? code : 'en';
  localStorage.setItem('lang', normalized);
  document.documentElement.setAttribute('lang', normalized);

  const strings = {
    en: { title: 'Solace', subtitle: 'Your guide to career and community resources.', start: 'Start' },
    es: { title: 'Solace', subtitle: 'Su guía de recursos profesionales y comunitarios.', start: 'Empezar' },
    ht: { title: 'Solace', subtitle: 'Gid ou pou karyè ak resous kominotè yo.', start: 'Kòmanse' }
  }[normalized];

  const splashTitle = document.getElementById('splashTitle');
  const splashSubtitle = document.getElementById('splashSubtitle');
  const startButton = document.getElementById('start');
  if (splashTitle) splashTitle.textContent = strings.title;
  if (splashSubtitle) splashSubtitle.textContent = strings.subtitle;
  if (startButton) startButton.textContent = strings.start;

  const selector = document.getElementById('languageSelector');
  if (selector && selector.value !== normalized) selector.value = normalized;
}

/* ---------------- State ---------------- */
let currentChatId = null;
let allChats = {};
let chatToDelete = null;

/* ---------------- Helpers ---------------- */
function autosize() {
  const i=document.getElementById('input');
  if(!i) return;
  i.style.height='auto';
  i.style.height=i.scrollHeight+'px';
}
function updateSendState() {
  const i=document.getElementById('input'), s=document.getElementById('send');
  if (!i || !s) return;
  const hasText = i.value.trim().length > 0;
  s.disabled = !hasText;
  s.setAttribute('aria-disabled', String(!hasText));
}
function saveChats() { localStorage.setItem('allChats', JSON.stringify(allChats)); }
function loadChats() { const saved = localStorage.getItem('allChats'); if(saved) allChats = JSON.parse(saved); renderHistory(); }
function startNewChat() {
  currentChatId = `chat_${Date.now()}`;
  allChats[currentChatId] = { id: currentChatId, title: "New Chat", history: [] };
  saveChats(); renderHistory(); renderChat();
}
function addMessageToHistory(role, text) {
  if(!currentChatId || !allChats[currentChatId]) return;
  allChats[currentChatId].history.push({ role, text });
  saveChats();
}
function updateChatTitle(prompt) {
  const c = allChats[currentChatId];
  if (c && c.title === 'New Chat' && prompt) {
    c.title = prompt.split(' ').slice(0, 6).join(' ');
    saveChats(); renderHistory();
  }
}
function setStatus(msg, isError=false) {
  const el = document.getElementById('status');
  if(!el) return;
  el.textContent = msg;
  el.className = `mt-2 text-sm text-center ${isError ? 'text-red-500' : 'text-gray-500'}`;
}
function scrollToBottom(instant=false) {
  const chat = document.getElementById('chat');
  if(chat) chat.scrollTo({ top: chat.scrollHeight, behavior: instant ? 'instant' : 'smooth' });
}

/* ---------------- Smart Render ---------------- */
function esc(s){ return s.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function renderSmart(text){
  let html = esc(text || '');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a class="linklike" href="$2" target="_blank" rel="noopener noreferrer">$1</a>`);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${p}</p>`).join('');
  return html || '<p></p>';
}
function bubbleMe(text, doScroll=true) {
  const chatBody = document.getElementById('chatBody'); if(!chatBody) return;
  document.getElementById('welcomeScreen')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'mb-3 flex justify-end';
  wrap.innerHTML = `<div class="max-w-[85%] rounded-xl bg-brand text-black px-4 py-2 shadow prose dark:prose-invert">${renderSmart(text)}</div>`;
  chatBody.appendChild(wrap);
  if(doScroll) scrollToBottom();
}
function bubbleBot(text, doScroll=true) {
  const chatBody = document.getElementById('chatBody'); if(!chatBody) return;
  document.getElementById('welcomeScreen')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'group mb-3 flex justify-start';
  wrap.innerHTML = `<div class="max-w-[85%] rounded-xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#1f2937] px-4 py-2 shadow prose dark:prose-invert prose-p:my-2">${renderSmart(text)}</div>`;
  chatBody.appendChild(wrap);
  if(doScroll) scrollToBottom();
}
function typingIndicator() {
  const i=document.createElement('div'); i.className='flex items-center gap-2 ml-11';
  i.innerHTML=`<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>`;
  return i;
}

/* ---------------- Quick Actions ---------------- */
function renderQuickActions() {
  const actions = [
    { label: 'Schedule Appointment', key: 'appointment', icon: '📅', href: ENGAGE.appointment },
    { label: 'Find Jobs',           key: 'jobOpenings', icon: '🔎', href: ENGAGE.jobOpenings },
    { label: 'Training Programs',   key: 'trainings',   icon: '🎓', href: ENGAGE.trainings },
    { label: 'Community Resources', key: 'communityResources', icon: '🏥', href: ENGAGE.communityResources }
  ];
  const renderInto = (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    actions.forEach(({label, key, icon, href}) => {
      const a = document.createElement('a');
      a.href = href; a.target='_blank'; a.rel='noopener noreferrer';
      a.className = 'flex items-center justify-between w-full px-3 py-2 bg-gray-100 rounded-lg dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700';
      a.innerHTML = `<span class="flex items-center gap-2"><span>${icon}</span><span>${label}</span></span><svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
      el.appendChild(a);
    });
  };
  renderInto('quickActionsContainer');
  renderInto('quickActionsContainerMobile');
}

/* ---------------- History Renderers ---------------- */
function renderHistory() {
  const container = document.getElementById('historyContainer');
  const mobile    = document.getElementById('historyContainerMobile');
  const items = Object.values(allChats).sort((a,b) => (b.id||'').localeCompare(a.id||''));
  const draw = (el) => {
    if (!el) return;
    el.innerHTML = '';
    items.forEach(chat => {
      const row = document.createElement('div');
      row.className = `history-item group flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${chat.id === currentChatId ? 'bg-brand/20' : ''}`;
      row.innerHTML = `
        <button class="text-left flex-1 truncate" title="${chat.title}">${chat.title}</button>
        <div class="history-item-actions flex gap-2 opacity-0 group-hover:opacity-100">
          <button class="rename-btn text-xs underline">Rename</button>
          <button class="delete-btn text-xs text-red-600 underline">Delete</button>
        </div>`;
      row.querySelector('button.truncate')?.addEventListener('click', () => { currentChatId=chat.id; renderChat(); renderHistory(); });
      row.querySelector('.rename-btn')?.addEventListener('click', () => {
        const newTitle = prompt('Rename chat:', chat.title);
        if (newTitle) { chat.title=newTitle; saveChats(); renderHistory(); }
      });
      row.querySelector('.delete-btn')?.addEventListener('click', () => {
        chatToDelete = chat.id;
        const m = document.getElementById('deleteModal');
        if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
      });
      el.appendChild(row);
    });
  };
  draw(container);
  draw(mobile);
}
function renderChat() {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;
  chatBody.innerHTML = '';
  const history = (currentChatId && allChats[currentChatId]) ? allChats[currentChatId].history : [];
  if (!history || history.length === 0) {
    const welcome = document.createElement('div');
    welcome.id = 'welcomeScreen';
    welcome.className = 'flex flex-col items-center justify-center h-full text-center';
    welcome.innerHTML = `
      <div class="relative w-20 h-20 mx-auto mb-4">
        <div class="absolute inset-[-12px] rounded-full sparkle"></div>
        <div class="relative z-10 flex items-center justify-center w-20 h-20 text-4xl font-black text-black bg-brand rounded-2xl shadow-lg">S</div>
      </div>
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200">How can I help you today?</h1>`;
    chatBody.appendChild(welcome);
    return;
  }
  history.forEach(msg => {
    if (msg.role === 'user') bubbleMe(msg.text, false);
    else bubbleBot(msg.text, false);
  });
  scrollToBottom(true);
}

/* ---------------- AI & Data Fetchers ---------------- */
async function safeGetJSON(url) {
  try {
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const j = await r.json();
    return (typeof j === 'object' && j) ? j : { ok:false, error:'invalid json' };
  } catch (e) { return { ok:false, error: e?.message || 'network' }; }
}
async function getAI(prompt) {
  const body = JSON.stringify({ prompt, systemPrompt: SYSTEM_PROMPT });
  const r = await fetch(api('/api/ai'), { method:'POST', headers:{'Content-Type':'application/json'}, body });
  if (!r.ok) throw new Error(`AI ${r.status}`);
  const j = await r.json();
  return j?.reply || j?.text || 'Sorry, I could not generate a response.';
}

/* ---------------- Smart Router ---------------- */
async function getSmartResponse(prompt) {
  const p = (prompt||'').toLowerCase();

  const mentions = (...words)=> words.some(w => p.includes(w));

  if (mentions('training','trainings','class','classes','forklift','certification','culinary')) {
    setStatus('Checking our training schedule…');
    const result = await safeGetJSON(api('/api/trainings'));
    let context = "There are currently no training programs scheduled.";
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      context = "Here are current training programs:\n\n" + result.data.map(t=>(
        `• **${t.name||'Program'}** — ${t.description||'Details soon.'}\n   Schedule: ${t.schedule||'TBA'}\n   Next Start: ${t.next_start_date ? new Date(t.next_start_date).toLocaleDateString() : 'TBA'}`
      )).join('\n\n');
    } else if (!result.ok) {
      context = `Couldn’t load the live schedule (reason: ${result.error}). Please check the Engage by Cell portal: ${ENGAGE.trainings}`;
    }
    const finalPrompt = `CONTEXT:\n${context}\n\nAnswer the user's question based ONLY on the context: "${prompt}"`;
    return getAI(finalPrompt);
  }

  if (mentions('job','jobs','opening','hiring','apply')) {
    setStatus('Checking featured jobs…');
    const result = await safeGetJSON(api('/api/jobs'));
    let context = "There are currently no featured jobs from our partners.";
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      context = "Here are featured jobs:\n\n" + result.data.map(job=>(
        `• **${job.title}** at ${job.company || '—'}\n   ${job.apply_link ? `[Apply Here](${job.apply_link})` : ''}`
      )).join('\n');
    } else if (!result.ok) {
      context = `Couldn’t load featured jobs (reason: ${result.error}). Please check the Engage by Cell portal: ${ENGAGE.jobOpenings}`;
    }
    const finalPrompt = `Present the featured jobs from the context. Then politely ask if they want a broader search.\n\nCONTEXT:\n${context}\n\nUSER'S QUESTION: "${prompt}"`;
    return getAI(finalPrompt);
  }

  if (mentions('resource','resources','food','pantry','housing','shelter','legal','support')) {
    setStatus('Looking up community resources…');
    const result = await safeGetJSON(api('/api/resources'));
    let context = "No community resources are listed right now.";
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      context = "Community resources:\n\n" + result.data.map(r=>(
        `• **${r.name}** (${r.provider || '—'}) — ${r.description || 'Details soon.'}\n   Website: ${r.website ? r.website : 'N/A'}`
      )).join('\n\n');
    } else if (!result.ok) {
      context = `Couldn’t load resources (reason: ${result.error}). Please check the Engage by Cell portal: ${ENGAGE.communityResources}`;
    }
    const finalPrompt = `CONTEXT:\n${context}\n\nAnswer the user's question about resources based ONLY on the context: "${prompt}"`;
    return getAI(finalPrompt);
  }

  if (mentions('event','events','job fair','workshop')) {
    setStatus('Checking for upcoming events…');
    const result = await safeGetJSON(api('/api/events'));
    let context = "There are currently no events scheduled.";
    if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
      context = "Upcoming events:\n\n" + result.data.map(e=>(
        `• **${e.name}** — ${e.event_date ? new Date(e.event_date).toLocaleString() : 'TBA'}`
      )).join('\n');
    } else if (!result.ok) {
      context = `Couldn’t load events (reason: ${result.error}). Please check the Engage by Cell portal: ${ENGAGE.appointment}`;
    }
    const finalPrompt = `CONTEXT:\n${context}\n\nAnswer the user's question about events based ONLY on the context: "${prompt}"`;
    return getAI(finalPrompt);
  }

  // Default → pass through to /api/ai
  return getAI(prompt);
}

/* ---------------- DOM Ready ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Theme boot
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Language boot
  const languageSelector = document.getElementById('languageSelector');
  const savedLang = localStorage.getItem('lang') || (navigator.language || 'en');
  setLanguage(savedLang);
  if (languageSelector) {
    const normalized = savedLang.slice(0,2).toLowerCase();
    languageSelector.value = ['en','es','ht'].includes(normalized) ? normalized : 'en';
    languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));
  }

  // Elements
  const splash = document.getElementById('splash'), app = document.getElementById('app');
  const startBtn = document.getElementById('start');
  const chatBody = document.getElementById('chatBody');
  const form = document.getElementById('composer'), input = document.getElementById('input'), sendBtn = document.getElementById('send');
  const newChatBtn = document.getElementById('newChat'), newChatMobileBtn = document.getElementById('newChatMobile');
  const menuBtn = document.getElementById('menuBtn'), mobileMenu = document.getElementById('mobileMenu'), closeMenuBtn = document.getElementById('closeMenuBtn');
  const themeToggleSplash = document.getElementById('themeToggleSplash');
  const themeToggleApp = document.getElementById('themeToggleApp');
  const themeToggleMobile = document.getElementById('themeToggleMobile');
  const deleteModal = document.getElementById('deleteModal'), confirmDeleteBtn = document.getElementById('confirmDelete'), cancelDeleteBtn = document.getElementById('cancelDelete');

  // Splash → open app
  function openApp() {
    if (splash) splash.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    renderQuickActions();
    loadChats();
    if (Object.keys(allChats).length === 0) startNewChat();
    else renderChat();
    if (input) input.focus();

    // Optional: health ping (uses your server routes; no client Supabase)
    safeGetJSON(api('/api/trainings')).catch(()=>{});
  }
  if (startBtn) startBtn.addEventListener('click', openApp);

  // Theme toggles
  if (themeToggleSplash) themeToggleSplash.addEventListener('click', toggleTheme);
  if (themeToggleApp) themeToggleApp.addEventListener('click', toggleTheme);
  if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);

  // Mobile menu
  if (menuBtn) menuBtn.addEventListener('click', () => { if (mobileMenu) mobileMenu.classList.remove('hidden'); });
  if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => { if (mobileMenu) mobileMenu.classList.add('hidden'); });
  if (mobileMenu) mobileMenu.addEventListener('click', (e) => { if (e.target === mobileMenu) mobileMenu.classList.add('hidden'); });

  // New Chat
  if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
  if (newChatMobileBtn) newChatMobileBtn.addEventListener('click', () => { startNewChat(); if (mobileMenu) mobileMenu.classList.add('hidden'); });

  // Delete modal
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
    if (deleteModal) { deleteModal.classList.add('hidden'); deleteModal.classList.remove('flex'); }
    chatToDelete = null;
  });
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
    if (chatToDelete && allChats[chatToDelete]) {
      delete allChats[chatToDelete];
      saveChats();
      chatToDelete = null;
      if (deleteModal) { deleteModal.classList.add('hidden'); deleteModal.classList.remove('flex'); }
      if (!Object.keys(allChats).length) startNewChat(); else {
        // Load most recent chat
        const latest = Object.values(allChats).sort((a,b)=> (b.id||'').localeCompare(a.id||''))[0];
        currentChatId = latest.id;
        renderHistory(); renderChat();
      }
    }
  });

  // Composer
  function showChips(chips=[]) {
    const s = document.getElementById('suggestions');
    if (!s) return; s.innerHTML = '';
    chips.forEach(c=>{
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#1f2937] rounded-full text-sm hover:bg-gray-50';
      btn.textContent=c.text;
      btn.addEventListener('click', () => {
        if (!input) return;
        input.value = c.text;
        updateSendState(); input.focus();
      });
      s.appendChild(btn);
    });
  }
  showChips([
    { text: 'Help me with my resume' },
    { text: 'What jobs are open?' },
    { text: 'Any free training programs?' }
  ]);

  if (input) {
    ['input','change','keyup','paste'].forEach(ev => {
      input.addEventListener(ev, () => { updateSendState(); autosize(); });
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (form) form.requestSubmit(); }
    });
  }
  if (sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); if (form) form.requestSubmit(); });

  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = (input?.value || '').trim();
    if (!prompt) { updateSendState(); return; }

    if (!currentChatId || (allChats[currentChatId] && allChats[currentChatId].history.length === 0)) {
      if (!currentChatId) startNewChat();
      addMessageToHistory('assistant', "Hello! I'm Solace. How can I help you?");
      renderChat();
    }

    addMessageToHistory('user', prompt);
    bubbleMe(prompt);
    if (input) input.value = '';
    autosize();
    updateSendState();
    showChips([]);
    setStatus('Thinking…');
    const typing = typingIndicator();
    if (chatBody) chatBody.appendChild(typing);
    scrollToBottom();

    try {
      const respText = await getSmartResponse(prompt);
      typing?.remove();
      addMessageToHistory('assistant', respText);
      bubbleBot(respText);
      updateChatTitle(prompt);
      setStatus('');
    } catch (err) {
      console.error(err);
      typing?.remove();
      setStatus('Error contacting the service.', true);
      bubbleBot('Sorry — I could not reach the service. Please try again.');
    }
  });

  // If you want to auto-open app during dev, uncomment:
  // openApp();
});
</script>
</body>
</html>

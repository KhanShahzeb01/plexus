// ─── Banner ────────────────────────────────────────────────────────────
const BANNER_LINES = [
  "██████╗ ██╗     ███████╗██╗  ██╗██╗   ██╗███████╗",
  "██╔══██╗██║     ██╔════╝╚██╗██╔╝██║   ██║██╔════╝",
  "██████╔╝██║     █████╗   ╚███╔╝ ██║   ██║███████╗",
  "██╔═══╝ ██║     ██╔══╝   ██╔██╗ ██║   ██║╚════██║",
  "██║     ███████╗███████╗██╔╝ ██╗╚██████╔╝███████║",
  "╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝",
];
const bannerEl = document.getElementById('banner-art');

function renderBanner() {
  bannerEl.textContent = BANNER_LINES.join('\n');
}
renderBanner();

// ─── State ─────────────────────────────────────────────────────────────
const STATE_KEY = 'plexus_state';

const LEGACY_COLOR_MAP = {
  green: 'sage', default: 'sage', charm: 'dusk', dracula: 'heather',
  catppuccin: 'heather', paper: 'clay', linen: 'clay', slate: 'mist', hazel: 'clay',
};
const VALID_COLOR_SCHEMES = new Set(['sage', 'sea', 'dusk', 'clay', 'mist', 'heather']);

function migrateColorScheme(name) {
  if (name && VALID_COLOR_SCHEMES.has(name)) return name;
  return LEGACY_COLOR_MAP[name] || 'sage';
}

function migrateTheme(data) {
  const valid = new Set(['cli', 'codecli', 'cyber', 'fantasy', 'stellar', 'forest', 'hacker', 'minimal', 'nova', 'codex', 'crt']);
  if (data.theme === 'crt' || data.layout === 'crt') return 'crt';
  if (data.theme && valid.has(data.theme)) return data.theme;
  if (data.theme === 'cli' || data.theme === 'default') return 'cli';
  if (data.layout === 'default') return 'cli';
  return 'cli';
}

function defaultStateData() {
  return {
    apiKey: '', model: 'openai/gpt-oss-120b:free', systemPrompt: '', messages: [],
    mode: 'general', persona: 'none', planMode: false, fontSize: '14px', fontFamily: '',
    colorScheme: 'sage', theme: 'cli', temperature: 0.7, topP: 1.0,
    totalTokensIn: 0, totalTokensOut: 0, lifetimeTokensIn: 0, lifetimeTokensOut: 0,
    codeTheme: 'atom-one-dark',
    planMinQuestions: 3, planMaxQuestions: 14, planParallel: true, planQualityGate: true,
    researchParallel: false, researchQualityGate: false,
  };
}

function parseStateFromData(data) {
  return {
    apiKey: data.apiKey || '',
    model: data.model || 'openai/gpt-oss-120b:free',
    systemPrompt: data.systemPrompt || '',
    messages: Array.isArray(data.messages) ? data.messages : [],
    mode: data.mode || 'general',
    persona: data.persona || 'none',
    planMode: !!data.planMode,
    fontSize: data.fontSize || '14px',
    fontFamily: data.fontFamily || '',
    colorScheme: migrateColorScheme(data.colorScheme || data.theme),
    theme: migrateTheme(data),
    temperature: data.temperature ?? 0.7,
    topP: data.topP ?? 1.0,
    totalTokensIn: data.totalTokensIn || 0,
    totalTokensOut: data.totalTokensOut || 0,
    lifetimeTokensIn: data.lifetimeTokensIn || 0,
    lifetimeTokensOut: data.lifetimeTokensOut || 0,
    codeTheme: data.codeTheme || 'atom-one-dark',
    planMinQuestions: data.planMinQuestions ?? 3,
    planMaxQuestions: data.planMaxQuestions ?? 14,
    planParallel: data.planParallel !== false,
    planQualityGate: data.planQualityGate !== false,
    researchParallel: !!data.researchParallel,
    researchQualityGate: !!data.researchQualityGate,
  };
}

function buildStatePayload() {
  return {
    apiKey: state.apiKey,
    model: state.model,
    systemPrompt: state.systemPrompt,
    messages: state.messages,
    mode: state.mode || 'general',
    persona: state.persona || 'none',
    planMode: !!state.planMode,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    colorScheme: state.colorScheme || 'sage',
    theme: state.theme || 'cli',
    temperature: state.temperature ?? 0.7,
    topP: state.topP ?? 1.0,
    totalTokensIn: state.totalTokensIn || 0,
    totalTokensOut: state.totalTokensOut || 0,
    lifetimeTokensIn: state.lifetimeTokensIn || 0,
    lifetimeTokensOut: state.lifetimeTokensOut || 0,
    codeTheme: state.codeTheme || 'atom-one-dark',
    planMinQuestions: state.planMinQuestions ?? 3,
    planMaxQuestions: state.planMaxQuestions ?? 14,
    planParallel: state.planParallel !== false,
    planQualityGate: state.planQualityGate !== false,
    researchParallel: !!state.researchParallel,
    researchQualityGate: !!state.researchQualityGate,
  };
}

let saveChain = Promise.resolve();
async function persistAllAsync() {
  if (StorageCrypto.isEnabled() && !StorageCrypto.isUnlocked()) return;
  await StorageCrypto.writeJson(STATE_KEY, buildStatePayload());
  const store = loadSessionStore();
  store.sessions[store.activeId] = {
    name: store.sessions[store.activeId]?.name || getSessionName(state.messages),
    messages: state.messages,
    mode: state.mode,
    persona: state.persona,
    planMode: !!state.planMode,
    model: state.model,
    temperature: state.temperature,
    topP: state.topP,
    totalTokensIn: state.totalTokensIn,
    totalTokensOut: state.totalTokensOut,
    systemPrompt: state.systemPrompt,
    updatedAt: Date.now(),
  };
  sessionStoreCache = store;
  await StorageCrypto.writeJson(SESSION_KEY, store);
}

function saveState() {
  saveChain = saveChain.then(() => persistAllAsync()).catch(() => {});
}

// ─── Sessions ──────────────────────────────────────────────────────────
const SESSION_KEY = 'plexus_sessions';
let sessionStoreCache = { sessions: {}, activeId: 'default' };

function loadSessionStore() {
  return sessionStoreCache;
}

function saveSessionStore() {
  saveState();
}
function getSessionName(msgs) {
  for (const m of msgs) {
    if (m.role === 'user') {
      const text = (m.content || '').trim().replace(/\s+/g, ' ');
      if (!text) continue;
      const words = text.split(' ').filter(Boolean);
      if (!words.length) continue;
      const preview = words.slice(0, 6).join(' ');
      return preview.length > 42 ? preview.slice(0, 42).trim() + '…' : preview;
    }
  }
  return 'New Chat';
}

function getSessionDisplayName(session) {
  const fromMessages = getSessionName(session?.messages || []);
  if (fromMessages !== 'New Chat') return fromMessages;
  return session?.name || 'New Chat';
}
function loadSession(sessionId) {
  const store = loadSessionStore();
  const s = store.sessions[sessionId];
  if (!s) { newSession(); return; }
  // Save current session first
  saveSessionStore();
  // Load target session
  state.messages = s.messages || [];
  state.mode = s.mode || 'general';
  state.persona = s.persona || 'none';
  state.planMode = !!s.planMode;
  state.model = s.model || state.model;
  state.temperature = s.temperature ?? 0.7;
  state.topP = s.topP ?? 1.0;
  state.totalTokensIn = s.totalTokensIn || 0;
  state.totalTokensOut = s.totalTokensOut || 0;
  state.systemPrompt = s.systemPrompt || '';
  store.activeId = sessionId;
  sessionStoreCache = store;
  saveState();
  restoreMessages();
  renderSessionList();
  setMode(state.mode || 'general');
  setPersona(state.persona || 'none');
  updatePlanBadge();
  updateSidePanel();
}
function newSession() {
  saveSessionStore();
  const store = loadSessionStore();
  const id = 'sess_' + Date.now();
  store.sessions[id] = { name: 'New Chat', messages: [], mode: 'general', persona: 'none', planMode: false, model: state.model, temperature: 0.7, topP: 1.0, totalTokensIn: 0, totalTokensOut: 0, systemPrompt: '', updatedAt: Date.now() };
  store.activeId = id;
  sessionStoreCache = store;
  state.messages = [];
  state.planMode = false;
  state.totalTokensIn = 0;
  state.totalTokensOut = 0;
  saveState();
  restoreMessages();
  renderSessionList();
  updatePlanBadge();
}
function renderSessionList() {
  const el = document.getElementById('sp-sessions');
  if (!el) return;
  const store = loadSessionStore();
  const sorted = Object.entries(store.sessions).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  el.innerHTML = sorted.map(([id, s]) =>
    `<div class="sp-sess ${id === store.activeId ? 'active' : ''}" data-id="${id}">
      <span class="sp-sess-name">${escapeHtml(getSessionDisplayName(s))}</span>
      <span class="sp-sess-del" data-id="${id}">✕</span>
    </div>`
  ).join('');
  // Click to switch
  el.querySelectorAll('.sp-sess').forEach(d => {
    d.addEventListener('click', (e) => {
      if (e.target.classList.contains('sp-sess-del')) return;
      if (isStreaming) return;
      const id = d.dataset.id;
      if (id === store.activeId) return;
      loadSession(id);
    });
  });
  // Delete
  el.querySelectorAll('.sp-sess-del').forEach(d => {
    d.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = d.dataset.id;
      const store2 = loadSessionStore();
      if (Object.keys(store2.sessions).length <= 1) return;
      delete store2.sessions[id];
      if (store2.activeId === id) {
        const remaining = Object.keys(store2.sessions);
        store2.activeId = remaining[0];
      }
      sessionStoreCache = store2;
      if (store2.activeId === id) { /* already changed */ }
      // Reload if active was deleted
      if (state.sessionId === id) {
        const newStore = loadSessionStore();
        loadSession(newStore.activeId);
      } else {
        saveState();
        renderSessionList();
      }
    });
  });
}
let state = parseStateFromData(defaultStateData());
let appBootstrapped = false;
let isStreaming = false;
let abortController = null;
let autoScroll = true;
let lastQuery = '';

// ─── DOM refs ──────────────────────────────────────────────────────────
const chatEl = document.getElementById('chat');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const tipsEl = document.getElementById('tips');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsToggle = document.getElementById('settings-toggle');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const systemPromptInput = document.getElementById('system-prompt');
const settingsStatus = document.getElementById('settings-status');
const saveKeyBtn = document.getElementById('save-key-btn');
const clearKeyBtn = document.getElementById('clear-key-btn');
const settingsClose = document.getElementById('settings-close');
const clearChatBtn = document.getElementById('clear-chat-btn');
const exportChatBtn = document.getElementById('export-chat-btn');
const fontSizeSelect = document.getElementById('font-size-select');
const fontFamilySelect = document.getElementById('font-family-select');
const codeThemeSelect = document.getElementById('code-theme-select');
const hljsThemeLink = document.getElementById('hljs-theme');
const themeSelect = document.getElementById('theme-select');
const colorSelect = document.getElementById('color-select');
const planMinQuestionsInput = document.getElementById('plan-min-questions');
const planMaxQuestionsInput = document.getElementById('plan-max-questions');
const planParallelInput = document.getElementById('plan-parallel');
const planQualityGateInput = document.getElementById('plan-quality-gate');
const researchParallelInput = document.getElementById('research-parallel');
const researchQualityGateInput = document.getElementById('research-quality-gate');
const lockOverlay = document.getElementById('lock-overlay');
const lockPassphraseInput = document.getElementById('lock-passphrase');
const lockUnlockBtn = document.getElementById('lock-unlock-btn');
const lockStatus = document.getElementById('lock-status');
const encryptionStatusEl = document.getElementById('encryption-status');
const encryptionEnableFields = document.getElementById('encryption-enable-fields');
const encryptionManageFields = document.getElementById('encryption-manage-fields');
const encryptPassphraseInput = document.getElementById('encrypt-passphrase');
const encryptPassphraseConfirmInput = document.getElementById('encrypt-passphrase-confirm');
const enableEncryptionBtn = document.getElementById('enable-encryption-btn');
const changePassphraseOldInput = document.getElementById('change-passphrase-old');
const changePassphraseNewInput = document.getElementById('change-passphrase-new');
const changePassphraseConfirmInput = document.getElementById('change-passphrase-confirm');
const changePassphraseBtn = document.getElementById('change-passphrase-btn');
const lockNowBtn = document.getElementById('lock-now-btn');
const disableEncryptionBtn = document.getElementById('disable-encryption-btn');
const disablePassphraseInput = document.getElementById('disable-passphrase');
const statusModel = document.getElementById('status-model');
const statusTokens = document.getElementById('status-tokens');
const stopBtn = document.getElementById('stop-btn');
const fileBtn = document.getElementById('file-btn');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const newSessBtn = document.getElementById('sp-new-sess');
const spTemp = document.getElementById('sp-temp');
const spTempVal = document.getElementById('sp-temp-val');

function normalizePlanPipelineState() {
  let min = parseInt(state.planMinQuestions, 10);
  let max = parseInt(state.planMaxQuestions, 10);
  if (!Number.isFinite(min)) min = 3;
  if (!Number.isFinite(max)) max = 14;
  min = Math.max(1, Math.min(30, min));
  max = Math.max(3, Math.min(50, max));
  if (min > max) min = max;
  state.planMinQuestions = min;
  state.planMaxQuestions = max;
  state.planParallel = state.planParallel !== false;
  state.planQualityGate = state.planQualityGate !== false;
  state.researchParallel = !!state.researchParallel;
  state.researchQualityGate = !!state.researchQualityGate;
}

function getPlanModePipelineOptions(extra = {}) {
  normalizePlanPipelineState();
  return {
    parallel: state.planParallel !== false,
    qualityGate: state.planQualityGate !== false,
    ...extra,
  };
}

function describePlanPipelineMode() {
  normalizePlanPipelineState();
  const { min, max } = typeof getPlanQuestionBounds === 'function'
    ? getPlanQuestionBounds()
    : { min: state.planMinQuestions, max: state.planMaxQuestions };
  const parallel = state.planParallel !== false ? 'parallel' : 'sequential';
  const gate = state.planQualityGate !== false ? ' with a quality gate' : '';
  return `${min}–${max} sub-questions, ${parallel} answers${gate}`;
}

function syncPlanPipelineInputs() {
  normalizePlanPipelineState();
  if (planMinQuestionsInput) planMinQuestionsInput.value = state.planMinQuestions;
  if (planMaxQuestionsInput) planMaxQuestionsInput.value = state.planMaxQuestions;
  if (planParallelInput) planParallelInput.checked = state.planParallel !== false;
  if (planQualityGateInput) planQualityGateInput.checked = state.planQualityGate !== false;
  if (researchParallelInput) researchParallelInput.checked = !!state.researchParallel;
  if (researchQualityGateInput) researchQualityGateInput.checked = !!state.researchQualityGate;
}

function readPlanPipelineInputs() {
  if (planMinQuestionsInput) state.planMinQuestions = planMinQuestionsInput.value;
  if (planMaxQuestionsInput) state.planMaxQuestions = planMaxQuestionsInput.value;
  if (planParallelInput) state.planParallel = planParallelInput.checked;
  if (planQualityGateInput) state.planQualityGate = planQualityGateInput.checked;
  if (researchParallelInput) state.researchParallel = researchParallelInput.checked;
  if (researchQualityGateInput) state.researchQualityGate = researchQualityGateInput.checked;
  normalizePlanPipelineState();
  syncPlanPipelineInputs();
}

normalizePlanPipelineState();
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ─── Font settings ─────────────────────────────────────────────────────
function applyFontSettings() {
  const root = document.documentElement;
  const px = parseInt(state.fontSize) || 14;
  const defaultChat = "'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace";
  root.style.setProperty('--font-size', state.fontSize);
  root.style.setProperty('--panel-font-size', Math.max(10, px - 1) + 'px');
  root.style.setProperty('--chat-font', state.fontFamily || defaultChat);
}

const CODE_THEME_FILES = {
  'atom-one-dark': 'atom-one-dark',
  'github-dark': 'github-dark',
  'monokai': 'monokai',
  'night-owl': 'night-owl',
  'tokyo-night-dark': 'tokyo-night-dark',
  'atom-one-light': 'atom-one-light',
  'github': 'github',
  'vs': 'vs',
  'xcode': 'xcode',
};

function applyCodeTheme(themeId) {
  const file = CODE_THEME_FILES[themeId] || CODE_THEME_FILES['atom-one-dark'];
  state.codeTheme = themeId in CODE_THEME_FILES ? themeId : 'atom-one-dark';
  if (hljsThemeLink) {
    hljsThemeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${file}.min.css`;
  }
  if (codeThemeSelect && codeThemeSelect.value !== state.codeTheme) {
    codeThemeSelect.value = state.codeTheme;
  }
}

// ─── Accent colors (apply on top of any theme) ─────────────────────────
const ACCENT_COLORS = {
  sage: {
    label: 'Sage',
    accent: '#6b8f71', queryBorder: '#6b8f71', responseBorder: '#4a5f4e',
    accentDim: 'rgba(107,143,113,0.25)', focusBorder: '#6b8f71',
    focusBg: 'rgba(107,143,113,0.08)', queryBg: 'rgba(107,143,113,0.08)',
  },
  sea: {
    label: 'Sea',
    accent: '#5a8a8a', queryBorder: '#5a8a8a', responseBorder: '#3d5555',
    accentDim: 'rgba(90,138,138,0.25)', focusBorder: '#5a8a8a',
    focusBg: 'rgba(90,138,138,0.08)', queryBg: 'rgba(90,138,138,0.08)',
  },
  dusk: {
    label: 'Dusk',
    accent: '#8a7a9a', queryBorder: '#8a7a9a', responseBorder: '#5a5068',
    accentDim: 'rgba(138,122,154,0.25)', focusBorder: '#8a7a9a',
    focusBg: 'rgba(138,122,154,0.08)', queryBg: 'rgba(138,122,154,0.08)',
  },
  clay: {
    label: 'Clay',
    accent: '#9a8068', queryBorder: '#9a8068', responseBorder: '#6a5848',
    accentDim: 'rgba(154,128,104,0.25)', focusBorder: '#9a8068',
    focusBg: 'rgba(154,128,104,0.08)', queryBg: 'rgba(154,128,104,0.08)',
  },
  mist: {
    label: 'Mist',
    accent: '#6a8090', queryBorder: '#6a8090', responseBorder: '#4a5868',
    accentDim: 'rgba(106,128,144,0.25)', focusBorder: '#6a8090',
    focusBg: 'rgba(106,128,144,0.08)', queryBg: 'rgba(106,128,144,0.08)',
  },
  heather: {
    label: 'Heather',
    accent: '#8a6a80', queryBorder: '#8a6a80', responseBorder: '#5a4858',
    accentDim: 'rgba(138,106,128,0.25)', focusBorder: '#8a6a80',
    focusBg: 'rgba(138,106,128,0.08)', queryBg: 'rgba(138,106,128,0.08)',
  },
};

// ─── Themes (layout & arrangement only) ────────────────────────────────
const THEMES = {
  cli: { class: '', label: 'Plexus CLI', showStatusBar: false, sendLabel: '→' },
  codecli: { class: 'theme-code-cli', label: 'Code CLI', showStatusBar: true, sendLabel: '⏎ send' },
  cyber: { class: 'theme-cyber', label: 'Cyberpunk Neon', showStatusBar: true, sendLabel: '⏎ TRANSMIT' },
  fantasy: { class: 'theme-fantasy', label: 'Dark Fantasy', showStatusBar: true, sendLabel: '⚔️ CAST ⚔️' },
  stellar: { class: 'theme-stellar', label: 'Stellar Nebula', showStatusBar: true, sendLabel: '⏎ TRANSMIT' },
  forest: { class: 'theme-forest', label: 'Forest Canopy', showStatusBar: true, sendLabel: '🌱 SEND' },
  hacker: { class: 'theme-hacker', label: 'Hacker Root', showStatusBar: true, sendLabel: '[ EXEC ]' },
  minimal: { class: 'theme-minimal', label: 'Minimal CLI', showStatusBar: true, sendLabel: '⏎' },
  nova: { class: 'theme-nova', label: 'Dark Nova', showStatusBar: true, sendLabel: '✦ SEND' },
  codex: { class: 'theme-codex', label: 'Codex Terminal', showStatusBar: true, sendLabel: '⏎' },
  crt: { class: 'theme-crt', label: 'CRT Retro', showStatusBar: true, sendLabel: '[ SEND ]' },
};

let matrixAnimId = null;
function setMatrixRain(active) {
  const el = document.getElementById('matrix-rain');
  if (!el) return;
  if (matrixAnimId) {
    cancelAnimationFrame(matrixAnimId);
    matrixAnimId = null;
  }
  if (!active) {
    el.innerHTML = '';
    return;
  }
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const cols = Math.max(20, Math.floor(window.innerWidth / 20));
  const drops = Array.from({ length: cols }, () => Math.random() * -100);
  function draw() {
    let html = '';
    const h = window.innerHeight;
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const top = drops[i] * 15;
      const op = (Math.random() * 0.25 + 0.08).toFixed(2);
      html += `<span class="matrix-char" style="left:${i * 20}px;top:${top}px;opacity:${op}">${ch}</span>`;
      if (top > h) drops[i] = 0;
      drops[i] += 0.5 + Math.random() * 0.5;
    }
    el.innerHTML = html;
    matrixAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function updateBannerThemeIcon(themeId) {
  const icon = document.getElementById('banner-theme-icon');
  if (!icon) return;
  if (themeId === 'hacker') icon.textContent = '⧫';
  else if (themeId === 'minimal') icon.textContent = '$';
  else if (themeId === 'nova') icon.textContent = '✦';
  else if (themeId === 'codex') icon.textContent = '{ }';
  else icon.textContent = '';
}

function applyColor() {
  const c = ACCENT_COLORS[state.colorScheme] || ACCENT_COLORS.sage;
  const root = document.documentElement;
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--query-border', c.queryBorder);
  root.style.setProperty('--response-border', c.responseBorder);
  root.style.setProperty('--accent-dim', c.accentDim);
  root.style.setProperty('--focus-border', c.focusBorder);
  root.style.setProperty('--focus-bg', c.focusBg);
  root.style.setProperty('--query-bg', c.queryBg);
  root.style.setProperty('--cyan', c.accent);
  root.style.setProperty('--blue', c.accent);
  root.style.setProperty('--bright-blue', c.accent);
  root.style.setProperty('--green', c.accent);
  root.style.setProperty('--magenta', c.accent);
  root.style.setProperty('--bright-magenta', c.accent);
  updateSidePanel();
}

function applyTheme() {
  Object.values(THEMES).forEach(th => {
    if (th.class) document.body.classList.remove(th.class);
  });
  const t = THEMES[state.theme] || THEMES.cli;
  if (t.class) document.body.classList.add(t.class);
  const sb = document.getElementById('status-bar');
  if (sb) sb.style.display = t.showStatusBar ? 'flex' : 'none';
  sendBtn.textContent = t.sendLabel || '→';
  setMatrixRain(state.theme === 'hacker');
  updateBannerThemeIcon(state.theme);
}

// ─── Status bar (model + tokens) ──────────────────────────────────────
function updateStatusBar() {
  const short = state.model.split('/').pop()?.replace(/:free$/, '') || state.model;
  statusModel.textContent = short;
  const tin = state.totalTokensIn || 0;
  const tout = state.totalTokensOut || 0;
  if (tin || tout) {
    statusTokens.textContent = `⎇ ${tin.toLocaleString()} in / ${tout.toLocaleString()} out`;
  } else {
    statusTokens.textContent = '';
  }
  updateSidePanel();
}

// ─── Side panel ────────────────────────────────────────────────────────
function updateSidePanel() {
  const tin = state.totalTokensIn || 0;
  const tout = state.totalTokensOut || 0;
  const total = tin + tout;

  const el = id => document.getElementById(id);
  if (!el('sp-tokens-in')) return;

  el('sp-tokens-in').textContent = tin.toLocaleString();
  el('sp-tokens-out').textContent = tout.toLocaleString();
  el('sp-tokens-total').textContent = total.toLocaleString();

  const short = state.model.split('/').pop()?.replace(/:free$/, '') || state.model;
  el('sp-model').textContent = short || '—';
  el('sp-mode').textContent = state.mode || 'general';
  if (el('sp-plan')) el('sp-plan').textContent = state.planMode ? 'on' : 'off';

  // Ring chart: output / total ratio
  const ring = el('sp-ring');
  if (ring) {
    const ratio = total > 0 ? tout / total : 0;
    const deg = ratio * 360;
    ring.style.background = `conic-gradient(var(--accent) 0deg ${deg}deg, var(--border) ${deg}deg 360deg)`;
    if (el('sp-ring-label')) el('sp-ring-label').textContent = Math.round(ratio * 100) + '%';
  }

  // Lifetime tokens
  const ltIn = state.lifetimeTokensIn || 0;
  const ltOut = state.lifetimeTokensOut || 0;
  if (el('sp-lt-in')) el('sp-lt-in').textContent = ltIn.toLocaleString();
  if (el('sp-lt-out')) el('sp-lt-out').textContent = ltOut.toLocaleString();

  const cost = (tin / 1_000_000) * 0.15 + (tout / 1_000_000) * 0.60;
  if (el('sp-cost')) el('sp-cost').textContent = cost < 0.01 ? '< $0.01' : '$' + cost.toFixed(4);

  // Side panel temp slider
  if (el('sp-temp')) el('sp-temp').value = state.temperature ?? 0.7;
  if (el('sp-temp-val')) el('sp-temp-val').textContent = (state.temperature ?? 0.7).toFixed(2);
}

// ─── Auto-resize textarea ──────────────────────────────────────────────
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
}
inputEl.addEventListener('input', autoResize);

// ─── Message rendering ─────────────────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {}, () => {});
}
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Preserve placeholder for code blocks so inline rules don't touch them
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const clean = code.trim();
    let highlighted = clean;
    if (lang && hljs && hljs.getLanguage(lang)) {
      try { highlighted = hljs.highlight(clean, { language: lang }).value; } catch {}
    }
    const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    const langLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
    const cleanEscaped = escapeHtml(clean);
    codeBlocks.push(`<div class="code-wrap"><div class="code-hdr">${langLabel}<button class="code-copy" onclick="copyText('${cleanEscaped.replace(/'/g, "\\'")}')">copy</button></div><pre><code${langAttr}>${highlighted}</code></pre></div>`);
    return `\x00CODEBLOCK${idx}\x00`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (must be before italic)
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules (must be before lists since both use ---)
  html = html.replace(/^-{3,}\s*$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');

  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in proper list tags
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    // Detect if any li was from an ordered list pattern (check original source via context)
    // Simple heuristic: wrap in <ul> by default; if we wanted <ol> we'd need more context
    return `<ul>${match}</ul>`;
  });

  // Tables: collect consecutive table lines, process each block
  html = html.replace(/((?:\|.*\|[^\n]*\n?)+)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').map(r => r.trim()).filter(r => r);
    if (rows.length < 2) return tableBlock;

    // Check if second row is a separator
    const sepRow = rows[1];
    const isSep = sepRow && sepRow.startsWith('|') && sepRow.endsWith('|') &&
      sepRow.replace(/\|/g, '').trim() && sepRow.replace(/[|\-:\s]/g, '').length === 0;

    if (!isSep) return tableBlock; // not a valid table

    const headerRow = rows[0];
    const headerCells = headerRow.split('|').map(c => c.trim()).filter(c => c);
    if (headerCells.length === 0) return tableBlock;

    let tableHtml = '<table><thead><tr>';
    for (const cell of headerCells) {
      tableHtml += `<th>${cell}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].split('|').map(c => c.trim()).filter(c => c);
      if (cells.length === 0) continue;
      tableHtml += '<tr>';
      for (const cell of cells) {
        tableHtml += `<td>${cell}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    const tableText = escapeHtml(tableBlock.replace(/^\|/gm, '').replace(/\|$/gm, '').split('\n').slice(0, 1).concat(tableBlock.split('\n').slice(2)).map(r => r.replace(/\|/g, '\t').trim()).join('\n'));
    return `<div class="table-wrap">${tableHtml}<button class="table-copy" onclick="copyText('${tableText.replace(/'/g, "\\'")}')">copy table</button></div>`;
  });

  // Double line breaks = paragraphs (only where not already inside block elements)
  html = html.replace(/\n\n+/g, '</p><p>');

  // Single line breaks -> <br> (but not inside tables/lists/etc already handled)
  html = html.replace(/\n/g, '<br>');

  // Wrap in <p> if not already starting with a block element
  if (!/^\s*<(?:p|pre|blockquote|h[1-4]|table|ul|ol|hr|div)/i.test(html)) {
    html = '<p>' + html + '</p>';
  }

  // Replace empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '');

  // Restore code blocks
  html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => codeBlocks[parseInt(idx)] || '');

  // Clean up <p> wrapping block elements
  html = html.replace(/<p>\s*(<(?:pre|blockquote|hr|table|ul|ol|h[1-4])>)/gi, '$1');
  html = html.replace(/(<\/(?:pre|blockquote|hr|table|ul|ol|h[1-4])>)\s*<\/p>/gi, '$1');

  return html;
}

function addMessage(type, content, isLoading = false, imagePreview = null) {
  tipsEl.style.display = 'none';

  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.dataset.type = type;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = type === 'query' ? 'Query' : 'Response';

  const body = document.createElement('div');
  body.className = 'panel-body';

  if (type === 'query') {
    if (imagePreview) {
      body.innerHTML = `<div class="msg-image-wrap"><img class="msg-image-preview" src="${imagePreview}" alt="Attached image"></div><div class="msg-text">${escapeHtml(content)}</div>`;
    } else {
      body.textContent = content;
    }
  } else {
    if (isLoading) {
      body.innerHTML = '<div id="loading" class="active"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    } else {
      body.innerHTML = renderMarkdown(content);
    }
  }

  panel.appendChild(title);
  panel.appendChild(body);
  div.appendChild(panel);

  if (!isLoading) addMessageButtons(div, type, content);
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return { div, body };
}

function addMessageButtons(div, type, content) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'copy';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const text = type === 'query' ? content : content;
      if (!text) return;
      const htmlContent = type === 'query' ? escapeHtml(content) : renderMarkdown(content);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([text], { type: 'text/plain' });
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        })
      ]).then(() => {
        copyBtn.textContent = 'done';
        setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
      }).catch(() => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'done';
          setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
        }).catch(() => {
          copyBtn.textContent = 'failed';
          setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
        });
      });
    };
    div.appendChild(copyBtn);

    if (type === 'response') {
      const regBtn = document.createElement('button');
      regBtn.className = 'reg-btn';
      regBtn.textContent = '↻';
      regBtn.title = 'Regenerate';
      regBtn.onclick = (e) => {
        e.stopPropagation();
        if (isStreaming) return;
        for (let i = state.messages.length - 1; i >= 0; i--) {
          if (state.messages[i].role === 'user') {
            inputEl.value = state.messages[i].content;
            handleSubmit();
            break;
          }
        }
      };
      div.appendChild(regBtn);
    }
}

function updateResponseBody(bodyEl, text) {
  bodyEl.innerHTML = renderMarkdown(text);
  scrollToBottom();
}

function addErrorMessage(text) {
  const div = document.createElement('div');
  div.className = 'error-msg';
  div.textContent = '⚠ ' + text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ─── Chat history restoration ──────────────────────────────────────────
function restoreMessages() {
  chatEl.innerHTML = '';
  if (state.messages.length === 0) {
    tipsEl.style.display = 'block';
    return;
  }
  tipsEl.style.display = 'none';

  for (const msg of state.messages) {
    if (msg.role === 'user') {
      let text = msg.content;
      if (msg.imageName && !msg.imageDataUrl) text = `📷 ${msg.imageName}\n${text}`;
      addMessage('query', text, false, msg.imageDataUrl || null);
    } else if (msg.role === 'assistant') {
      const { div } = addMessage('response', msg.content);
    }
  }
  chatEl.scrollTop = chatEl.scrollHeight;
}
// ─── OpenRouter API call ───────────────────────────────────────────────
async function sendMessage(userText, { appendUser = true } = {}) {
  if (isStreaming || !userText.trim() || !state.apiKey) return;

  // Add user message
  if (appendUser) {
    const imgPreview = uploadedImage?.dataUrl || null;
    const msgRecord = {
      role: 'user',
      content: userText.trim(),
      imageName: uploadedImage?.name || undefined,
    };
    if (uploadedImage?.dataUrl && uploadedImage.dataUrl.length <= 600000) {
      msgRecord.imageDataUrl = uploadedImage.dataUrl;
    }
    addMessage('query', userText.trim(), false, imgPreview);
    state.messages.push(msgRecord);
    saveState();
  }

  // Add placeholder response
  const { div: responseDiv, body: responseBody } = addMessage('response', '', true);
  const loadingEl = responseBody.querySelector('#loading');

  isStreaming = true;
  sendBtn.disabled = true;
  stopBtn.classList.add('active');
  abortController = new AbortController();

  // Build messages array
  const apiMessages = [];
  if (state.systemPrompt) {
    apiMessages.push({ role: 'system', content: state.systemPrompt });
  }
  if (uploadedText.trim()) {
    const fname = uploadedFile ? uploadedFile.name : 'attached file';
    apiMessages.push({ role: 'system', content: `The user attached a file (${fname}). Its content is:\n\n${uploadedText.trim().substring(0, 50000)}` });
  }
  Vision.appendApiMessages(apiMessages, uploadedImage);

  let fullResponse = '';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Plexus',
      },
      body: JSON.stringify({
        model: state.model,
        messages: apiMessages,
        stream: true,
        max_tokens: 8000,
        temperature: state.temperature ?? 0.7,
        top_p: state.topP ?? 1.0,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      let detail = '';
      try { const err = await response.json(); detail = err.error?.message || ''; } catch {}
      throw new Error(detail || `HTTP ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data);
          // Capture token usage from the last chunk
          if (chunk.usage) {
            state._lastUsage = chunk.usage;
          }
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            updateResponseBody(responseBody, fullResponse);
          }
        } catch {}
      }
    }

    if (!fullResponse.trim()) {
      throw new Error('Empty response from model');
    }

    // Track tokens from streaming response
    if (state._lastUsage) {
      const pi = state._lastUsage.prompt_tokens || 0;
      const co = state._lastUsage.completion_tokens || 0;
      state.totalTokensIn = (state.totalTokensIn || 0) + pi;
      state.totalTokensOut = (state.totalTokensOut || 0) + co;
      state.lifetimeTokensIn = (state.lifetimeTokensIn || 0) + pi;
      state.lifetimeTokensOut = (state.lifetimeTokensOut || 0) + co;
      delete state._lastUsage;
      saveState();
    }

    state.messages.push({ role: 'assistant', content: fullResponse.trim() });
    saveState();

  } catch (err) {
    if (err.name === 'AbortError') {
      if (fullResponse.trim()) {
    state.messages.push({ role: 'assistant', content: fullResponse.trim() });
    saveState();
    addMessageButtons(responseDiv, 'response', fullResponse.trim());
      }
      return;
    }
    // Remove loading state
    if (loadingEl) loadingEl.classList.remove('active');
    let msg = err.message || 'Unknown error';
    if (msg.includes('401')) msg = 'Invalid API key. Open settings to set a valid OpenRouter key.';
    else if (msg.includes('402')) msg = 'Model out of credits. Try a free model in settings.';
    else if (msg.includes('429')) msg = 'Rate limited. Please wait a moment.';
    else if (msg.includes('403')) msg = 'Access denied by OpenRouter. Check your API key.';
    else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) msg = 'Network error. Check your connection.';
    else if (msg.includes('Empty response')) {
      // Streaming ended without content — may have usage in last chunk
      try { if (state._lastUsage) { const pi = state._lastUsage.prompt_tokens || 0; const co = state._lastUsage.completion_tokens || 0; state.totalTokensIn = (state.totalTokensIn || 0) + pi; state.totalTokensOut = (state.totalTokensOut || 0) + co; state.lifetimeTokensIn = (state.lifetimeTokensIn || 0) + pi; state.lifetimeTokensOut = (state.lifetimeTokensOut || 0) + co; saveState(); updateStatusBar(); } } catch {}
    }
    addErrorMessage(msg);
  } finally {
    isStreaming = false;
    stopBtn.classList.remove('active');
    sendBtn.disabled = false;
    clearAttachments();
    updateStatusBar();
    abortController = null;
  }
}
const MODES = {
  general: {
    label: 'General',
    prompt: '',
  },
  finance: {
    label: 'Financial Analysis',
    prompt: 'You are a financial research analyst. Provide concise, factual analysis of markets, stocks, and economic indicators. Use concrete numbers, compare companies, analyze trends, and explain financial concepts clearly. When discussing tickers or companies, provide relevant metrics (P/E, market cap, growth rates, etc.) where available.',
  },
  aidev: {
    label: 'AI Tools & Dev',
    prompt: 'You are an AI tools and software development expert. Help explore AI/ML frameworks, libraries, APIs, and developer tools. Explain how to use tools like LangChain, HuggingFace, vector databases, fine-tuning, RAG pipelines, agent frameworks, and MCP servers. Provide code examples and architecture guidance. Stay up to date with the latest AI dev ecosystem.',
  },
  github: {
    label: 'GitHub Discovery',
    prompt: 'You are a GitHub discovery and open-source expert. Help find interesting repositories, evaluate projects by stars/activity/license, understand repo architectures, and contribute to open source. Provide guidance on reading codebases, understanding README files, setting up projects from source, and identifying high-quality repos for learning or using in your own work.',
  },
  datascience: {
    label: 'Data Science',
    prompt: 'You are a data science mentor. Help with data analysis workflows, statistics, machine learning, visualization, and experimental design. Explain concepts like feature engineering, model selection, cross-validation, dimensionality reduction, and hyperparameter tuning. Provide Python code examples using pandas, scikit-learn, matplotlib, and related libraries. Suggest datasets and project ideas for practice.',
  },
  blog: {
    label: 'Blog Writing',
    prompt: 'You are a blog writing coach and editor. Help plan, outline, draft, and refine blog posts and technical articles. Assist with structuring ideas, writing clear explanations, improving readability, choosing effective titles, and editing for tone and clarity. Support for technical blogs, tutorials, opinion pieces, and research summaries. Aim for engaging, well-structured content that resonates with readers.',
  },
};

// ─── Personas (personality/style overlays) ──────────────────────────────
const PERSONAS = {
  none: {
    label: 'No Persona',
    prompt: '',
  },
  deepresearch: {
    label: 'Deep Research',
    prompt: 'You never settle for surface-level answers. When responding, you exhaustively explore the topic: start with a concise summary, then dive deep into supporting details, edge cases, historical context, and underlying principles. You cite specific examples, mention relevant research or sources where applicable, and explicitly call out assumptions or limitations. Your answers are structured but thorough — aim for depth over brevity. If the topic has nuance, you explore it. If there are competing viewpoints, you present them. The goal is to leave no stone unturned.',
  },
  socratic: {
    label: 'Socratic',
    prompt: 'You teach through questions. Instead of giving direct answers, you guide the user to discover insights themselves by asking thoughtful follow-up questions. You break down problems into first principles, challenge assumptions, and help the user build their own understanding. Adapt your questioning to the user\'s level of knowledge. Only provide direct answers after the user has had a chance to think through each step. Your tone is encouraging and curious — like a patient mentor who believes the user is capable of figuring it out.',
  },
  storyteller: {
    label: 'Storyteller',
    prompt: 'You explain everything through stories, analogies, and narrative. Every concept you introduce comes with a vivid metaphor, a relatable scenario, or a mini-story that makes it stick. You use characters, cause-and-effect arcs, and concrete imagery to make abstract ideas tangible. Your tone is warm, engaging, and conversational. Think of yourself as a favorite teacher who turns every lesson into a tale the students will remember. Keep the stories concise enough to serve the explanation, not overwhelm it.',
  },
  deviladvocate: {
    label: "Devil's Advocate",
    prompt: 'Your role is to stress-test ideas. When the user presents a plan, opinion, or conclusion, you respectfully challenge it from multiple angles. You identify blind spots, unstated assumptions, and potential failure modes. You present counterarguments fairly and constructively — your goal is not to win a debate but to help the user arrive at a more robust conclusion. Back your challenges with reasoning and evidence where possible. Your tone is respectful and intellectually rigorous, never dismissive. After challenging, offer alternatives or mitigations.',
  },
  simplify: {
    label: 'Simplify',
    prompt: 'You explain complex topics as if the user is encountering them for the first time. Use plain language, avoid jargon unless you define it immediately, and break every concept into the smallest digestible pieces. Use analogies from everyday life. If a term or idea might be unfamiliar, you preemptively clarify it. Your answers are short, clear, and friendly. Never talk down to the user — assume they are smart but new to this specific topic. The mark of success is that the user finishes reading and thinks, "I actually understand that now."',
  },
};

function rebuildSystemPrompt() {
  const mode = MODES[state.mode] || MODES.general;
  const persona = PERSONAS[state.persona] || PERSONAS.none;
  const parts = [];
  if (mode.prompt) parts.push(mode.prompt);
  if (persona.prompt) parts.push(persona.prompt);
  state.systemPrompt = parts.join('\n\n') || '';
  systemPromptInput.value = state.systemPrompt || '';
  saveState();
}

function setMode(name) {
  const mode = MODES[name];
  if (!mode) return false;
  state.mode = name;
  const badge = document.getElementById('mode-badge');
  badge.textContent = name;
  badge.className = name;
  rebuildSystemPrompt();
  return true;
}

function setPersona(name) {
  const persona = PERSONAS[name];
  if (!persona) return false;
  state.persona = name;
  const badge = document.getElementById('persona-badge');
  if (name === 'none') {
    badge.className = 'none';
    badge.textContent = '';
  } else {
    badge.textContent = name;
    badge.className = name;
  }
  rebuildSystemPrompt();
  return true;
}

function setPlanMode(enabled) {
  state.planMode = !!enabled;
  updatePlanBadge();
  updateKbdHints();
  saveState();
  return true;
}

function updatePlanBadge() {
  const badge = document.getElementById('plan-badge');
  if (badge) {
    if (state.planMode) {
      badge.className = 'plan';
      badge.textContent = 'plan';
    } else {
      badge.className = 'off';
      badge.textContent = '';
    }
  }
  const spPlan = document.getElementById('sp-plan');
  if (spPlan) spPlan.textContent = state.planMode ? 'on' : 'off';
  checkApiKey();
}

// ─── Slash command suggestions ─────────────────────────────────────────
const SUGGESTIONS = [
  { cmd: '/general', desc: 'General chat mode' },
  { cmd: '/finance', desc: 'Financial analysis mode' },
  { cmd: '/aidev', desc: 'AI tools & dev mode' },
  { cmd: '/github', desc: 'GitHub discovery mode' },
  { cmd: '/datascience', desc: 'Data science mode' },
  { cmd: '/blog', desc: 'Blog writing mode' },
  { cmd: '/deepresearch', desc: 'Deep research persona' },
  { cmd: '/socratic', desc: 'Socratic questioning persona' },
  { cmd: '/storyteller', desc: 'Storyteller persona' },
  { cmd: '/deviladvocate', desc: 'Devil\'s advocate persona' },
  { cmd: '/simplify', desc: 'Simplify persona' },
  { cmd: '/nopersona', desc: 'Clear active persona' },
  { cmd: '/plan', desc: 'Toggle structured analysis mode (sub-Q → answers → synthesis)' },
  { cmd: '/clear', desc: 'Clear conversation history' },
  { cmd: '/help', desc: 'Show all commands' },
  { cmd: '/export', desc: 'Export conversation as Markdown' },
  { cmd: '/research', desc: 'Run structured analysis once (same as plan mode)' },
  { cmd: '/deep', desc: 'Shorthand for /research' },
  { cmd: '/summarize', desc: 'Summarize text or file' },
  { cmd: '/explain', desc: 'Explain text in detail' },
  { cmd: '/translate', desc: 'Translate text' },
  { cmd: '/rephrase', desc: 'Rewrite for clarity' },
  { cmd: '/bulletise', desc: 'Convert to bullet points' },
  { cmd: '/model', desc: 'Switch AI model' },
  { cmd: '/key', desc: 'Set OpenRouter API key' },
  { cmd: '/mode', desc: 'Switch theme mode' },
  { cmd: '/modes', desc: 'List all modes' },
  { cmd: '/persona', desc: 'Switch persona' },
  { cmd: '/personas', desc: 'List all personas' },
];

const suggestionsEl = document.getElementById('suggestions');
let suggestionIndex = -1;
let filteredSuggestions = [];

function closeSuggestions() {
  suggestionsEl.classList.remove('active');
  suggestionsEl.innerHTML = '';
  suggestionIndex = -1;
}

function showSuggestions(filter) {
  filteredSuggestions = SUGGESTIONS.filter(s => filter === '' || s.cmd.startsWith(filter));
  if (filteredSuggestions.length === 0 || filteredSuggestions.length === SUGGESTIONS.length) {
    closeSuggestions();
    return;
  }
  suggestionIndex = 0;
  suggestionsEl.innerHTML = filteredSuggestions.map((s, i) =>
    `<div class="suggestion${i === 0 ? ' selected' : ''}" data-index="${i}">
      <span>${s.cmd}</span>
      <span class="desc">${s.desc}</span>
    </div>`
  ).join('');
  suggestionsEl.classList.add('active');
}

function selectSuggestion(index) {
  if (index < 0 || index >= filteredSuggestions.length) return;
  inputEl.value = filteredSuggestions[index].cmd + ' ';
  inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
  closeSuggestions();
  inputEl.focus();
  autoResize();
}

// ─── Slash Commands ────────────────────────────────────────────────────
function handleSlashCommand(cmd, args) {
  // Mode shortcuts
  const modeNames = Object.keys(MODES);
  for (const name of modeNames) {
    if (cmd === '/' + name) {
      if (setMode(name)) {
        addMessage('response', `Switched to **${MODES[name].label}** mode.${MODES[name].prompt ? '\n\nThe system prompt has been updated for this theme.' : '\n\nNo special system prompt — free form chat.'}`);
      }
      return true;
    }
  }

  // Persona shortcuts
  const personaNames = Object.keys(PERSONAS);
  for (const name of personaNames) {
    if (name !== 'none' && cmd === '/' + name) {
      if (setPersona(name)) {
        addMessage('response', `Persona set to **${PERSONAS[name].label}**.${PERSONAS[name].prompt ? '\n\nThe AI will now adjust its style for this persona.' : ''}`);
      }
      return true;
    }
  }

  switch (cmd) {
    case '/clear':
      state.messages = [];
      state.totalTokensIn = 0;
      state.totalTokensOut = 0;
      saveState();
      tipsEl.style.display = 'block';
      chatEl.querySelectorAll('.message').forEach(el => el.remove());
      chatEl.querySelectorAll('.error-msg').forEach(el => el.remove());
      updateSidePanel();
      addMessage('response', 'Chat cleared. Start a new conversation.');
      return true;

    case '/help':
      const helpText = [
        '# Plexus Commands',
        '',
        '| Category | Command | Usage | Description |',
        '|---|---|---|---|',
        '| **Theme** | `/mode <name>` | `/mode finance` | Switch domain (finance, aidev, github, datascience, blog, general) |',
        '| **Theme** | `/<name>` | `/finance` | Quick switch to a mode |',
        '| **Theme** | `/modes` | `/modes` | List all available themes |',
        '| **Persona** | `/persona <name>` | `/persona deepresearch` | Set AI personality style |',
        '| **Persona** | `/<name>` | `/deepresearch` | Quick persona switch |',
        '| **Persona** | `/personas` | `/personas` | List all personas |',
        '| **Persona** | `/nopersona` | `/nopersona` | Clear active persona |',
        '| **Plan** | `/plan` | `/plan` | Toggle plan mode — every message is split into sub-questions, answered one-by-one, then synthesized |',
        '| **Plan** | `/plan on` / `/plan off` | `/plan on` | Enable or disable plan mode |',
        '| **Research** | `/research <q>` | `/research analyze AAPL stock` | Sub-questions → answers → final answer |',
        '| **Research** | `/deep <q>` | `/deep NVDA vs AMD` | Shorthand for /research |',
        '| **Quick** | `/summarize <text>` | `/summarize ...` | Condense text preserving key info |',
        '| **Quick** | `/explain <text>` | `/explain ...` | Break down concepts with examples |',
        '| **Quick** | `/translate <text>` | `/translate ...` | Translate text (defaults to English) |',
        '| **Quick** | `/rephrase <text>` | `/rephrase ...` | Rewrite for clarity and polish |',
        '| **Quick** | `/bulletise <text>` | `/bulletise ...` | Convert to structured bullet points |',
        '| **System** | `/clear` | `/clear` | Clear conversation history |',
        '| **System** | `/export` | `/export` | Download chat as Markdown file |',
        '| **System** | `/model <name>` | `/model openai/gpt-4o` | Switch AI model |',
        '| **System** | `/key <key>` | `/key sk-or-v1-...` | Set OpenRouter API key |',
        '| **System** | `/help` | `/help` | Show this table |',
        '',
        '---',
        '',
        '## Keyboard shortcuts',
        '',
        '| Action | Shortcut |',
        '|---|---|',
        '| Focus input | `Ctrl/Cmd+J` |',
        '| New chat | `Ctrl/Cmd+N` |',
        '| Stop generation | `Esc` |',
        '| Settings | `Ctrl/Cmd+,` |',
        '| Export chat | `Ctrl/Cmd+E` |',
        '| Toggle plan mode | `Ctrl/Cmd+P` |',
        '| Command palette | `Ctrl/Cmd+K` |',
        '| Shortcuts help | `Ctrl/Cmd+/` |',
        '| Copy last response | `Ctrl/Cmd+Shift+C` |',
        '| Regenerate last response | `Ctrl/Cmd+Shift+R` |',
        '| Next / previous session | `Ctrl/Cmd+]` / `Ctrl/Cmd+[` |',
        '| Clear chat | `Ctrl/Cmd+Shift+L` |',
        '',
        'Press **Ctrl/Cmd+/** anytime for the full shortcuts panel.',
        '',
        '---',
        '',
        '**Tips:** Theme + Persona stack together. `Shift+Enter` for newline. Attach files via 📎. Type `/` for autocomplete.',
      ].join('\n');
      addMessage('response', helpText);
      return true;

    case '/export':
      exportConversation();
      return true;

    case '/mode':
    case '/modes':
      if (cmd === '/mode' && args && MODES[args]) {
        if (setMode(args)) {
          addMessage('response', `Switched to **${MODES[args].label}** mode.${MODES[args].prompt ? '\n\nThe system prompt has been updated for this theme.' : '\n\nNo special system prompt — free form chat.'}`);
        }
        return true;
      }
      const currentMode = state.mode || 'general';
      const modeList = Object.entries(MODES).map(([key, m]) => {
        const active = key === currentMode ? ' **← active**' : '';
        return `\`/${key}\` — ${m.label}${active}`;
      }).join('\n');
      addMessage('response', `**Available Theme Modes**\n\n${modeList}\n\nUse \`/mode <name>\` or \`/<name>\` to switch. Combine with a persona like \`/deepresearch\` for style overlay.`);
      return true;

    case '/persona':
    case '/personas':
      if (cmd === '/persona' && args && PERSONAS[args]) {
        if (setPersona(args)) {
          if (args === 'none') {
            addMessage('response', 'Persona cleared.');
          } else {
            addMessage('response', `Persona set to **${PERSONAS[args].label}**.${PERSONAS[args].prompt ? '\n\nThe AI will now adjust its style for this persona.' : ''}`);
          }
        }
        return true;
      }
      const currentPersona = state.persona || 'none';
      const personaList = Object.entries(PERSONAS).map(([key, p]) => {
        if (key === 'none') return '';
        const active = key === currentPersona ? ' **← active**' : '';
        return `\`/${key}\` — ${p.label}${active}`;
      }).filter(Boolean).join('\n');
      addMessage('response', `**Available Personas**\n\n${personaList}\n\nCurrent: **${currentPersona === 'none' ? 'None' : PERSONAS[currentPersona]?.label || 'None'}**\n\nUse \`/persona <name>\` or \`/<name>\` to switch, \`/persona none\` to clear. Personas stack on top of your theme mode.`);
      return true;

    case '/nopersona':
      if (setPersona('none')) {
        addMessage('response', 'Persona cleared.');
      }
      return true;

    case '/plan':
    case '/planmode': {
      if (args === 'on') setPlanMode(true);
      else if (args === 'off') setPlanMode(false);
      else setPlanMode(!state.planMode);
      addMessage('response', state.planMode
        ? `**Plan mode ON.** The AI picks **${describePlanPipelineMode()}**, then delivers a **Final Answer**.\n\nUse \`/plan off\` or click the **plan** badge for direct answers. Tune min/max, parallel, and quality gate in **settings**. Use \`/research <query>\` for the research pipeline.`
        : '**Plan mode OFF.** Messages go to the model for direct answers again.');
      return true;
    }

    case '/research':
    case '/deep':
      if (!args) {
        addMessage('response', 'Usage: `/research <query>` — e.g. `/research analyze AAPL stock`\n\nBreaks the query into sub-questions (min/max in settings), answers each, and synthesizes a final answer. Parallel answers and quality gate are configurable under **Plan pipeline** in settings.');
        return true;
      }
      doDeepResearch(args);
      return true;

    case '/model':
      if (!args) {
        addMessage('response', `Current model: \`${state.model}\`\n\nUsage: \`/model <name>\`\nExamples: \`/model openai/gpt-4o-mini\`, \`/model google/gemini-2.5-flash-exp:free\``);
        return true;
      }
      state.model = args;
      modelSelect.value = args;
      saveState();
      addMessage('response', `Model switched to \`${args}\``);
      return true;

    case '/key':
      if (!args) {
        addMessage('response', state.apiKey
          ? `API key is set (\`…${state.apiKey.slice(-4)}\`). Use \`/key <new-key>\` to change it.`
          : 'No API key set. Use \`/key <your-openrouter-key>\` to set one.');
        return true;
      }
      state.apiKey = args;
      saveState();
      checkApiKey();
      addMessage('response', 'API key saved.');
      return true;

    // Quick commands
    case '/summarize':
    case '/explain':
    case '/translate':
    case '/rephrase':
    case '/bulletise':
      runQuickCommand(cmd, args);
      return true;

    default:
      return false;
  }
}

// ─── Quick commands ────────────────────────────────────────────────────
const QUICK_PROMPTS = {
  '/summarize': 'You are a summarization expert. Summarize the following text concisely while preserving all key information, main arguments, and important details. Output a clear, structured summary with sections if the text is long. Use bullet points for key takeaways at the end.',
  '/explain': 'You are an expert explainer. Explain the following text in detail, breaking down complex concepts, defining technical terms, and providing context. Make it accessible to someone unfamiliar with the topic. Use examples where helpful.',
  '/translate': 'Translate the following text accurately while preserving the original meaning, tone, and formatting. If no target language is specified, translate to English. If the text is already in English, translate to Spanish.',
  '/rephrase': 'You are a writing expert. Rephrase the following text to improve clarity, flow, and impact while preserving the original meaning. Adjust the tone to be professional and polished. Output the revised version only.',
  '/bulletise': 'Convert the following text into a well-organized set of bullet points and structured headings. Group related ideas together, use hierarchical bullet levels where appropriate, and ensure no key information is lost. Output only the bulleted version.',
};

function runQuickCommand(cmd, args) {
  let sourceText = args || '';
  // If no text in args but we have uploaded file, use that
  if (!sourceText.trim() && uploadedText.trim()) {
    sourceText = uploadedText.trim().substring(0, 10000);
  }
  if (!sourceText.trim()) {
    addMessage('response', `Usage: \`${cmd} <text>\` or attach a file and type \`${cmd}\`.\n\nExample: \`${cmd} The stock market today saw major movements...\``);
    return;
  }
  const prompt = QUICK_PROMPTS[cmd] || 'Process the following text:';
  // Send as a query with the prompt + source text
  const fullQuery = `${prompt}\n\n---\n${sourceText}`;
  sendMessage(fullQuery);
}

// ─── Auto-scroll lock ─────────────────────────────────────────────────
chatEl.addEventListener('scroll', () => {
  const threshold = 50;
  autoScroll = (chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight) < threshold;
});

function scrollToBottom() {
  if (autoScroll) chatEl.scrollTop = chatEl.scrollHeight;
}

// ─── Input handling ────────────────────────────────────────────────────
function handleSubmit() {
  const text = inputEl.value.trim();
  if (!text || isStreaming) return;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  closeSuggestions();

  if (text.startsWith('/')) {
    const spaceIdx = text.indexOf(' ');
    const cmd = spaceIdx === -1 ? text.toLowerCase() : text.slice(0, spaceIdx).toLowerCase();
    const args = spaceIdx === -1 ? '' : text.slice(spaceIdx + 1).trim();
    if (handleSlashCommand(cmd, args)) return;
  }

  if (!state.apiKey) {
    addMessage('response', 'Set your OpenRouter API key first. Click settings or use \`/key <key>\`.');
    return;
  }

  if (uploadedImage && !Vision.supports() && !state.planMode) {
    addMessage('response', 'This model does not support images. Switch to a **vision model** (e.g. GPT-4o, Gemini 2.5 Flash) in settings — or enable **plan mode** / use `/research` to auto-describe the image.');
    return;
  }

  if (state.planMode) {
    runStructuredAnalysis(text, getPlanModePipelineOptions());
    return;
  }

  sendMessage(text);
}

inputEl.addEventListener('input', () => {
  autoResize();
  const val = inputEl.value;
  if (val.startsWith('/') && !val.includes(' ')) {
    showSuggestions(val.toLowerCase());
  } else {
    closeSuggestions();
  }
});

inputEl.addEventListener('keydown', (e) => {
  if (suggestionsEl.classList.contains('active')) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      suggestionIndex = Math.min(suggestionIndex + 1, filteredSuggestions.length - 1);
      document.querySelectorAll('.suggestion').forEach((el, i) => {
        el.classList.toggle('selected', i === suggestionIndex);
      });
      const sel = suggestionsEl.querySelector('.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      suggestionIndex = Math.max(suggestionIndex - 1, 0);
      document.querySelectorAll('.suggestion').forEach((el, i) => {
        el.classList.toggle('selected', i === suggestionIndex);
      });
      const sel = suggestionsEl.querySelector('.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestionIndex >= 0 && suggestionIndex < filteredSuggestions.length) {
        selectSuggestion(suggestionIndex);
      }
      return;
    }
    if (e.key === 'Escape') {
      closeSuggestions();
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }

  // ↑ key: pull last query into input
  if (e.key === 'ArrowUp' && !inputEl.value) {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].role === 'user') {
        inputEl.value = state.messages[i].content;
        inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
        autoResize();
        break;
      }
    }
  }
});

// Global keyboard shortcuts
const cmdPaletteOverlay = document.getElementById('cmd-palette-overlay');
const cmdPaletteInput = document.getElementById('cmd-palette-input');
const cmdPaletteList = document.getElementById('cmd-palette-list');
const shortcutsOverlay = document.getElementById('shortcuts-overlay');
const shortcutsTable = document.getElementById('shortcuts-table');
const shortcutsClose = document.getElementById('shortcuts-close');
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

function modKeyLabel() { return IS_MAC ? '⌘' : 'Ctrl'; }
function fmtShortcut(key, { shift = false } = {}) {
  const mod = modKeyLabel();
  return shift ? `${mod}+Shift+${key}` : `${mod}+${key}`;
}

function exportConversation({ notify = true } = {}) {
  if (state.messages.length === 0) {
    if (notify) addMessage('response', 'Nothing to export yet.');
    return false;
  }
  const exportText = state.messages.map(m => {
    const role = m.role === 'user' ? '## Query' : '## Response';
    return `${role}\n${m.content}\n`;
  }).join('\n');
  const blob = new Blob([exportText], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plexus-${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.md`;
  a.click();
  URL.revokeObjectURL(url);
  if (notify) addMessage('response', `Conversation exported as \`${a.download}\``);
  return true;
}

function clearCurrentChat(notify = true) {
  state.messages = [];
  state.totalTokensIn = 0;
  state.totalTokensOut = 0;
  saveState();
  tipsEl.style.display = 'block';
  chatEl.querySelectorAll('.message').forEach(el => el.remove());
  chatEl.querySelectorAll('.error-msg').forEach(el => el.remove());
  updateSidePanel();
  if (notify) addMessage('response', 'Chat cleared. Use /help for commands.');
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  stopBtn.classList.remove('active');
}

function focusInput() {
  inputEl.focus();
  const len = inputEl.value.length;
  inputEl.selectionStart = inputEl.selectionEnd = len;
}

function togglePlanModeQuiet() {
  setPlanMode(!state.planMode);
}

function getSortedSessionIds() {
  const store = loadSessionStore();
  return Object.entries(store.sessions)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
    .map(([id]) => id);
}

function switchSessionByDelta(delta) {
  if (isStreaming) return;
  const store = loadSessionStore();
  const ids = getSortedSessionIds();
  const idx = ids.indexOf(store.activeId);
  if (idx === -1) return;
  const next = ids[(idx + delta + ids.length) % ids.length];
  if (next !== store.activeId) loadSession(next);
}

function copyLastResponse() {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === 'assistant') {
      copyText(state.messages[i].content);
      return true;
    }
  }
  return false;
}

function regenerateLastResponse() {
  if (isStreaming || !state.apiKey) return;
  let userText = '';
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === 'user') {
      userText = state.messages[i].content;
      break;
    }
  }
  if (!userText) return;

  if (state.messages.length && state.messages[state.messages.length - 1].role === 'assistant') {
    state.messages.pop();
    saveState();
  }
  const responseMsgs = chatEl.querySelectorAll('.message.response');
  if (responseMsgs.length) responseMsgs[responseMsgs.length - 1].remove();
  chatEl.querySelectorAll('.error-msg').forEach(el => el.remove());

  if (state.planMode) {
    runStructuredAnalysis(userText, getPlanModePipelineOptions({ appendUser: false }));
  } else {
    sendMessage(userText, { appendUser: false });
  }
}

const SHORTCUT_ROWS = [
  ['Focus input', () => fmtShortcut('J')],
  ['New chat', () => fmtShortcut('N')],
  ['Stop generation', () => 'Esc'],
  ['Settings', () => `${modKeyLabel()}+,`],
  ['Export chat', () => fmtShortcut('E')],
  ['Toggle plan mode', () => fmtShortcut('P')],
  ['Command palette', () => fmtShortcut('K')],
  ['Shortcuts help', () => fmtShortcut('/')],
  ['Copy last response', () => fmtShortcut('C', { shift: true })],
  ['Regenerate last response', () => fmtShortcut('R', { shift: true })],
  ['Next session', () => fmtShortcut(']')],
  ['Previous session', () => fmtShortcut('[')],
  ['Clear chat', () => fmtShortcut('L', { shift: true })],
];

function renderShortcutsTable() {
  if (!shortcutsTable) return;
  shortcutsTable.innerHTML = SHORTCUT_ROWS.map(([label, keyFn]) =>
    `<tr><td>${label}</td><td><kbd>${keyFn()}</kbd></td></tr>`
  ).join('');
}

function openShortcutsHelp() {
  renderShortcutsTable();
  shortcutsOverlay?.classList.add('active');
}

function closeShortcutsHelp() {
  shortcutsOverlay?.classList.remove('active');
}

const PALETTE_COMMANDS = [
  { label: 'New chat', keys: () => fmtShortcut('N'), keywords: 'new session chat', run: () => newSession() },
  { label: 'Export chat', keys: () => fmtShortcut('E'), keywords: 'export download markdown', run: () => exportConversation({ notify: false }) },
  { label: 'Toggle plan mode', keys: () => fmtShortcut('P'), keywords: 'plan structured analysis', run: togglePlanModeQuiet },
  { label: 'Open settings', keys: () => `${modKeyLabel()}+,`, keywords: 'settings api key model', run: openSettings },
  { label: 'Clear chat', keys: () => fmtShortcut('L', { shift: true }), keywords: 'clear reset conversation', run: () => clearCurrentChat(false) },
  { label: 'Copy last response', keys: () => fmtShortcut('C', { shift: true }), keywords: 'copy assistant', run: copyLastResponse },
  { label: 'Regenerate last response', keys: () => fmtShortcut('R', { shift: true }), keywords: 'regenerate retry', run: regenerateLastResponse },
  { label: 'Next session', keys: () => fmtShortcut(']'), keywords: 'session chat switch', run: () => switchSessionByDelta(1) },
  { label: 'Previous session', keys: () => fmtShortcut('['), keywords: 'session chat switch', run: () => switchSessionByDelta(-1) },
  { label: 'Keyboard shortcuts', keys: () => fmtShortcut('/'), keywords: 'help shortcuts keys', run: openShortcutsHelp },
  { label: 'Show slash commands', keys: () => '/help', keywords: 'help commands slash', run: () => handleSlashCommand('/help', '') },
];

let paletteIndex = 0;
let paletteFiltered = PALETTE_COMMANDS.slice();

function renderCommandPalette() {
  if (!cmdPaletteList) return;
  cmdPaletteList.innerHTML = paletteFiltered.map((cmd, i) =>
    `<div class="cmd-item${i === paletteIndex ? ' selected' : ''}" data-index="${i}">
      <span>${cmd.label}</span>
      <kbd>${cmd.keys()}</kbd>
    </div>`
  ).join('');
}

function openCommandPalette() {
  paletteFiltered = PALETTE_COMMANDS.slice();
  paletteIndex = 0;
  renderCommandPalette();
  cmdPaletteOverlay?.classList.add('active');
  cmdPaletteInput.value = '';
  setTimeout(() => cmdPaletteInput?.focus(), 0);
}

function closeCommandPalette() {
  cmdPaletteOverlay?.classList.remove('active');
}

function runPaletteCommand(index) {
  const cmd = paletteFiltered[index];
  if (!cmd) return;
  closeCommandPalette();
  cmd.run();
  updateKbdHints();
}

function filterCommandPalette(query) {
  const q = query.trim().toLowerCase();
  paletteFiltered = !q
    ? PALETTE_COMMANDS.slice()
    : PALETTE_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(q) || cmd.keywords.includes(q)
      );
  paletteIndex = 0;
  renderCommandPalette();
}

function updateKbdHints() {
  const mod = modKeyLabel();
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('kbd-new', `${mod}+N`);
  set('kbd-export', `${mod}+E`);
  set('kbd-plan', `${mod}+P`);
  set('kbd-palette', `${mod}+K`);
  set('kbd-help', `${mod}+/`);
  const planBtn = document.getElementById('kbd-plan-btn');
  const planLabel = document.getElementById('kbd-plan-label');
  if (planLabel) planLabel.textContent = state.planMode ? 'Plan on' : 'Plan off';
  if (planBtn) planBtn.classList.toggle('active', !!state.planMode);
}

document.getElementById('kbd-hints')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.kbd-hint');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'new-chat': newSession(); break;
    case 'export': exportConversation({ notify: false }); break;
    case 'plan': togglePlanModeQuiet(); break;
    case 'palette': openCommandPalette(); break;
    case 'shortcuts': openShortcutsHelp(); break;
  }
  updateKbdHints();
  focusInput();
});

cmdPaletteInput?.addEventListener('input', () => filterCommandPalette(cmdPaletteInput.value));
cmdPaletteInput?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    paletteIndex = Math.min(paletteIndex + 1, paletteFiltered.length - 1);
    renderCommandPalette();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    paletteIndex = Math.max(paletteIndex - 1, 0);
    renderCommandPalette();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    runPaletteCommand(paletteIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeCommandPalette();
  }
});
cmdPaletteList?.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.cmd-item');
  if (!item) return;
  e.preventDefault();
  runPaletteCommand(parseInt(item.dataset.index, 10));
});
cmdPaletteOverlay?.addEventListener('click', (e) => {
  if (e.target === cmdPaletteOverlay) closeCommandPalette();
});
shortcutsClose?.addEventListener('click', closeShortcutsHelp);
shortcutsOverlay?.addEventListener('click', (e) => {
  if (e.target === shortcutsOverlay) closeShortcutsHelp();
});

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const inPalette = cmdPaletteOverlay?.classList.contains('active');
  const inShortcuts = shortcutsOverlay?.classList.contains('active');
  const inSettings = settingsOverlay.classList.contains('active');

  if (e.key === 'Escape') {
    if (inPalette) { e.preventDefault(); closeCommandPalette(); return; }
    if (inShortcuts) { e.preventDefault(); closeShortcutsHelp(); return; }
    if (inSettings) { e.preventDefault(); closeSettings(); return; }
    if (isStreaming) { e.preventDefault(); stopGeneration(); return; }
    return;
  }

  if (!mod) return;

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const typing = isEditableTarget(e.target) && e.target !== cmdPaletteInput;

  if (typing) {
    const allowed = ['j', 'k', 'p', 'e', 'n', ',', '/', '[', ']'];
    const shiftAllowed = ['c', 'r', 'l'];
    if (!allowed.includes(key) && !(e.shiftKey && shiftAllowed.includes(key))) return;
  }

  if (key === 'j') { e.preventDefault(); focusInput(); return; }
  if (key === 'n') { e.preventDefault(); newSession(); updateKbdHints(); return; }
  if (key === 'e') { e.preventDefault(); exportConversation({ notify: false }); return; }
  if (key === 'p') { e.preventDefault(); togglePlanModeQuiet(); return; }
  if (key === 'k') { e.preventDefault(); openCommandPalette(); return; }
  if (key === ',') { e.preventDefault(); inSettings ? closeSettings() : openSettings(); return; }
  if (key === '/' || e.code === 'Slash') { e.preventDefault(); openShortcutsHelp(); return; }
  if (key === ']') { e.preventDefault(); switchSessionByDelta(1); return; }
  if (key === '[') { e.preventDefault(); switchSessionByDelta(-1); return; }

  if (e.shiftKey && key === 'c') { e.preventDefault(); copyLastResponse(); return; }
  if (e.shiftKey && key === 'r') { e.preventDefault(); regenerateLastResponse(); return; }
  if (e.shiftKey && key === 'l') { e.preventDefault(); clearCurrentChat(); return; }
});

// Click on suggestion
suggestionsEl.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.suggestion');
  if (item) {
    e.preventDefault();
    selectSuggestion(parseInt(item.dataset.index));
  }
});

// Close suggestions on click outside
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#input-wrapper') && !e.target.closest('#suggestions')) {
    closeSuggestions();
  }
});

sendBtn.addEventListener('click', handleSubmit);

// Stop button
stopBtn.addEventListener('click', stopGeneration);

// Side panel temperature slider
let uploadedFile = null;
let uploadedText = '';
let uploadedImage = null;

function clearAttachments() {
  uploadedFile = null;
  uploadedText = '';
  uploadedImage = null;
  fileInput.value = '';
  fileBtn.classList.remove('has-file');
  fileInfo.style.display = 'none';
}

async function loadImageAttachment(file) {
  if (file.size > Vision.MAX_IMAGE_BYTES) {
    alert('Image must be under 4MB');
    fileInput.value = '';
    return;
  }
  uploadedFile = null;
  uploadedText = '';
  const dataUrl = await Vision.readAsDataUrl(file);
  uploadedImage = { name: file.name, mimeType: file.type, dataUrl, size: file.size };
  fileBtn.classList.add('has-file');
  fileInfo.style.display = 'flex';
  fileInfo.innerHTML = `<img class="file-thumb" src="${dataUrl}" alt=""><span class="fname">${escapeHtml(file.name)}</span> <span>(${(file.size / 1024).toFixed(0)}KB)</span> <span class="fremove">✕</span>`;
  fileInfo.querySelector('.fremove').onclick = clearAttachments;
  if (!Vision.supports()) {
    fileInfo.innerHTML += ` <span style="color:var(--text-dim);font-size:10px">· needs vision model</span>`;
  }
}

// File upload
fileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const f = fileInput.files[0];
  if (!f) return;
  if (Vision.isImageFile(f)) {
    try {
      await loadImageAttachment(f);
    } catch {
      alert('Failed to load image');
      clearAttachments();
    }
    return;
  }
  if (f.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); fileInput.value = ''; return; }
  uploadedImage = null;
  uploadedFile = f;
  fileBtn.classList.add('has-file');
  fileInfo.style.display = 'flex';
  fileInfo.innerHTML = `<span class="fname">${escapeHtml(f.name)}</span> <span>(${(f.size / 1024).toFixed(0)}KB)</span> <span class="fremove">✕</span>`;
  fileInfo.querySelector('.fremove').onclick = clearAttachments;
  uploadedText = '';
  try {
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'md') {
      uploadedText = await f.text();
    } else if (ext === 'pdf') {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();
        pages.push(txt.items.map(t => t.str).join(' '));
      }
      uploadedText = pages.join('\n\n');
    } else if (ext === 'docx' || ext === 'pptx') {
      const buf = await f.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const paths = ext === 'docx'
        ? Object.keys(zip.files).filter(p => p.startsWith('word/document'))
        : Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d/.test(p));
      const texts = [];
      for (const p of paths) {
        const xml = await zip.file(p).async('text');
        const m = xml.match(/<[^>]+>([^<]+)<\/[^>]+>/g);
        if (m) texts.push(...m.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean));
      }
      uploadedText = texts.join('\n');
    }
    if (!uploadedText.trim()) throw new Error('No text extracted');
  } catch (e) {
    uploadedText = '';
    fileInfo.innerHTML = `<span style="color:var(--red)">Failed to extract: ${escapeHtml(f.name)}</span> <span class="fremove">✕</span>`;
    fileInfo.querySelector('.fremove').onclick = clearAttachments;
  }
});

// New session button
if (newSessBtn) {
  newSessBtn.addEventListener('click', () => {
    if (isStreaming) return;
    newSession();
  });
}

function clearFile() {
  clearAttachments();
}
if (spTemp) {
  spTemp.addEventListener('input', () => {
    const v = parseFloat(spTemp.value);
    state.temperature = v;
    spTempVal.textContent = v.toFixed(2);
    saveState();
  });
}

// ─── Encrypted storage ─────────────────────────────────────────────────
async function initSessionsFromStorage() {
  if (!sessionStoreCache.sessions[sessionStoreCache.activeId]) {
    sessionStoreCache.sessions[sessionStoreCache.activeId] = {
      name: getSessionName(state.messages),
      messages: state.messages,
      mode: state.mode,
      persona: state.persona,
      planMode: !!state.planMode,
      model: state.model,
      temperature: state.temperature,
      topP: state.topP,
      totalTokensIn: state.totalTokensIn,
      totalTokensOut: state.totalTokensOut,
      systemPrompt: state.systemPrompt,
      updatedAt: Date.now(),
    };
    await StorageCrypto.writeJson(SESSION_KEY, sessionStoreCache);
  }
  state.sessionId = sessionStoreCache.activeId;
  renderSessionList();
}

async function loadStorageIntoMemory() {
  state = parseStateFromData(await StorageCrypto.readJson(STATE_KEY, defaultStateData()));
  sessionStoreCache = await StorageCrypto.readJson(SESSION_KEY, { sessions: {}, activeId: 'default' });
  await initSessionsFromStorage();
}

function showLockOverlay() {
  lockOverlay?.classList.add('active');
  setTimeout(() => lockPassphraseInput?.focus(), 50);
}

function hideLockOverlay() {
  lockOverlay?.classList.remove('active');
  if (lockPassphraseInput) lockPassphraseInput.value = '';
  if (lockStatus) {
    lockStatus.textContent = '';
    lockStatus.className = '';
  }
}

function showLockStatus(text, type) {
  if (!lockStatus) return;
  lockStatus.textContent = text;
  lockStatus.className = 'show ' + type;
}

function updateEncryptionSettingsUI() {
  const enabled = StorageCrypto.isEnabled();
  const unlocked = StorageCrypto.isUnlocked();
  if (!encryptionStatusEl) return;
  if (!enabled) {
    encryptionStatusEl.textContent = 'Off — chats stored as plain JSON in this browser.';
    encryptionStatusEl.className = '';
  } else if (unlocked) {
    encryptionStatusEl.textContent = 'On — unlocked for this session.';
    encryptionStatusEl.className = 'on';
  } else {
    encryptionStatusEl.textContent = 'On — locked. Enter your passphrase on the lock screen.';
    encryptionStatusEl.className = 'on';
  }
  if (encryptionEnableFields) encryptionEnableFields.style.display = enabled ? 'none' : 'block';
  if (encryptionManageFields) encryptionManageFields.style.display = enabled && unlocked ? 'block' : 'none';
}

function clearSensitiveMemory() {
  state = parseStateFromData(defaultStateData());
  sessionStoreCache = { sessions: {}, activeId: 'default' };
  restoreMessages();
  renderSessionList();
  updateSidePanel();
  checkApiKey();
}

function lockStorageNow() {
  StorageCrypto.lock();
  clearSensitiveMemory();
  showLockOverlay();
  updateEncryptionSettingsUI();
}

async function unlockFromOverlay() {
  const pass = lockPassphraseInput?.value || '';
  if (!pass) {
    showLockStatus('Enter your passphrase.', 'err');
    return;
  }
  try {
    if (lockUnlockBtn) lockUnlockBtn.disabled = true;
    await StorageCrypto.unlock(pass);
    hideLockOverlay();
    if (!appBootstrapped) {
      await bootstrapApp();
    } else {
      await loadStorageIntoMemory();
      restoreMessages();
      setMode(state.mode || 'general');
      setPersona(state.persona || 'none');
      updatePlanBadge();
      updateSidePanel();
      updateStatusBar();
      rebuildSystemPrompt();
      checkApiKey();
    }
    updateEncryptionSettingsUI();
  } catch {
    showLockStatus('Wrong passphrase. Try again.', 'err');
  } finally {
    if (lockUnlockBtn) lockUnlockBtn.disabled = false;
  }
}

function validatePassphrasePair(pass, confirm, minLen = 8) {
  if ((pass || '').length < minLen) return `Passphrase must be at least ${minLen} characters.`;
  if (pass !== confirm) return 'Passphrases do not match.';
  return null;
}

lockUnlockBtn?.addEventListener('click', unlockFromOverlay);
lockPassphraseInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    unlockFromOverlay();
  }
});

enableEncryptionBtn?.addEventListener('click', async () => {
  const pass = encryptPassphraseInput?.value || '';
  const confirm = encryptPassphraseConfirmInput?.value || '';
  const err = validatePassphrasePair(pass, confirm);
  if (err) {
    showSettingsStatus(err, 'err');
    return;
  }
  try {
    await saveChain;
    await persistAllAsync();
    await StorageCrypto.enableEncryption(pass);
    await loadStorageIntoMemory();
    if (encryptPassphraseInput) encryptPassphraseInput.value = '';
    if (encryptPassphraseConfirmInput) encryptPassphraseConfirmInput.value = '';
    showSettingsStatus('Encryption enabled for local chats and API key.', 'ok');
    updateEncryptionSettingsUI();
    checkApiKey();
  } catch {
    showSettingsStatus('Could not enable encryption.', 'err');
  }
});

changePassphraseBtn?.addEventListener('click', async () => {
  const oldPass = changePassphraseOldInput?.value || '';
  const newPass = changePassphraseNewInput?.value || '';
  const confirm = changePassphraseConfirmInput?.value || '';
  if (!oldPass) {
    showSettingsStatus('Enter your current passphrase.', 'err');
    return;
  }
  const err = validatePassphrasePair(newPass, confirm);
  if (err) {
    showSettingsStatus(err, 'err');
    return;
  }
  try {
    await saveChain;
    await StorageCrypto.changePassphrase(oldPass, newPass);
    if (changePassphraseOldInput) changePassphraseOldInput.value = '';
    if (changePassphraseNewInput) changePassphraseNewInput.value = '';
    if (changePassphraseConfirmInput) changePassphraseConfirmInput.value = '';
    showSettingsStatus('Passphrase updated.', 'ok');
  } catch (e) {
    showSettingsStatus(e.message === 'WRONG_PASSPHRASE' ? 'Current passphrase is incorrect.' : 'Could not change passphrase.', 'err');
  }
});

lockNowBtn?.addEventListener('click', () => {
  lockStorageNow();
  showSettingsStatus('Locked. Enter passphrase to unlock.', 'info');
});

disableEncryptionBtn?.addEventListener('click', async () => {
  const pass = disablePassphraseInput?.value || '';
  if (!pass) {
    showSettingsStatus('Enter your passphrase to disable encryption.', 'err');
    return;
  }
  try {
    await saveChain;
    const { stateData, sessionData } = await StorageCrypto.disableEncryption(pass);
    state = parseStateFromData(stateData);
    sessionStoreCache = sessionData;
    await initSessionsFromStorage();
    if (disablePassphraseInput) disablePassphraseInput.value = '';
    restoreMessages();
    updateSidePanel();
    updateStatusBar();
    checkApiKey();
    showSettingsStatus('Encryption disabled. Data stored as plain JSON again.', 'ok');
    updateEncryptionSettingsUI();
  } catch (e) {
    showSettingsStatus(e.message === 'WRONG_PASSPHRASE' ? 'Wrong passphrase.' : 'Could not disable encryption.', 'err');
  }
});

// ─── Settings ──────────────────────────────────────────────────────────
function openSettings() {
  apiKeyInput.value = state.apiKey;
  modelSelect.value = state.model;
  systemPromptInput.value = state.systemPrompt;
  fontSizeSelect.value = state.fontSize;
  fontFamilySelect.value = state.fontFamily || '';
  if (codeThemeSelect) codeThemeSelect.value = state.codeTheme || 'atom-one-dark';
  themeSelect.value = state.theme || 'cli';
  colorSelect.value = state.colorScheme || 'sage';
  syncPlanPipelineInputs();
  updateEncryptionSettingsUI();
  settingsStatus.classList.remove('show');
  settingsOverlay.classList.add('active');
}

function closeSettings() {
  settingsOverlay.classList.remove('active');
}

settingsToggle.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showSettingsStatus('Enter an OpenRouter API key', 'err');
    return;
  }
  state.apiKey = key;
  state.model = modelSelect.value;
  state.systemPrompt = systemPromptInput.value.trim();
  readPlanPipelineInputs();
  saveState();
  showSettingsStatus('API key saved', 'ok');
  checkApiKey();
  Vision.refreshModelCache();
});

clearKeyBtn.addEventListener('click', () => {
  apiKeyInput.value = '';
  state.apiKey = '';
  saveState();
  showSettingsStatus('API key cleared', 'info');
  checkApiKey();
});

modelSelect.addEventListener('change', () => {
  state.model = modelSelect.value;
  state.systemPrompt = systemPromptInput.value.trim();
  saveState();
  updateStatusBar();
});

fontSizeSelect.addEventListener('change', () => {
  state.fontSize = fontSizeSelect.value;
  applyFontSettings();
  saveState();
});

fontFamilySelect.addEventListener('change', () => {
  state.fontFamily = fontFamilySelect.value;
  applyFontSettings();
  saveState();
});

codeThemeSelect?.addEventListener('change', () => {
  applyCodeTheme(codeThemeSelect.value);
  saveState();
});

themeSelect.addEventListener('change', () => {
  state.theme = themeSelect.value;
  applyTheme();
  saveState();
});

colorSelect.addEventListener('change', () => {
  state.colorScheme = colorSelect.value;
  applyColor();
  saveState();
});

function bindPlanPipelineInput(el, handler) {
  el?.addEventListener('change', () => {
    handler();
    saveState();
  });
}

bindPlanPipelineInput(planMinQuestionsInput, readPlanPipelineInputs);
bindPlanPipelineInput(planMaxQuestionsInput, readPlanPipelineInputs);
bindPlanPipelineInput(planParallelInput, readPlanPipelineInputs);
bindPlanPipelineInput(planQualityGateInput, readPlanPipelineInputs);
bindPlanPipelineInput(researchParallelInput, readPlanPipelineInputs);
bindPlanPipelineInput(researchQualityGateInput, readPlanPipelineInputs);

systemPromptInput.addEventListener('change', () => {
  state.systemPrompt = systemPromptInput.value.trim();
  saveState();
});

function showSettingsStatus(text, type) {
  settingsStatus.textContent = text;
  settingsStatus.className = 'show ' + type;
}

function checkApiKey() {
  sendBtn.disabled = !state.apiKey;
  if (!state.apiKey) {
    inputEl.placeholder = 'Open settings to set your OpenRouter API key...';
  } else if (state.planMode) {
    inputEl.placeholder = 'Plan mode — ask anything for structured sub-analysis...';
  } else {
    inputEl.placeholder = 'Type a message...';
  }
}

clearChatBtn.addEventListener('click', () => {
  clearCurrentChat(false);
  restoreMessages();
  showSettingsStatus('Chat cleared', 'info');
});

exportChatBtn.addEventListener('click', () => {
  if (exportConversation({ notify: false })) {
    showSettingsStatus('Chat exported as markdown', 'ok');
  } else {
    showSettingsStatus('Nothing to export yet', 'info');
  }
});

// ─── Mobile keyboard: scroll chat down when keyboard opens ─────────────
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    chatEl.scrollTop = chatEl.scrollHeight;
  });
}

// ─── Init ──────────────────────────────────────────────────────────────
async function bootstrapApp() {
  if (StorageCrypto.isEnabled() && !StorageCrypto.isUnlocked()) {
    showLockOverlay();
    updateEncryptionSettingsUI();
    return;
  }
  await loadStorageIntoMemory();
  if (appBootstrapped) return;
  appBootstrapped = true;

  checkApiKey();
  Vision.refreshModelCache();
  restoreMessages();

  const modeName = state.mode && MODES[state.mode] ? state.mode : 'general';
  const modeBadge = document.getElementById('mode-badge');
  modeBadge.textContent = modeName;
  modeBadge.className = modeName;

  const personaName = state.persona && PERSONAS[state.persona] ? state.persona : 'none';
  const personaBadge = document.getElementById('persona-badge');
  if (personaName === 'none') {
    personaBadge.className = 'none';
    personaBadge.textContent = '';
  } else {
    personaBadge.textContent = personaName;
    personaBadge.className = personaName;
  }

  updatePlanBadge();
  updateKbdHints();
  renderShortcutsTable();
  document.getElementById('plan-badge')?.addEventListener('click', () => {
    setPlanMode(!state.planMode);
    const modeDesc = describePlanPipelineMode();
    addMessage('response', state.planMode
      ? `**Plan mode ON.** ${modeDesc.charAt(0).toUpperCase()}${modeDesc.slice(1)}, then synthesis.`
      : '**Plan mode OFF.**');
  });

  applyFontSettings();
  applyCodeTheme(state.codeTheme || 'atom-one-dark');
  applyColor();
  applyTheme();
  updateStatusBar();
  rebuildSystemPrompt();
  updateEncryptionSettingsUI();

  if (!state.apiKey && state.messages.length === 0) {
    setTimeout(openSettings, 300);
  }

  inputEl.focus();
}

async function startApp() {
  if (StorageCrypto.isEnabled() && !StorageCrypto.isUnlocked()) {
    showLockOverlay();
    updateEncryptionSettingsUI();
    return;
  }
  await bootstrapApp();
}

startApp();

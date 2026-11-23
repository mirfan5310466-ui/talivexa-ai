
/* ==========================================================================
   TALIVEXA AI — Frontend Application Logic
   Created by Mr. Irfan
   ========================================================================== */

"use strict";

// ---------------- SAFE STORAGE ----------------

function safeGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeJSON(key, fallback) {
  try {
    const value = safeGet(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Storage error:", error);
  }
}

// ---------------- APPLICATION STATE ----------------

const appState = {
  token: safeGet("talivexa_token", ""),
  user: safeJSON("talivexa_user", null) || {
    name: "Mr. Irfan",
    email: "founder@talivexa.ai",
    plan: "free",
    credits: 100
  },
  chatId: null,
  chats: safeJSON("talivexa_chats", []),
  webSearchMode: false,
  docText: "",
  docName: "",
  installPromptEvent: null
};

// ---------------- INITIALIZATION ----------------

function initializeTalivexa() {
  const splash = document.getElementById("splash-screen");

  if (splash) {
    setTimeout(() => splash.classList.add("hidden"), 900);
  }

  const savedLang = safeGet("talivexa_lang", "en");
  const langEl = document.getElementById("lang-selector");

  if (langEl) {
    langEl.value = savedLang;

    if (typeof window.setLanguage === "function") {
      window.setLanguage(savedLang);
    }

    langEl.addEventListener("change", (e) => {
      if (typeof window.setLanguage === "function") {
        window.setLanguage(e.target.value);
      }
    });
  }

  refreshAccountUI();
  renderHistorySidebar();
  renderCanvasSample();
  initSW();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTalivexa);
} else {
  initializeTalivexa();
}

// ---------------- SERVICE WORKER ----------------

function initSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.warn("Service worker registration failed:", error);
    });
  }
}

// ---------------- PWA INSTALL ----------------

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  appState.installPromptEvent = e;

  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.classList.add("show");
});

async function triggerPWAInstall() {
  if (appState.installPromptEvent) {
    appState.installPromptEvent.prompt();
    await appState.installPromptEvent.userChoice;
    appState.installPromptEvent = null;

    const btn = document.getElementById("pwa-install-btn");
    if (btn) btn.classList.remove("show");
  } else {
    alert("Open Chrome menu and select Install app or Add to Home screen.");
  }
}

// ---------------- NAVIGATION ----------------

function toggleDrawer(force) {
  const sb = document.getElementById("sidebar");
  const bd = document.getElementById("sidebar-backdrop");

  if (!sb || !bd) return;

  const open = typeof force === "boolean"
    ? force
    : !sb.classList.contains("open");

  sb.classList.toggle("open", open);
  bd.classList.toggle("active", open);
}

function openSection(sectionId) {
  document.querySelectorAll(".view-panel").forEach(p => {
    p.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.remove("active");
  });

  const panel = document.getElementById("panel-" + sectionId);
  const btn = document.querySelector(
    `.nav-btn[data-sec="${sectionId}"]`
  );

  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");

  if (window.innerWidth <= 960) {
    toggleDrawer(false);
  }
}

// ---------------- ACCOUNT ----------------

function refreshAccountUI() {
  document.querySelectorAll(".js-credits").forEach(el => {
    el.textContent =
      appState.user.plan === "enterprise"
        ? "∞"
        : appState.user.credits;
  });

  document.querySelectorAll(".js-username").forEach(el => {
    el.textContent = appState.user.name;
  });

  document.querySelectorAll(".js-plan").forEach(el => {
    el.textContent =
      (appState.user.plan || "free").toUpperCase() + " PLAN";
  });
}

function spendLocalCredits(amount) {
  if (appState.user.plan === "enterprise") return true;

  if (appState.user.credits < amount) {
    alert("Not enough credits. Please visit Subscription Plans.");
    openSection("plans");
    return false;
  }

  appState.user.credits -= amount;
  safeSave("talivexa_user", appState.user);
  refreshAccountUI();

  return true;
}

// ---------------- AUTHENTICATION ----------------

function openAuth(mode = "login") {
  const modeEl = document.getElementById("auth-mode");
  const titleEl = document.getElementById("auth-title");
  const modal = document.getElementById("auth-modal");

  if (!modeEl || !titleEl || !modal) return;

  modeEl.value = mode;
  titleEl.textContent =
    mode === "signup"
      ? "Create Talivexa AI Account"
      : "Sign In to Talivexa AI";

  modal.classList.add("open");
}

function closeAuth() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("open");
}

async function handleAuthSubmit(e) {
  if (e) e.preventDefault();

  const mode = document.getElementById("auth-mode")?.value;
  const name =
    document.getElementById("auth-name")?.value.trim() || "Mr. Irfan";
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      appState.token = data.token;
      appState.user = data.user;

      try {
        localStorage.setItem("talivexa_token", data.token);
      } catch (_) {}

      safeSave("talivexa_user", data.user);
      refreshAccountUI();
      closeAuth();

      alert("Successfully authenticated with Talivexa AI.");
      return;
    }

    alert(data.message || "Authentication failed.");
  } catch (error) {
    alert("Backend unavailable. Local demo session will be used.");

    appState.user = { ...appState.user, name, email };
    safeSave("talivexa_user", appState.user);
    refreshAccountUI();
    closeAuth();
  }
}

// ---------------- CHAT & WEB SEARCH ----------------

function toggleSearchMode() {
  appState.webSearchMode = !appState.webSearchMode;

  const chip = document.getElementById("search-mode-chip");
  if (chip) {
    chip.classList.toggle("active-search", appState.webSearchMode);
  }
}

function startNewConversation() {
  appState.chatId = null;

  const stream = document.getElementById("chat-stream");
  const template = document.getElementById("chat-empty-tpl");

  if (stream && template) {
    stream.innerHTML = template.innerHTML;
  }

  openSection("chat");
}

function sendPresetPrompt(text) {
  const input = document.getElementById("chat-prompt-input");
  if (!input) return;

  input.value = text;
  submitChatPrompt();
}

async function submitChatPrompt() {
  const input = document.getElementById("chat-prompt-input");
  if (!input) return;

  const prompt = input.value.trim();
  if (!prompt) return;

  const cost = appState.webSearchMode ? 2 : 1;
  if (!spendLocalCredits(cost)) return;

  input.value = "";

  const stream = document.getElementById("chat-stream");
  if (!stream) return;

  const empty = stream.querySelector(".chat-hero-empty");
  if (empty) empty.remove();

  if (!appState.chatId) {
    appState.chatId = "session_" + Date.now();

    appState.chats.unshift({
      id: appState.chatId,
      title: prompt.slice(0, 36),
      items: []
    });
  }

  addBubble("user", prompt);
  saveChatItem("user", prompt);

  const loadId = "loading_" + Date.now();
  addBubble("ai", "Processing with Talivexa AI...", loadId);

  let reply = "";

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (appState.token) {
      headers["Authorization"] = `Bearer ${appState.token}`;
    }

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        webSearch: appState.webSearchMode,
        model:
          document.getElementById("model-selector")?.value ||
          "talivexa-gold-pro",
        lang: document.documentElement.lang
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "AI request failed");
    }

    reply =
      data.reply ||
      buildFallbackResponse(prompt, appState.webSearchMode);

    if (typeof data.creditsRemaining === "number") {
      appState.user.credits = data.creditsRemaining;
      safeSave("talivexa_user", appState.user);
      refreshAccountUI();
    }
  } catch (error) {
    console.error("AI Chat Error:", error);
    reply = buildFallbackResponse(prompt, appState.webSearchMode);
  }

  const loadEl = document.getElementById(loadId);
  if (loadEl) loadEl.remove();

  addBubble("ai", reply);
  saveChatItem("ai", reply);
  renderHistorySidebar();
}

function buildFallbackResponse(prompt, isSearch) {
  if (isSearch) {
    return `[Talivexa Web Search Mode]
Query: "${prompt}"

Configure TAVILY_API_KEY or SERPER_API_KEY on the backend to enable real-time web search.

Created by Mr. Irfan.`;
  }

  return `Talivexa AI — Created by Mr. Irfan

Your message: "${prompt}"

Configure GEMINI_API_KEY or OPENAI_API_KEY on the backend to enable genuine AI responses.`;
}

function addBubble(role, text, id = null) {
  const stream = document.getElementById("chat-stream");
  if (!stream) return;

  const row = document.createElement("div");
  row.className = `bubble-row ${role}`;

  if (id) row.id = id;

  const avatar = document.createElement("div");
  avatar.className = "avatar-badge";
  avatar.textContent =
    role === "ai"
      ? "T"
      : (appState.user.name || "U")[0].toUpperCase();

  const bubble = document.createElement("div");
  bubble.className = "bubble-text";
  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);
  stream.appendChild(row);

  stream.scrollTop = stream.scrollHeight;
}

function saveChatItem(role, text) {
  const chat = appState.chats.find(
    item => item.id === appState.chatId
  );

  if (!chat) return;

  chat.items.push({ role, text });

  appState.chats = appState.chats.slice(0, 25);
  safeSave("talivexa_chats", appState.chats);
}

function renderHistorySidebar() {
  const box = document.getElementById("history-list");
  if (!box) return;

  box.innerHTML = "";

  appState.chats.forEach(chat => {
    const el = document.createElement("div");
    el.className = "history-entry";
    el.textContent = "▸ " + chat.title;

    el.onclick = () => {
      appState.chatId = chat.id;

      const stream = document.getElementById("chat-stream");
      if (!stream) return;

      stream.innerHTML = "";

      chat.items.forEach(item => {
        addBubble(item.role, item.text);
      });

      openSection("chat");
    };

    box.appendChild(el);
  });
}

// ---------------- VOICE ASSISTANT ----------------

let voiceRec = null;

function startVoiceCapture(toChat = false) {
  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {
    alert("Voice recognition is not supported in this browser.");
    return;
  }

  voiceRec = new SR();

  const localeMap = {
    en: "en-US",
    ur: "ur-PK",
    ar: "ar-SA",
    hi: "hi-IN",
    zh: "zh-CN",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    ja: "ja-JP",
    ko: "ko-KR"
  };

  voiceRec.lang =
    localeMap[document.documentElement.lang] || "en-US";

  voiceRec.onresult = (event) => {
    const spoken = event.results[0][0].transcript;

    if (toChat) {
      const input = document.getElementById("chat-prompt-input");
      if (input) {
        input.value = spoken;
        submitChatPrompt();
      }
    } else {
      const heard = document.getElementById("voice-heard");
      const answer = document.getElementById("voice-answer");

      if (heard) heard.textContent = "Heard: " + spoken;

      const output = buildFallbackResponse(spoken, false);

      if (answer) answer.textContent = output;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(output)
        );
      }
    }
  };

  voiceRec.onerror = (event) => {
    console.error("Voice recognition error:", event.error);
    alert("Voice recognition error: " + event.error);
  };

  voiceRec.start();
}

// ---------------- IMAGE STUDIO ----------------

function renderCanvasSample() {
  generateStudioImage(
    "Talivexa Golden Crown Core",
    "gold_obsidian",
    true
  );
}

async function generateStudioImage(
  overridePrompt,
  overrideStyle,
  skipCredit = false
) {
  const prompt =
    overridePrompt ||
    document.getElementById("img-prompt")?.value.trim() ||
    "Golden Temple in Dark Obsidian";

  const style =
    overrideStyle ||
    document.getElementById("img-style")?.value;

  if (!skipCredit && !spendLocalCredits(3)) return;

  const canvas = document.getElementById("studio-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const palettes = {
    gold_obsidian: ["#070709", "#3b2c06", "#eab308", "#fef08a"],
    violet_royal: ["#08060e", "#3b0764", "#a855f7", "#f5d0fe"],
    emerald_cyber: ["#050b09", "#064e3b", "#10b981", "#a7f3d0"],
    crimson_forge: ["#0c0607", "#4c0519", "#f43f5e", "#fecdd3"]
  };

  const pal = palettes[style] || palettes.gold_obsidian;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, pal[0]);
  grad.addColorStop(0.5, pal[1]);
  grad.addColorStop(1, pal[0]);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  let seed = 7;

  for (let i = 0; i < prompt.length; i++) {
    seed = (seed * 37 + prompt.charCodeAt(i)) % 999983;
  }

  const nextR = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 16; i++) {
    const x = nextR() * w;
    const y = nextR() * h;
    const rad = 24 + nextR() * 120;

    const rg = ctx.createRadialGradient(x, y, 2, x, y, rad);
    rg.addColorStop(0, pal[2] + "99");
    rg.addColorStop(1, "transparent");

    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = pal[3] + "55";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = "rgba(7,7,9,0.78)";
  ctx.fillRect(0, h - 44, w, 44);

  ctx.fillStyle = pal[3];
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(
    `TALIVEXA AI • ${prompt.slice(0, 42)}`,
    14,
    h - 17
  );
}

function downloadStudioPNG() {
  const canvas = document.getElementById("studio-canvas");
  if (!canvas) return;

  const a = document.createElement("a");
  a.download = `talivexa-${Date.now()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// ---------------- PDF & DOCUMENT ANALYZER ----------------

function readUploadedDoc(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  appState.docName = file.name;

  const status = document.getElementById("doc-status");
  if (status) status.textContent = `Selected: ${file.name}`;

  const reader = new FileReader();

  reader.onload = (event) => {
    const raw = event.target.result || "";

    appState.docText = String(raw)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000);

    const preview = document.getElementById("doc-preview");

    if (preview) {
      preview.textContent =
        appState.docText.slice(0, 600) ||
        "PDF text extraction requires a backend PDF parser.";
    }
  };

  reader.onerror = () => {
    alert("Unable to read this document.");
  };

  reader.readAsText(file);
}

function queryDocument() {
  const q =
    document.getElementById("doc-q")?.value.trim();

  if (!q || !appState.docText) {
    alert("Upload a document and type a question.");
    return;
  }

  if (!spendLocalCredits(1)) return;

  const words = q.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3);

  const matches = appState.docText
    .split(/[.!?]+/)
    .filter(sentence =>
      words.some(word =>
        sentence.toLowerCase().includes(word)
      )
    )
    .slice(0, 3);

  const answer = document.getElementById("doc-ans");

  if (answer) {
    answer.textContent = matches.length
      ? matches.join(".\n")
      : "No direct keyword match found in document text.";
  }
}

// ---------------- SMART AI TOOLS ----------------

function executeSmartTool() {
  const kind =
    document.getElementById("smart-kind")?.value;

  const topic =
    document.getElementById("smart-topic")?.value.trim();

  if (!topic) {
    alert("Please enter a topic.");
    return;
  }

  if (!spendLocalCredits(1)) return;

  const map = {
    script: `// Talivexa AI Workflow
export async function runWorkflow(input) {
  return {
    creator: "Mr. Irfan",
    platform: "Talivexa AI",
    topic: ${JSON.stringify(topic)},
    input
  };
}`,

    copy: `✦ ${topic} — Created by Mr. Irfan

• Professional headline for your project.
• Clear call-to-action.
• Prepared with Talivexa AI.`,

    summary: `Executive Brief: "${topic}"

1. Objective & Scope
2. Security & Scalability
3. Next Milestones`
  };

  const output = document.getElementById("smart-out");

  if (output) {
    output.textContent = map[kind] || map.script;
  }
}

// ---------------- PROFILE SETTINGS ----------------

function saveProfileSettings() {
  const newName =
    document.getElementById("prof-name")?.value.trim();

  const newEmail =
    document.getElementById("prof-email")?.value.trim();

  if (newName) appState.user.name = newName;
  if (newEmail) appState.user.email = newEmail;

  safeSave("talivexa_user", appState.user);
  refreshAccountUI();

  alert("Profile settings updated.");
}

// ---------------- SUBSCRIPTIONS ----------------

async function chooseSubscription(plan) {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });

    const data = await res.json();

    if (res.ok && data.checkoutUrl) {
      window.open(data.checkoutUrl, "_blank");
      return;
    }
  } catch (error) {
    console.warn("Payment backend unavailable:", error);
  }

  appState.user.plan = plan;

  appState.user.credits =
    plan === "pro"
      ? 2000
      : plan === "enterprise"
        ? 999999
        : 100;

  safeSave("talivexa_user", appState.user);
  refreshAccountUI();

  alert(
    `Switched to ${plan.toUpperCase()} in DEMO mode. ` +
    "Live payments are not configured."
  );
}

// ---------------- LOGOUT ----------------

function logoutUser() {
  appState.token = "";

  appState.user = {
    name: "Mr. Irfan",
    email: "founder@talivexa.ai",
    plan: "free",
    credits: 100
  };

  try {
    localStorage.removeItem("talivexa_token");
    localStorage.removeItem("talivexa_user");
  } catch (_) {}

  refreshAccountUI();
  closeAuth();

  alert("Logged out successfully.");
}

// ---------------- GLOBAL FUNCTION EXPORTS ----------------

window.appState = appState;

window.triggerPWAInstall = triggerPWAInstall;
window.toggleDrawer = toggleDrawer;
window.openSection = openSection;
window.refreshAccountUI = refreshAccountUI;
window.spendLocalCredits = spendLocalCredits;

window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.handleAuthSubmit = handleAuthSubmit;
window.logoutUser = logoutUser;

window.toggleSearchMode = toggleSearchMode;
window.startNewConversation = startNewConversation;
window.sendPresetPrompt = sendPresetPrompt;
window.submitChatPrompt = submitChatPrompt;

window.startVoiceCapture = startVoiceCapture;

window.renderCanvasSample = renderCanvasSample;
window.generateStudioImage = generateStudioImage;
window.downloadStudioPNG = downloadStudioPNG;

window.readUploadedDoc = readUploadedDoc;
window.queryDocument = queryDocument;

window.executeSmartTool = executeSmartTool;

window.saveProfileSettings = saveProfileSettings;
window.chooseSubscription = chooseSubscription;

console.log("Talivexa AI frontend initialized — Created by Mr. Irfan");

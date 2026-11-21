/* ==========================================================================
   TALIVEXA AI — Frontend Application Logic
   Created by Mr. Irfan
   Communicates with Express Backend (/api/*) with safe fallback when offline
   ========================================================================== */

const appState = {
  token: localStorage.getItem("talivexa_token") || "",
  user: JSON.parse(localStorage.getItem("talivexa_user") || "null") || {
    name: "Mr. Irfan",
    email: "founder@talivexa.ai",
    plan: "free",
    credits: 100
  },
  chatId: null,
  chats: JSON.parse(localStorage.getItem("talivexa_chats") || "[]"),
  webSearchMode: false,
  docText: "",
  docName: "",
  installPromptEvent: null
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const sp = document.getElementById("splash-screen");
    if (sp) sp.classList.add("hidden");
  }, 900);

  const savedLang = localStorage.getItem("talivexa_lang") || "en";
  const langEl = document.getElementById("lang-selector");
  if (langEl) {
    langEl.value = savedLang;
    setLanguage(savedLang);
    langEl.addEventListener("change", (e) => setLanguage(e.target.value));
  }

  refreshAccountUI();
  renderHistorySidebar();
  renderCanvasSample();
  initSW();
});

function initSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

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
    document.getElementById("pwa-install-btn").classList.remove("show");
  } else {
    alert("On Android Chrome: tap the 3-dot menu (⋮) -> 'Install app' or 'Add to Home screen'.");
  }
}

function toggleDrawer(force) {
  const sb = document.getElementById("sidebar");
  const bd = document.getElementById("sidebar-backdrop");
  const open = typeof force === "boolean" ? force : !sb.classList.contains("open");
  sb.classList.toggle("open", open);
  bd.classList.toggle("active", open);
}

function openSection(sectionId) {
  document.querySelectorAll(".view-panel").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));

  const panel = document.getElementById("panel-" + sectionId);
  const btn = document.querySelector(`.nav-btn[data-sec="${sectionId}"]`);
  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");

  if (window.innerWidth <= 960) toggleDrawer(false);
}

function refreshAccountUI() {
  document.querySelectorAll(".js-credits").forEach((el) => {
    el.textContent = appState.user.plan === "enterprise" ? "∞" : appState.user.credits;
  });
  document.querySelectorAll(".js-username").forEach((el) => {
    el.textContent = appState.user.name;
  });
  document.querySelectorAll(".js-plan").forEach((el) => {
    el.textContent = (appState.user.plan || "free").toUpperCase() + " PLAN";
  });
}

function spendLocalCredits(n) {
  if (appState.user.plan === "enterprise") return true;
  if (appState.user.credits < n) {
    alert("Not enough credits. Please visit Subscription Plans.");
    openSection("plans");
    return false;
  }
  appState.user.credits -= n;
  localStorage.setItem("talivexa_user", JSON.stringify(appState.user));
  refreshAccountUI();
  return true;
}

// ---------------- AUTHENTICATION ----------------
function openAuth(mode = "login") {
  document.getElementById("auth-mode").value = mode;
  document.getElementById("auth-title").textContent = mode === "signup" ? "Create Talivexa AI Account" : "Sign In to Talivexa AI";
  document.getElementById("auth-modal").classList.add("open");
}

function closeAuth() {
  document.getElementById("auth-modal").classList.remove("open");
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById("auth-mode").value;
  const name = document.getElementById("auth-name").value.trim() || "Mr. Irfan";
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

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
      localStorage.setItem("talivexa_token", data.token);
      localStorage.setItem("talivexa_user", JSON.stringify(data.user));
      refreshAccountUI();
      closeAuth();
      alert("Authenticated with Talivexa AI backend.");
      return;
    }
  } catch (_) {}

  // Offline / static preview session fallback
  appState.user = { ...appState.user, name, email };
  localStorage.setItem("talivexa_user", JSON.stringify(appState.user));
  refreshAccountUI();
  closeAuth();
  alert("Saved profile session locally. Start the Node.js backend for JWT & database persistence.");
}

// ---------------- CHAT & WEB SEARCH ----------------
function toggleSearchMode() {
  appState.webSearchMode = !appState.webSearchMode;
  const chip = document.getElementById("search-mode-chip");
  if (chip) chip.classList.toggle("active-search", appState.webSearchMode);
}

function startNewConversation() {
  appState.chatId = null;
  const stream = document.getElementById("chat-stream");
  stream.innerHTML = document.getElementById("chat-empty-tpl").innerHTML;
  openSection("chat");
}

function sendPresetPrompt(text) {
  document.getElementById("chat-prompt-input").value = text;
  submitChatPrompt();
}

async function submitChatPrompt() {
  const input = document.getElementById("chat-prompt-input");
  const prompt = input.value.trim();
  if (!prompt) return;

  const cost = appState.webSearchMode ? 2 : 1;
  if (!spendLocalCredits(cost)) return;

  input.value = "";
  const stream = document.getElementById("chat-stream");
  const empty = stream.querySelector(".chat-hero-empty");
  if (empty) empty.remove();

  if (!appState.chatId) {
    appState.chatId = "session_" + Date.now();
    appState.chats.unshift({ id: appState.chatId, title: prompt.slice(0, 36), items: [] });
  }

  addBubble("user", prompt);
  saveChatItem("user", prompt);

  const loadId = "loading_" + Date.now();
  addBubble("ai", "Processing with Talivexa AI...", loadId);

  let reply = "";
  try {
    const headers = { "Content-Type": "application/json" };
    if (appState.token) headers["Authorization"] = `Bearer ${appState.token}`;

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        webSearch: appState.webSearchMode,
        model: document.getElementById("model-selector")?.value || "talivexa-gold-pro",
        lang: document.documentElement.lang
      })
    });
    const data = await res.json();
    reply = data.reply || buildFallbackResponse(prompt, appState.webSearchMode);
    if (typeof data.creditsRemaining === "number") {
      appState.user.credits = data.creditsRemaining;
      localStorage.setItem("talivexa_user", JSON.stringify(appState.user));
      refreshAccountUI();
    }
  } catch (_) {
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

• Configure TAVILY_API_KEY or SERPER_API_KEY in .env on the backend server to pull real-time web results and citations.
• Built by Mr. Irfan for Talivexa AI.`;
  }
  return `Talivexa AI (Created by Mr. Irfan):

Response for "${prompt}":
• Add your GEMINI_API_KEY or OPENAI_API_KEY in the server .env file so /api/ai/chat returns live model responses securely from the server.`;
}

function addBubble(role, text, id = null) {
  const stream = document.getElementById("chat-stream");
  const row = document.createElement("div");
  row.className = `bubble-row ${role}`;
  if (id) row.id = id;

  const av = document.createElement("div");
  av.className = "avatar-badge";
  av.textContent = role === "ai" ? "T" : (appState.user.name || "U")[0].toUpperCase();

  const b = document.createElement("div");
  b.className = "bubble-text";
  b.textContent = text;

  row.appendChild(av);
  row.appendChild(b);
  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
}

function saveChatItem(role, text) {
  const c = appState.chats.find((x) => x.id === appState.chatId);
  if (c) {
    c.items.push({ role, text });
    localStorage.setItem("talivexa_chats", JSON.stringify(appState.chats.slice(0, 25)));
  }
}

function renderHistorySidebar() {
  const box = document.getElementById("history-list");
  if (!box) return;
  box.innerHTML = "";
  appState.chats.forEach((c) => {
    const el = document.createElement("div");
    el.className = "history-entry";
    el.textContent = "▸ " + c.title;
    el.onclick = () => {
      appState.chatId = c.id;
      const stream = document.getElementById("chat-stream");
      stream.innerHTML = "";
      c.items.forEach((m) => addBubble(m.role, m.text));
      openSection("chat");
    };
    box.appendChild(el);
  });
}

// ---------------- VOICE ASSISTANT ----------------
let voiceRec = null;
function startVoiceCapture(toChat = false) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Voice recognition is not supported on this browser.");
    return;
  }
  voiceRec = new SR();
  const localeMap = {
    en: "en-US", ur: "ur-PK", ar: "ar-SA", hi: "hi-IN", zh: "zh-CN",
    fr: "fr-FR", es: "es-ES", de: "de-DE", ja: "ja-JP", ko: "ko-KR"
  };
  voiceRec.lang = localeMap[document.documentElement.lang] || "en-US";
  voiceRec.onresult = (ev) => {
    const spoken = ev.results[0][0].transcript;
    if (toChat) {
      document.getElementById("chat-prompt-input").value = spoken;
      submitChatPrompt();
    } else {
      document.getElementById("voice-heard").textContent = "Heard: " + spoken;
      const out = buildFallbackResponse(spoken, false);
      document.getElementById("voice-answer").textContent = out;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(out));
      }
    }
  };
  voiceRec.start();
}

// ---------------- IMAGE STUDIO (VIOLET/GOLD CANVAS + API HOOK) ----------------
function renderCanvasSample() {
  generateStudioImage("Talivexa Golden Crown Core", "gold_obsidian", true);
}

async function generateStudioImage(overridePrompt, overrideStyle, skipCredit = false) {
  const prompt = overridePrompt || document.getElementById("img-prompt").value.trim() || "Golden Temple in Dark Obsidian";
  const style = overrideStyle || document.getElementById("img-style").value;
  if (!skipCredit && !spendLocalCredits(3)) return;

  const canvas = document.getElementById("studio-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

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
  for (let i = 0; i < prompt.length; i++) seed = (seed * 37 + prompt.charCodeAt(i)) % 999983;
  const nextR = () => (seed = (seed * 48271) % 2147483647) / 2147483647;

  for (let i = 0; i < 16; i++) {
    const x = nextR() * w, y = nextR() * h, rad = 24 + nextR() * 120;
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
  ctx.fillText(`TALIVEXA AI • ${prompt.slice(0, 42)}`, 14, h - 17);
}

function downloadStudioPNG() {
  const c = document.getElementById("studio-canvas");
  const a = document.createElement("a");
  a.download = `talivexa-${Date.now()}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

// ---------------- PDF & DOCUMENT ANALYZER ----------------
function readUploadedDoc(e) {
  const file = e.target.files[0];
  if (!file) return;
  appState.docName = file.name;
  document.getElementById("doc-status").textContent = `Selected: ${file.name}`;
  const fr = new FileReader();
  fr.onload = (ev) => {
    const raw = ev.target.result || "";
    appState.docText = raw.replace(/[^ -~؀-ۿ

	]/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
    document.getElementById("doc-preview").textContent = appState.docText.slice(0, 600) || "Binary PDF uploaded. Add backend PDF parser or Gemini file API for full extraction.";
  };
  fr.readAsText(file);
}

function queryDocument() {
  const q = document.getElementById("doc-q").value.trim();
  if (!q || !appState.docText) {
    alert("Upload a document and type a question.");
    return;
  }
  if (!spendLocalCredits(1)) return;
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const matches = appState.docText.split(/[.!?]+/).filter((s) => words.some((w) => s.toLowerCase().includes(w))).slice(0, 3);
  document.getElementById("doc-ans").textContent = matches.length ? matches.join(".
") : "No direct keyword match found in preview text.";
}

// ---------------- SMART AI TOOLS ----------------
function executeSmartTool() {
  const kind = document.getElementById("smart-kind").value;
  const topic = document.getElementById("smart-topic").value.trim();
  if (!topic || !spendLocalCredits(1)) return;

  const map = {
    script: `// Talivexa AI Automation Script for: ${topic}
export async function runWorkflow(input) {
  return { creator: "Mr. Irfan", platform: "Talivexa AI", topic: "${topic}", input };
}`,
    copy: `✦ ${topic} — Crafted with Talivexa AI by Mr. Irfan
• Bold headline ready for landing pages and campaigns.
• Clear call-to-action focused on real user value.`,
    summary: `Executive Brief on "${topic}":
1. Objective & Scope
2. Security & Scalability
3. Next Milestones`
  };
  document.getElementById("smart-out").textContent = map[kind] || map.script;
}

// ---------------- PROFILE & PLANS ----------------
function saveProfileSettings() {
  const newName = document.getElementById("prof-name").value.trim();
  const newEmail = document.getElementById("prof-email").value.trim();
  if (newName) appState.user.name = newName;
  if (newEmail) appState.user.email = newEmail;
  localStorage.setItem("talivexa_user", JSON.stringify(appState.user));
  refreshAccountUI();
  alert("Profile settings updated.");
}

async function chooseSubscription(plan) {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.open(data.checkoutUrl, "_blank");
      return;
    }
  } catch (_) {}

  appState.user.plan = plan;
  appState.user.credits = plan === "pro" ? 2000 : plan === "enterprise" ? 999999 : 100;
  localStorage.setItem("talivexa_user", JSON.stringify(appState.user));
  refreshAccountUI();
  alert(`Switched to ${plan.toUpperCase()} plan in demo mode. Connect Stripe/LemonSqueezy keys in .env for live payments.`);
}

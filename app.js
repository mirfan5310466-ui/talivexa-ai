/* ==========================================================================
   TALIVEXA AI — Frontend Application Logic
   Created by Mr. Irfan
   Updated Version — Chat Input + Send + API Connection
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
    return true;
  } catch (error) {
    return false;
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

function hideSplashScreen() {
  const splash = document.getElementById("splash-screen");

  if (splash) {
    setTimeout(() => {
      splash.style.display = "none";
      splash.classList.add("hidden");
    }, 900);
  }
}


function initializeTalivexa() {
  const savedLang = safeGet("talivexa_lang", "en");
  const langEl = document.getElementById("lang-selector");

  if (langEl) {
    langEl.value = savedLang;

    langEl.addEventListener("change", (event) => {
      safeSave("talivexa_lang", event.target.value);

      if (typeof window.setLanguage === "function") {
        window.setLanguage(event.target.value);
      }
    });
  }

  refreshAccountUI();
  renderHistorySidebar();
  renderCanvasSample();
  initSW();
  initializeChatComposer();
}


// ---------------- CHAT COMPOSER ----------------

function initializeChatComposer() {
  const input = document.getElementById("chat-prompt-input");
  const sendButton = document.querySelector(".send-gold");

  if (!input) {
    return;
  }

  // Prevent duplicate event listeners
  if (input.dataset.talivexaBound === "true") {
    return;
  }

  input.dataset.talivexaBound = "true";

  // Enable typing and Enter-to-send
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitChatPrompt();
    }
  });

  // Auto resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 130) + "px";
  });

  // Direct Send button handler
  if (sendButton && sendButton.dataset.talivexaBound !== "true") {
    sendButton.dataset.talivexaBound = "true";

    sendButton.addEventListener("click", (event) => {
      event.preventDefault();
      submitChatPrompt();
    });
  }
}


// ---------------- API HELPERS ----------------

async function apiRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (appState.token) {
    headers.Authorization = `Bearer ${appState.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType =
    response.headers.get("content-type") || "";

  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = {
      message: text
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed: ${response.status}`
    );
  }

  return data;
}


// ---------------- SERVICE WORKER ----------------

function initSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {});
  }
}


// ---------------- NAVIGATION ----------------

function toggleDrawer(force) {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (!sidebar || !backdrop) {
    return;
  }

  const open =
    typeof force === "boolean"
      ? force
      : !sidebar.classList.contains("open");

  sidebar.classList.toggle("open", open);
  backdrop.classList.toggle("active", open);
}


function openSection(sectionId) {
  document
    .querySelectorAll(".view-panel")
    .forEach((panel) => {
      panel.classList.remove("active");
    });

  document
    .querySelectorAll(".nav-btn")
    .forEach((button) => {
      button.classList.remove("active");
    });

  const panel = document.getElementById(
    "panel-" + sectionId
  );

  const button = document.querySelector(
    `.nav-btn[data-sec="${sectionId}"]`
  );

  if (panel) {
    panel.classList.add("active");
  }

  if (button) {
    button.classList.add("active");
  }

  if (window.innerWidth <= 960) {
    toggleDrawer(false);
  }

  // Re-bind chat input whenever chat section opens
  if (sectionId === "chat") {
    setTimeout(() => {
      initializeChatComposer();

      const input =
        document.getElementById("chat-prompt-input");

      if (input) {
        input.focus();
      }
    }, 50);
  }
}


// ---------------- ACCOUNT ----------------

function refreshAccountUI() {
  if (!appState.user) {
    return;
  }

  document
    .querySelectorAll(".js-credits")
    .forEach((element) => {
      element.textContent =
        appState.user.plan === "enterprise"
          ? "∞"
          : Number(appState.user.credits || 0);
    });

  document
    .querySelectorAll(".js-username")
    .forEach((element) => {
      element.textContent =
        appState.user.name || "User";
    });

  document
    .querySelectorAll(".js-plan")
    .forEach((element) => {
      element.textContent =
        (appState.user.plan || "free").toUpperCase() +
        " PLAN";
    });
}


function spendLocalCredits(amount) {
  amount = Math.max(
    0,
    Number(amount) || 0
  );

  if (appState.user.plan === "enterprise") {
    return true;
  }

  const credits =
    Number(appState.user.credits || 0);

  if (credits < amount) {
    alert(
      "Not enough credits. Please visit Subscription Plans."
    );

    openSection("plans");
    return false;
  }

  appState.user.credits =
    credits - amount;

  safeSave(
    "talivexa_user",
    appState.user
  );

  refreshAccountUI();

  return true;
}


// ---------------- AUTHENTICATION ----------------

function openAuth(mode = "login") {
  const modal =
    document.getElementById("auth-modal");

  if (!modal) {
    alert(
      "Authentication system requires backend setup."
    );
    return;
  }

  modal.classList.add("active");

  if (mode) {
    modal.dataset.mode = mode;
  }
}


// ---------------- CHAT & WEB SEARCH ----------------

function toggleSearchMode() {
  appState.webSearchMode =
    !appState.webSearchMode;

  const chip =
    document.getElementById(
      "search-mode-chip"
    );

  if (chip) {
    chip.classList.toggle(
      "active-search",
      appState.webSearchMode
    );
  }
}


function startNewConversation() {
  appState.chatId = null;

  const stream =
    document.getElementById("chat-stream");

  const template =
    document.getElementById("chat-empty-tpl");

  if (stream && template) {
    stream.innerHTML =
      template.innerHTML;
  }

  openSection("chat");
}


function sendPresetPrompt(text) {
  const input =
    document.getElementById(
      "chat-prompt-input"
    );

  if (!input) {
    return;
  }

  input.value = text;

  input.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );

  submitChatPrompt();
}


// ---------------- MAIN CHAT FUNCTION ----------------

async function submitChatPrompt() {
  const input =
    document.getElementById(
      "chat-prompt-input"
    );

  if (!input) {
    console.error(
      "Talivexa: chat input not found."
    );
    return;
  }

  const prompt =
    String(input.value || "").trim();

  if (!prompt) {
    return;
  }

  const cost =
    appState.webSearchMode
      ? 2
      : 1;

  if (!spendLocalCredits(cost)) {
    return;
  }

  const stream =
    document.getElementById(
      "chat-stream"
    );

  if (!stream) {
    alert(
      "Chat area is not available."
    );
    return;
  }

  // Clear input immediately
  input.value = "";
  input.style.height = "auto";

  const empty =
    stream.querySelector(
      ".chat-hero-empty"
    );

  if (empty) {
    empty.remove();
  }

  // Create chat session
  if (!appState.chatId) {
    appState.chatId =
      "session_" + Date.now();

    appState.chats.unshift({
      id: appState.chatId,
      title: prompt.slice(0, 36),
      items: []
    });
  }

  // Show user's message
  addBubble(
    "user",
    prompt
  );

  saveChatItem(
    "user",
    prompt
  );

  // Show loading message
  const loadId =
    "loading_" + Date.now();

  addBubble(
    "ai",
    "Processing with Talivexa AI...",
    loadId
  );

  let reply = "";

  try {
    /*
      IMPORTANT:
      Backend route in this project is:
      POST /api/chat

      NOT:
      /api/ai/chat
    */

    const data =
      await apiRequest(
        "/api/chat",
        {
          method: "POST",

          body: JSON.stringify({
            prompt: prompt,

            webSearch:
              appState.webSearchMode,

            model:
              document.getElementById(
                "model-selector"
              )?.value ||
              "talivexa-gold-pro",

            lang:
              document.documentElement
                .lang || "en"
          })
        }
      );

    reply =
      data.reply ||
      data.message ||
      "Talivexa AI received your message, but no reply was returned.";

    if (
      typeof data.creditsRemaining ===
      "number"
    ) {
      appState.user.credits =
        data.creditsRemaining;

      safeSave(
        "talivexa_user",
        appState.user
      );

      refreshAccountUI();
    }

  } catch (error) {

    console.error(
      "Talivexa AI API Error:",
      error
    );

    reply =
      "Talivexa AI could not connect to the AI backend. Please check the backend API configuration.";

  }

  // Remove loading message
  const loadingElement =
    document.getElementById(loadId);

  if (loadingElement) {
    loadingElement.remove();
  }

  // Show AI response
  addBubble(
    "ai",
    reply
  );

  saveChatItem(
    "ai",
    reply
  );

  renderHistorySidebar();
}


// ---------------- CHAT BUBBLES ----------------

function addBubble(
  role,
  text,
  id = null
) {
  const stream =
    document.getElementById(
      "chat-stream"
    );

  if (!stream) {
    return;
  }

  const row =
    document.createElement("div");

  row.className =
    `bubble-row ${role}`;

  if (id) {
    row.id = id;
  }

  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar-badge";

  avatar.textContent =
    role === "ai"
      ? "T"
      : (
          appState.user.name ||
          "U"
        )[0].toUpperCase();

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble-text";

  bubble.textContent =
    String(text);

  row.appendChild(avatar);
  row.appendChild(bubble);

  stream.appendChild(row);

  stream.scrollTop =
    stream.scrollHeight;
}


// ---------------- SAVE CHAT ----------------

function saveChatItem(
  role,
  text
) {
  const chat =
    appState.chats.find(
      (item) =>
        item.id === appState.chatId
    );

  if (!chat) {
    return;
  }

  if (!Array.isArray(chat.items)) {
    chat.items = [];
  }

  chat.items.push({
    role,
    text
  });

  appState.chats =
    appState.chats.slice(
      0,
      25
    );

  safeSave(
    "talivexa_chats",
    appState.chats
  );
}


// ---------------- HISTORY ----------------

function renderHistorySidebar() {
  const box =
    document.getElementById(
      "history-list"
    );

  if (!box) {
    return;
  }

  box.innerHTML = "";

  appState.chats.forEach(
    (chat) => {

      const element =
        document.createElement(
          "div"
        );

      element.className =
        "history-entry";

      element.textContent =
        "▸ " + chat.title;

      element.addEventListener(
        "click",
        () => {

          appState.chatId =
            chat.id;

          const stream =
            document.getElementById(
              "chat-stream"
            );

          if (!stream) {
            return;
          }

          stream.innerHTML = "";

          (
            chat.items || []
          ).forEach(
            (item) => {
              addBubble(
                item.role,
                item.text
              );
            }
          );

          openSection("chat");
        }
      );

      box.appendChild(
        element
      );
    }
  );
}


// ---------------- VOICE ASSISTANT ----------------

let voiceRec = null;


function startVoiceCapture(
  toChat = false
) {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Voice recognition is not supported in this browser."
    );
    return;
  }

  voiceRec =
    new SpeechRecognition();

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
    localeMap[
      document.documentElement.lang
    ] || "en-US";

  voiceRec.onresult =
    (event) => {

      const spoken =
        event.results[0][0]
          .transcript;

      if (toChat) {

        const input =
          document.getElementById(
            "chat-prompt-input"
          );

        if (input) {

          input.value =
            spoken;

          input.dispatchEvent(
            new Event(
              "input",
              {
                bubbles: true
              }
            )
          );

          submitChatPrompt();
        }

      } else {

        const heard =
          document.getElementById(
            "voice-heard"
          );

        const answer =
          document.getElementById(
            "voice-answer"
          );

        if (heard) {
          heard.textContent =
            "Heard: " + spoken;
        }

        const output =
          "You said: " +
          spoken +
          ". Connect the AI backend to receive an AI-generated answer.";

        if (answer) {
          answer.textContent =
            output;
        }

        if (
          "speechSynthesis" in
          window
        ) {
          window.speechSynthesis
            .cancel();

          window.speechSynthesis
            .speak(
              new SpeechSynthesisUtterance(
                output
              )
            );
        }
      }
    };

  voiceRec.onerror =
    (event) => {
      alert(
        "Voice recognition error: " +
        event.error
      );
    };

  try {
    voiceRec.start();
  } catch (error) {}
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
    document
      .getElementById(
        "img-prompt"
      )
      ?.value.trim() ||
    "Golden Temple in Dark Obsidian";

  const style =
    overrideStyle ||
    document.getElementById(
      "img-style"
    )?.value;

  if (
    !skipCredit &&
    !spendLocalCredits(3)
  ) {
    return;
  }

  const canvas =
    document.getElementById(
      "studio-canvas"
    );

  if (!canvas) {
    return;
  }

  const context =
    canvas.getContext("2d");

  if (!context) {
    return;
  }

  const width =
    canvas.width;

  const height =
    canvas.height;

  const palettes = {
    gold_obsidian: [
      "#070709",
      "#3b2c06",
      "#eab308",
      "#fef08a"
    ],

    violet_royal: [
      "#08060e",
      "#3b0764",
      "#a855f7",
      "#f5d0fe"
    ],

    emerald_cyber: [
      "#050b09",
      "#064e3b",
      "#10b981",
      "#a7f3d0"
    ],

    crimson_forge: [
      "#0c0607",
      "#4c0519",
      "#f43f5e",
      "#fecdd3"
    ]
  };

  const palette =
    palettes[style] ||
    palettes.gold_obsidian;

  const gradient =
    context.createLinearGradient(
      0,
      0,
      width,
      height
    );

  gradient.addColorStop(
    0,
    palette[0]
  );

  gradient.addColorStop(
    0.5,
    palette[1]
  );

  gradient.addColorStop(
    1,
    palette[0]
  );

  context.fillStyle =
    gradient;

  context.fillRect(
    0,
    0,
    width,
    height
  );

  let seed = 7;

  for (
    let i = 0;
    i < prompt.length;
    i++
  ) {
    seed =
      (
        seed * 37 +
        prompt.charCodeAt(i)
      ) % 999983;
  }

  const nextRandom =
    () => {
      seed =
        (
          seed * 48271
        ) % 2147483647;

      return (
        seed /
        2147483647
      );
    };

  for (
    let i = 0;
    i < 16;
    i++
  ) {
    const x =
      nextRandom() *
      width;

    const y =
      nextRandom() *
      height;

    const radius =
      24 +
      nextRandom() *
      120;

    const radialGradient =
      context.createRadialGradient(
        x,
        y,
        2,
        x,
        y,
        radius
      );

    radialGradient.addColorStop(
      0,
      palette[2] +
        "99"
    );

    radialGradient.addColorStop(
      1,
      "transparent"
    );

    context.fillStyle =
      radialGradient;

    context.beginPath();

    context.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    context.fill();
  }

  context.strokeStyle =
    palette[3] + "55";

  context.lineWidth = 2;

  context.strokeRect(
    18,
    18,
    width - 36,
    height - 36
  );

  context.fillStyle =
    "rgba(7,7,9,0.78)";

  context.fillRect(
    0,
    height - 44,
    width,
    44
  );

  context.fillStyle =
    palette[3];

  context.font =
    "bold 13px sans-serif";

  context.fillText(
    `TALIVEXA AI • ${prompt.slice(
      0,
      42
    )}`,
    14,
    height - 17
  );
}


function downloadStudioPNG() {
  const canvas =
    document.getElementById(
      "studio-canvas"
    );

  if (!canvas) {
    return;
  }

  try {

    const link =
      document.createElement(
        "a"
      );

    link.download =
      `talivexa-${Date.now()}.png`;

    link.href =
      canvas.toDataURL(
        "image/png"
      );

    link.click();

  } catch (error) {

    alert(
      "Unable to download the image."
    );

  }
}


// ---------------- PDF & DOCUMENT ANALYZER ----------------

function readUploadedDoc(event) {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  appState.docName =
    file.name;

  const status =
    document.getElementById(
      "doc-status"
    );

  if (status) {
    status.textContent =
      `Selected: ${file.name}`;
  }

  const reader =
    new FileReader();

  reader.onload =
    (loadEvent) => {

      const raw =
        loadEvent.target.result ||
        "";

      appState.docText =
        String(raw)
          .replace(
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim()
          .slice(
            0,
            20000
          );

      const preview =
        document.getElementById(
          "doc-preview"
        );

      if (preview) {
        preview.textContent =
          appState.docText.slice(
            0,
            600
          ) ||
          "PDF text extract

/*
 * Adorato Wines chat widget.
 *
 * Drop this on your site with:
 *   <script src="https://YOUR-CDN-OR-HOST/adorato-chat-widget.js"
 *           data-api-url="https://YOUR-BACKEND-URL"
 *           defer></script>
 *
 * It renders a floating chat bubble in the corner of the page and talks
 * to your backend's /api/chat endpoint (see server/server.js).
 */
(function () {
  var scriptTag = document.currentScript;
  var API_URL = (scriptTag && scriptTag.getAttribute("data-api-url")) || "";
  var BRAND = (scriptTag && scriptTag.getAttribute("data-brand")) || "Adorato Wines";
  var GREETING =
    (scriptTag && scriptTag.getAttribute("data-greeting")) ||
    "Hi! I'm the Adorato Wines assistant — ask me about our wines, shipping, or anything else.";

  if (!API_URL) {
    console.error("[Adorato chat widget] Missing data-api-url attribute on the script tag.");
    return;
  }

  var STORAGE_KEY = "adorato_chat_history_v1";

  var COLORS = {
    primary: "#5c1327", // deep wine red
    primaryDark: "#3d0c1a",
    cream: "#faf6f1",
    text: "#2a2020",
  };

  var css =
    "#adorato-chat-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:" +
    COLORS.primary +
    ";box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:999999;transition:transform .15s ease;}" +
    "#adorato-chat-bubble:hover{transform:scale(1.06);}" +
    "#adorato-chat-bubble svg{width:28px;height:28px;fill:#fff;}" +
    "#adorato-chat-panel{position:fixed;bottom:92px;right:20px;width:340px;max-width:90vw;height:460px;max-height:70vh;background:" +
    COLORS.cream +
    ";border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;z-index:999999;font-family:Georgia,'Times New Roman',serif;}" +
    "#adorato-chat-panel.open{display:flex;}" +
    "#adorato-chat-header{background:" +
    COLORS.primary +
    ";color:#fff;padding:14px 16px;font-size:15px;font-weight:600;display:flex;justify-content:space-between;align-items:center;}" +
    "#adorato-chat-header button{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;}" +
    "#adorato-chat-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}" +
    ".adorato-msg{max-width:80%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.4;white-space:pre-wrap;}" +
    ".adorato-msg.user{align-self:flex-end;background:" +
    COLORS.primary +
    ";color:#fff;border-bottom-right-radius:2px;}" +
    ".adorato-msg.bot{align-self:flex-start;background:#fff;color:" +
    COLORS.text +
    ";border:1px solid #e7ddd4;border-bottom-left-radius:2px;}" +
    ".adorato-msg.typing{align-self:flex-start;color:#8a7d75;font-style:italic;font-size:12.5px;}" +
    "#adorato-chat-inputrow{display:flex;border-top:1px solid #e7ddd4;padding:8px;gap:6px;background:#fff;}" +
    "#adorato-chat-input{flex:1;border:1px solid #ddd;border-radius:20px;padding:8px 12px;font-size:13.5px;font-family:inherit;outline:none;}" +
    "#adorato-chat-input:focus{border-color:" +
    COLORS.primary +
    ";}" +
    "#adorato-chat-send{background:" +
    COLORS.primary +
    ";color:#fff;border:none;border-radius:20px;padding:0 16px;font-size:13px;cursor:pointer;}" +
    "#adorato-chat-send:disabled{opacity:.5;cursor:default;}" +
    "#adorato-chat-send:hover:not(:disabled){background:" +
    COLORS.primaryDark +
    ";}";

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var bubble = document.createElement("div");
  bubble.id = "adorato-chat-bubble";
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.77 6.19-.15 1.4-.72 2.66-1.6 3.62a.5.5 0 00.4.83c1.98-.13 3.6-.83 4.8-1.68A11.6 11.6 0 0012 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z"/></svg>';
  document.body.appendChild(bubble);

  var panel = document.createElement("div");
  panel.id = "adorato-chat-panel";
  panel.innerHTML =
    '<div id="adorato-chat-header"><span>' +
    BRAND +
    '</span><button id="adorato-chat-close" aria-label="Close chat">✕</button></div>' +
    '<div id="adorato-chat-messages"></div>' +
    '<div id="adorato-chat-inputrow">' +
    '<input id="adorato-chat-input" type="text" placeholder="Ask about our wines..." autocomplete="off" />' +
    '<button id="adorato-chat-send">Send</button>' +
    "</div>";
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector("#adorato-chat-messages");
  var inputEl = panel.querySelector("#adorato-chat-input");
  var sendBtn = panel.querySelector("#adorato-chat-send");
  var closeBtn = panel.querySelector("#adorato-chat-close");

  var history = loadHistory();

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      /* ignore quota/privacy-mode errors */
    }
  }

  function renderMessage(role, text) {
    var div = document.createElement("div");
    div.className = "adorato-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function renderAll() {
    messagesEl.innerHTML = "";
    if (history.length === 0) {
      renderMessage("bot", GREETING);
    } else {
      history.forEach(function (m) {
        renderMessage(m.role, m.content);
      });
    }
  }

  function setOpen(open) {
    panel.classList.toggle("open", open);
    if (open) inputEl.focus();
  }

  bubble.addEventListener("click", function () {
    var isOpen = panel.classList.contains("open");
    setOpen(!isOpen);
  });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    sendBtn.disabled = true;

    history.push({ role: "user", content: text });
    renderMessage("user", text);
    saveHistory();

    var typingEl = document.createElement("div");
    typingEl.className = "adorato-msg typing";
    typingEl.textContent = "typing...";
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      var res = await fetch(API_URL.replace(/\/$/, "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      var data = await res.json();
      typingEl.remove();

      if (!res.ok) {
        renderMessage("bot", data.error || "Sorry, something went wrong. Please try again.");
      } else {
        history.push({ role: "assistant", content: data.reply });
        renderMessage("bot", data.reply);
        saveHistory();
      }
    } catch (err) {
      typingEl.remove();
      renderMessage("bot", "Sorry, I'm having trouble connecting right now. Please try again shortly.");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  renderAll();
})();

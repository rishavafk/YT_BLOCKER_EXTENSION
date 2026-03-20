// YT Focus Shield - Content Script v2
// CSS-first approach = reliable even when JS is slow

const STYLE_ID = "ytfs-dynamic-css";

let settings = {
  blockRecommendations: true,
  blockShortsAutoplay: true,
  blockSidebar: true,
  blockEndScreen: true,
  blockedKeywords: [],
  blockedChannels: []
};

// ── Boot ─────────────────────────────────────────────────────────────────────
chrome.storage.sync.get(settings, (stored) => {
  settings = { ...settings, ...stored };
  applyCSS();
  waitForBody();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SETTINGS_UPDATED") {
    settings = { ...settings, ...msg.settings };
    applyCSS();
    applyJS();
  }
  if (msg.type === "BLOCK_CURRENT_VIDEO") {
    blockCurrentChannel();
  }
});

// ── CSS-based blocking (instant, works before DOM ready) ─────────────────────
function applyCSS() {
  let css = "";

  if (settings.blockRecommendations) {
    css += `
      ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer { display:none !important; }
    `;
  }

  if (settings.blockSidebar) {
    css += `
      #secondary.ytd-watch-flexy,
      ytd-watch-next-secondary-results-renderer,
      #related { display:none !important; }
    `;
  }

  if (settings.blockEndScreen) {
    css += `
      .ytp-endscreen-content,
      .html5-endscreen,
      .ytp-ce-element { display:none !important; }
    `;
  }

  if (settings.blockShortsAutoplay) {
    css += `
      ytd-reel-shelf-renderer,
      ytd-rich-shelf-renderer[is-shorts],
      ytd-shorts { display:none !important; }
      ytd-guide-entry-renderer a[href="/shorts"],
      ytd-mini-guide-entry-renderer a[href="/shorts"] { display:none !important; }
    `;
  }

  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = css;
}

// ── Wait for body ─────────────────────────────────────────────────────────────
function waitForBody() {
  if (document.body) {
    applyJS();
    startObserver();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      applyJS();
      startObserver();
    });
  }
}

let obsTimer = null;
function startObserver() {
  const obs = new MutationObserver(() => {
    clearTimeout(obsTimer);
    obsTimer = setTimeout(applyJS, 350);
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // YouTube SPA navigation event
  window.addEventListener("yt-navigate-finish", () => {
    applyCSS();
    setTimeout(applyJS, 600);
  });
}

// ── JS layer ──────────────────────────────────────────────────────────────────
function applyJS() {
  applyCSS();
  if (settings.blockRecommendations) showFocusBanner();
  if (settings.blockShortsAutoplay) handleShorts();
  filterByKeywordsAndChannels();
  addBlockButtons();
}

// ── Focus banner ──────────────────────────────────────────────────────────────
function showFocusBanner() {
  if (!isHomepage()) return;
  if (document.getElementById("ytfs-banner")) return;

  const targets = [
    "ytd-browse[page-subtype='home'] #primary",
    "ytd-browse[page-subtype='home'] ytd-two-column-browse-results-renderer",
    "#content",
    "ytd-app"
  ];
  let parent = null;
  for (const sel of targets) {
    parent = document.querySelector(sel);
    if (parent) break;
  }
  if (!parent) return;

  const banner = document.createElement("div");
  banner.id = "ytfs-banner";
  banner.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:50vh;padding:60px 20px;font-family:'Courier New',monospace;
      color:#aaa;gap:16px;text-align:center;">
      <div style="font-size:56px;line-height:1;">🛡️</div>
      <div style="font-size:24px;color:#fff;font-weight:bold;margin-top:8px;">Focus Mode Active</div>
      <div style="font-size:14px;max-width:380px;line-height:1.7;color:#999;">
        Recommendations are hidden.<br>
        Use the <strong style="color:#fff">search bar</strong> to find what you want to watch.
      </div>
    </div>`;
  parent.insertBefore(banner, parent.firstChild);
}

// ── Shorts wall ───────────────────────────────────────────────────────────────
function handleShorts() {
  if (!window.location.pathname.startsWith("/shorts/")) return;

  const tryPause = () => {
    document.querySelectorAll("video").forEach(v => {
      v.pause();
      v.addEventListener("play", () => v.pause());
    });
  };
  tryPause(); setTimeout(tryPause, 500); setTimeout(tryPause, 1500);

  if (document.getElementById("ytfs-shorts-wall")) return;
  const wall = document.createElement("div");
  wall.id = "ytfs-shorts-wall";
  wall.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:99999;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "font-family:'Courier New',monospace;color:#fff;gap:18px;";
  wall.innerHTML = `
    <div style="font-size:56px;">🚫</div>
    <div style="font-size:22px;font-weight:bold;">Shorts Blocked</div>
    <div style="font-size:13px;color:#aaa;">YT Focus Shield is keeping you focused.</div>
    <div style="display:flex;gap:12px;margin-top:8px;">
      <button id="ytfs-go-back" style="padding:10px 22px;background:#333;border:1px solid #555;
        color:#fff;font-size:13px;cursor:pointer;border-radius:7px;font-family:inherit;">← Go back</button>
      <button id="ytfs-watch-anyway" style="padding:10px 22px;background:#ff3c3c;border:none;
        color:#fff;font-size:13px;cursor:pointer;border-radius:7px;font-family:inherit;">Watch anyway</button>
    </div>`;
  document.body.appendChild(wall);

  document.getElementById("ytfs-go-back").onclick = () => history.back();
  document.getElementById("ytfs-watch-anyway").onclick = () => {
    wall.remove();
    document.querySelectorAll("video").forEach(v => {
      v.removeEventListener("play", () => v.pause());
      v.play();
    });
  };
}

// ── Keyword / channel filter ──────────────────────────────────────────────────
function filterByKeywordsAndChannels() {
  if (!settings.blockedKeywords.length && !settings.blockedChannels.length) return;

  const cards = document.querySelectorAll([
    "ytd-video-renderer:not([ytfs-f])",
    "ytd-compact-video-renderer:not([ytfs-f])",
    "ytd-rich-item-renderer:not([ytfs-f])",
    "ytd-grid-video-renderer:not([ytfs-f])",
    "ytd-reel-item-renderer:not([ytfs-f])"
  ].join(","));

  cards.forEach(card => {
    card.setAttribute("ytfs-f", "1");
    const title = (card.querySelector("#video-title, #video-title-link, h3 a")?.textContent || "").toLowerCase();
    const channel = (card.querySelector("ytd-channel-name a, #channel-name a")?.textContent || "").toLowerCase();

    const kwHit = settings.blockedKeywords.some(k => title.includes(k.toLowerCase()));
    const chHit = settings.blockedChannels.some(c => channel.includes(c.toLowerCase()));
    if (kwHit || chHit) card.style.setProperty("display", "none", "important");
  });
}

// ── Block buttons ─────────────────────────────────────────────────────────────
function addBlockButtons() {
  const cards = document.querySelectorAll([
    "ytd-video-renderer:not([ytfs-b])",
    "ytd-compact-video-renderer:not([ytfs-b])",
    "ytd-rich-item-renderer:not([ytfs-b])"
  ].join(","));

  cards.forEach(card => {
    card.setAttribute("ytfs-b", "1");
    card.style.position = "relative";

    const btn = document.createElement("button");
    btn.className = "ytfs-block-btn";
    btn.textContent = "🛡 Block";

    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const channel = card.querySelector("ytd-channel-name a, #channel-name a")?.textContent?.trim();
      const title = card.querySelector("#video-title, #video-title-link, h3 a")?.textContent?.trim();
      openMenu(btn, channel, title, card);
    });

    card.appendChild(btn);
  });
}

function openMenu(anchor, channel, title, card) {
  document.querySelectorAll(".ytfs-menu").forEach(m => m.remove());
  const menu = document.createElement("div");
  menu.className = "ytfs-menu";

  const items = [];
  if (channel) items.push({ label: `🚫 Block channel: ${channel}`, fn: () => doBlockChannel(channel, card) });
  if (title)   items.push({ label: `🔑 Block keyword from title`, fn: () => doBlockKeyword(title, card) });
  items.push({ label: "Cancel", fn: () => {} });

  menu.innerHTML = items.map((it, i) =>
    `<button class="ytfs-menu-item" data-i="${i}">${it.label}</button>`).join("");
  items.forEach((it, i) => {
    menu.querySelector(`[data-i="${i}"]`).onclick = () => { it.fn(); menu.remove(); };
  });

  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top  = (r.bottom + window.scrollY + 6) + "px";
  menu.style.left = Math.min(r.left + window.scrollX, window.innerWidth - 290) + "px";

  setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 100);
}

function doBlockChannel(name, card) {
  const list = [...new Set([...settings.blockedChannels, name])];
  settings.blockedChannels = list;
  chrome.storage.sync.set({ blockedChannels: list });
  if (card) card.style.setProperty("display", "none", "important");
  toast(`Blocked channel: ${name}`);
}

function doBlockKeyword(titleText, card) {
  const suggested = titleText.split(" ").slice(0, 3).join(" ");
  const kw = window.prompt("Enter keyword to block:", suggested);
  if (!kw?.trim()) return;
  const list = [...new Set([...settings.blockedKeywords, kw.trim()])];
  settings.blockedKeywords = list;
  chrome.storage.sync.set({ blockedKeywords: list });
  if (card) card.style.setProperty("display", "none", "important");
  toast(`Blocked keyword: "${kw.trim()}"`);
}

function blockCurrentChannel() {
  const sels = ["#upload-info #channel-name a", "#owner #channel-name a", "ytd-channel-name a"];
  let name = null;
  for (const s of sels) { name = document.querySelector(s)?.textContent?.trim(); if (name) break; }
  if (name) doBlockChannel(name, null);
  else toast("Could not detect channel on this page");
}

function toast(msg) {
  document.querySelectorAll(".ytfs-toast").forEach(t => t.remove());
  const el = document.createElement("div");
  el.className = "ytfs-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function isHomepage() {
  const p = window.location.pathname;
  return p === "/" || p === "/feed/trending" || p === "/feed/subscriptions";
}

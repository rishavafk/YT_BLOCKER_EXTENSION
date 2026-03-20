// YT Focus Shield - Popup Script

const defaults = {
  blockRecommendations: true,
  blockShortsAutoplay: true,
  blockSidebar: true,
  blockEndScreen: true,
  blockedKeywords: [],
  blockedChannels: []
};

let state = { ...defaults };

// Load and render
chrome.storage.sync.get(defaults, (stored) => {
  state = { ...defaults, ...stored };
  render();
});

function render() {
  // Toggles
  ["blockRecommendations", "blockSidebar", "blockEndScreen", "blockShortsAutoplay"].forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = state[key];
  });

  renderTags("keywordList", state.blockedKeywords, "keyword");
  renderTags("channelList", state.blockedChannels, "channel");

  const total = (state.blockedKeywords.length + state.blockedChannels.length) +
    ["blockRecommendations", "blockSidebar", "blockEndScreen", "blockShortsAutoplay"]
      .filter(k => state[k]).length;
  document.getElementById("totalBlocked").textContent = total;
}

function renderTags(containerId, items, type) {
  const el = document.getElementById(containerId);
  if (!items.length) {
    el.innerHTML = `<div class="empty-tags">None added yet</div>`;
    return;
  }
  el.innerHTML = items.map((item, i) =>
    `<div class="tag">
      ${escapeHtml(item)}
      <span class="tag-remove" data-type="${type}" data-i="${i}" title="Remove">×</span>
    </div>`
  ).join("");

  el.querySelectorAll(".tag-remove").forEach(btn => {
    btn.addEventListener("click", () => removeItem(type, parseInt(btn.dataset.i)));
  });
}

function removeItem(type, idx) {
  if (type === "keyword") state.blockedKeywords.splice(idx, 1);
  if (type === "channel") state.blockedChannels.splice(idx, 1);
  saveAndSync();
}

// Toggle listeners
["blockRecommendations", "blockSidebar", "blockEndScreen", "blockShortsAutoplay"].forEach(key => {
  document.getElementById(key).addEventListener("change", (e) => {
    state[key] = e.target.checked;
    saveAndSync();
  });
});

// Add keyword
document.getElementById("addKeyword").addEventListener("click", () => {
  const input = document.getElementById("keywordInput");
  const val = input.value.trim();
  if (val && !state.blockedKeywords.includes(val)) {
    state.blockedKeywords.push(val);
    saveAndSync();
    input.value = "";
  }
});

document.getElementById("keywordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addKeyword").click();
});

// Add channel
document.getElementById("addChannel").addEventListener("click", () => {
  const input = document.getElementById("channelInput");
  const val = input.value.trim();
  if (val && !state.blockedChannels.includes(val)) {
    state.blockedChannels.push(val);
    saveAndSync();
    input.value = "";
  }
});

document.getElementById("channelInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addChannel").click();
});

// Block current channel
document.getElementById("blockCurrentChannel").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "BLOCK_CURRENT_VIDEO" });
      window.close();
    }
  });
});

// Reset
document.getElementById("resetAll").addEventListener("click", () => {
  if (confirm("Reset all settings and clear all blocked lists?")) {
    state = { ...defaults };
    saveAndSync();
  }
});

function saveAndSync() {
  chrome.storage.sync.set(state, () => {
    render();
    // Notify active YouTube tabs
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings: state }).catch(() => {});
      });
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

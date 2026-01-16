const defaultSettings = {
  prefixes: {
    tab: "%t",
    bookmark: "%b",
    history: "%h",
    search: "%s"
  },
  customEngines: []
};

let currentSettings = { ...defaultSettings };

// --- I18N 翻譯函式 ---
function localizeHtml() {
  document.title = browser.i18n.getMessage("settingsTitle");
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    const msg = browser.i18n.getMessage(key);
    if (msg) elem.textContent = msg;
  });
}

function restoreOptions() {
  browser.storage.sync.get(defaultSettings).then((res) => {
    currentSettings = res;
    
    document.querySelector("#prefix-tab").value = res.prefixes.tab;
    document.querySelector("#prefix-bookmark").value = res.prefixes.bookmark;
    document.querySelector("#prefix-history").value = res.prefixes.history;
    document.querySelector("#prefix-search").value = res.prefixes.search;
    
    renderEngines();
  });
}

function renderEngines() {
  const tbody = document.querySelector("#engine-list tbody");
  tbody.innerHTML = "";
  
  if (!currentSettings.customEngines) currentSettings.customEngines = [];

  currentSettings.customEngines.forEach((engine, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${engine.prefix}</code></td>
      <td>${engine.name}</td>
      <td style="color:#aaa; font-size:12px; word-break: break-all;">${engine.url}</td>
      <td><button class="btn-remove" data-index="${index}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".btn-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"));
      currentSettings.customEngines.splice(idx, 1);
      saveAll(); 
    });
  });
}

function saveAll() {
  const prefixes = {
    tab: document.querySelector("#prefix-tab").value || "%t",
    bookmark: document.querySelector("#prefix-bookmark").value || "%b",
    history: document.querySelector("#prefix-history").value || "%h",
    search: document.querySelector("#prefix-search").value || "%s"
  };

  currentSettings.prefixes = prefixes;

  browser.storage.sync.set(currentSettings).then(() => {
    const status = document.querySelector("#status");
    status.style.opacity = "1";
    setTimeout(() => {
      status.style.opacity = "0";
    }, 1500);
    renderEngines(); 
  });
}

document.querySelector("#save").addEventListener("click", (e) => {
  e.preventDefault();
  saveAll();
});

document.querySelector("#add-engine").addEventListener("click", (e) => {
  e.preventDefault();
  const prefixInput = document.querySelector("#new-prefix");
  const nameInput = document.querySelector("#new-name");
  const urlInput = document.querySelector("#new-url");

  const prefix = prefixInput.value.trim();
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();

  if (prefix && name && url) {
    if (!currentSettings.customEngines) currentSettings.customEngines = [];
    currentSettings.customEngines.push({ prefix, name, url });
    
    prefixInput.value = "";
    nameInput.value = "";
    urlInput.value = "";
    
    saveAll(); 
  }
});

// DOM 載入後先翻譯，再還原設定
document.addEventListener("DOMContentLoaded", () => {
  localizeHtml();
  restoreOptions();
});
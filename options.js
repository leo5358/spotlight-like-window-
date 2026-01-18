const defaultSettings = {
  prefixes: {
    tab: "%t",
    bookmark: "%b",
    history: "%h",
    search: "%s"
  },
  colors: {
    tab: "#0d6efd",
    bookmark: "#198754",
    history: "#ffc107",
    search: "#6c757d"
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
    
    // Restore Prefixes
    document.querySelector("#prefix-tab").value = res.prefixes.tab;
    document.querySelector("#prefix-bookmark").value = res.prefixes.bookmark;
    document.querySelector("#prefix-history").value = res.prefixes.history;
    document.querySelector("#prefix-search").value = res.prefixes.search;
    
    // Restore Colors
    document.querySelector("#color-tab").value = res.colors.tab || defaultSettings.colors.tab;
    document.querySelector("#color-bookmark").value = res.colors.bookmark || defaultSettings.colors.bookmark;
    document.querySelector("#color-history").value = res.colors.history || defaultSettings.colors.history;
    document.querySelector("#color-search").value = res.colors.search || defaultSettings.colors.search;

    renderEngines();
  });
}

function renderEngines() {
  const tbody = document.querySelector("#engine-list tbody");
  tbody.innerHTML = ""; 
  
  if (!currentSettings.customEngines) currentSettings.customEngines = [];

  currentSettings.customEngines.forEach((engine, index) => {
    const tr = document.createElement("tr");

    // Prefix Column
    const tdPrefix = document.createElement("td");
    const codePrefix = document.createElement("code");
    codePrefix.textContent = engine.prefix;
    tdPrefix.appendChild(codePrefix);

    // Name Column
    const tdName = document.createElement("td");
    tdName.textContent = engine.name;

    // URL Column
    const tdUrl = document.createElement("td");
    tdUrl.textContent = engine.url;
    tdUrl.style.cssText = "color:#aaa; font-size:12px; word-break: break-all;";

    // Color Column
    const tdColor = document.createElement("td");
    const colorBox = document.createElement("span");
    colorBox.className = "color-preview";
    colorBox.style.backgroundColor = engine.color || "#58D667";
    tdColor.appendChild(colorBox);

    // Action Column
    const tdAction = document.createElement("td");
    const btnRemove = document.createElement("button");
    btnRemove.className = "btn-remove";
    btnRemove.setAttribute("data-index", index);
    btnRemove.textContent = "✕";
    tdAction.appendChild(btnRemove);

    tr.appendChild(tdPrefix);
    tr.appendChild(tdName);
    tr.appendChild(tdUrl);
    tr.appendChild(tdColor);
    tr.appendChild(tdAction);

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

  const colors = {
    tab: document.querySelector("#color-tab").value,
    bookmark: document.querySelector("#color-bookmark").value,
    history: document.querySelector("#color-history").value,
    search: document.querySelector("#color-search").value
  };

  currentSettings.prefixes = prefixes;
  currentSettings.colors = colors;

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
  const colorInput = document.querySelector("#new-color");

  const prefix = prefixInput.value.trim();
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const color = colorInput.value;

  if (prefix && name && url) {
    if (!currentSettings.customEngines) currentSettings.customEngines = [];
    currentSettings.customEngines.push({ prefix, name, url, color });
    
    prefixInput.value = "";
    nameInput.value = "";
    urlInput.value = "";
    
    saveAll(); 
  }
});

document.addEventListener("DOMContentLoaded", () => {
  localizeHtml();
  restoreOptions();
});
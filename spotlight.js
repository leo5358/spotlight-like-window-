const input = document.querySelector("#input");
const results = document.querySelector("#results");
const modeBadge = document.querySelector("#mode-badge");
const prefixIndicator = document.querySelector("#prefix-indicator");

let currentList = [];
let selectedIndex = 0;
let currentModePrefix = "";
let lastSearchedQuery = null;

let settings = {
  prefixes: { tab: "%t", bookmark: "%b", history: "%h", search: "%s" },
  colors: { tab: "#0d6efd", bookmark: "#198754", history: "#ffc107", search: "#6c757d" },
  customEngines: []
};

async function init() {
  const res = await browser.storage.sync.get(settings);
  if (res.prefixes) settings.prefixes = res.prefixes;
  if (res.colors) settings.colors = res.colors;
  if (res.customEngines) settings.customEngines = res.customEngines;
  ensureFocus();
}
init();

function debounce(func, delay) {
  let timeoutId;
  const debounced = function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

// 簡單的文字顏色對比函式 (決定文字要用黑色還是白色)
function getContrastColor(hex) {
  if (!hex) return 'white';
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}

input.addEventListener("keydown", async (e) => {
  if (e.key === "Backspace" && input.value === "" && currentModePrefix !== "") {
    e.preventDefault();
    input.value = currentModePrefix; 
    currentModePrefix = "";
    updateUI();
  }

  if (e.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % currentList.length;
    updateSelection();
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + currentList.length) % currentList.length;
    updateSelection();
    e.preventDefault();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const currentQuery = currentModePrefix + input.value;
    if (currentQuery !== lastSearchedQuery) {
      debouncedSearch.cancel();
      await performSearch(currentQuery);
    }
    if (currentList[selectedIndex]) {
      triggerExecute(currentList[selectedIndex], e.shiftKey);
    }
  } else if (e.key === "Escape") {
    closeSpotlight();
  }
});

input.addEventListener("input", (e) => {
  const val = input.value;
  const p = settings.prefixes;

  if (currentModePrefix === "") {
    if (val === p.tab + " ") { setMode(p.tab); return; }
    if (val === p.bookmark + " ") { setMode(p.bookmark); return; }
    if (val === p.history + " ") { setMode(p.history); return; }
    if (val === p.search + " ") { setMode(p.search); return; }

    if (settings.customEngines) {
        const matched = settings.customEngines.find(eng => val === eng.prefix + " ");
        if (matched) {
            setMode(matched.prefix);
            return;
        }
    }
  }

  const query = currentModePrefix + input.value;
  debouncedSearch(query);
});

function setMode(prefix) {
  currentModePrefix = prefix + " ";
  input.value = "";
  updateUI();
  renderList([]);
}

function updateUI() {
  modeBadge.className = "";
  modeBadge.textContent = "";
  prefixIndicator.className = "";
  prefixIndicator.textContent = "";
  input.classList.remove("has-mode");

  // 清除 inline style
  prefixIndicator.style.backgroundColor = "";
  prefixIndicator.style.color = "";

  if (currentModePrefix === "") {
    input.placeholder = browser.i18n.getMessage("phDefault");
    input.style.paddingLeft = ""; 
  } else {
    input.classList.add("has-mode");
    
    let badgeText = "";
    let badgeColor = "#444"; // 預設灰
    let placeholderText = "";
    
    const p = settings.prefixes;
    const c = settings.colors;
    const rawPrefix = currentModePrefix.trim();

    if (rawPrefix === p.tab) {
        badgeText = browser.i18n.getMessage("badgeTabs"); 
        badgeColor = c.tab;
        placeholderText = browser.i18n.getMessage("phTabs");
    } else if (rawPrefix === p.bookmark) {
        badgeText = browser.i18n.getMessage("badgeBookmarks"); 
        badgeColor = c.bookmark;
        placeholderText = browser.i18n.getMessage("phBookmarks");
    } else if (rawPrefix === p.history) {
        badgeText = browser.i18n.getMessage("badgeHistory"); 
        badgeColor = c.history;
        placeholderText = browser.i18n.getMessage("phHistory");
    } else if (rawPrefix === p.search) {
        badgeText = browser.i18n.getMessage("badgeWeb"); 
        badgeColor = c.search;
        placeholderText = browser.i18n.getMessage("phWeb");
    } else {
        if (settings.customEngines) {
            const matched = settings.customEngines.find(eng => eng.prefix === rawPrefix);
            if (matched) {
                badgeText = matched.name;
                badgeColor = matched.color || "#58D667"; 
                placeholderText = browser.i18n.getMessage("phSearchCustom", matched.name);
            }
        }
    }

    prefixIndicator.textContent = badgeText;
    prefixIndicator.classList.add("show");
    
    // 動態套用顏色
    prefixIndicator.style.backgroundColor = badgeColor;
    prefixIndicator.style.color = getContrastColor(badgeColor);

    input.placeholder = placeholderText;

    requestAnimationFrame(() => {
        const badgeWidth = prefixIndicator.offsetWidth;
        const newPadding = 8 + badgeWidth + 12;
        input.style.paddingLeft = `${newPadding}px`;
    });
  }
}

async function performSearch(query) {
  lastSearchedQuery = query;
  selectedIndex = 0;

  if (!query.trim()) {
    renderList([]);
    return;
  }

  const response = await browser.runtime.sendMessage({ 
    action: "SEARCH_REQUEST", 
    query: query 
  });
  
  if (response && response.results) {
    currentList = response.results.slice(0, 15);
    renderList(currentList);
  }
}

const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

function getFaviconSource(item) {
  if (item.favIconUrl) return item.favIconUrl;
  if (item.type === "search") {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
  }
  if (item.url && item.url.startsWith("http")) {
    try {
      const urlObj = new URL(item.url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (e) { console.error(e); }
  }
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gray"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
}

function renderHighlightedText(container, text, indices) {
  if (!indices || indices.length === 0) {
    container.textContent = text;
    return;
  }
  let lastIndex = 0;
  indices.forEach(([start, end]) => {
    if (start > lastIndex) {
      container.appendChild(document.createTextNode(text.substring(lastIndex, start)));
    }
    const span = document.createElement("span");
    span.className = "highlight";
    span.textContent = text.substring(start, end + 1);
    container.appendChild(span);
    lastIndex = end + 1;
  });
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.substring(lastIndex)));
  }
}

function renderList(list) {
  results.innerHTML = "";
  if (list.length === 0) return;

  list.forEach((item, i) => {
    const li = document.createElement("li");
    
    const img = document.createElement("img");
    img.className = "favicon";
    img.src = getFaviconSource(item);
    
    const tag = document.createElement("span");
    tag.className = "tag";
    
    let tagName = "";
    let tagColor = "#666";

    const c = settings.colors;

    if (item.type === "tab") { 
        tagName = "TAB"; 
        tagColor = c.tab;
    } else if (item.type === "bookmark") { 
        tagName = "BMK"; 
        tagColor = c.bookmark;
    } else if (item.type === "history") { 
        tagName = "HIS"; 
        tagColor = c.history;
    } else if (item.type === "search") { 
        tagName = "WEB"; 
        tagColor = c.search;
    } else if (item.type === "custom-search") { 
        tagName = "SRC"; 
        tagColor = item.color || "#58D667"; // 來自 background 的 color 資訊
    } 

    tag.textContent = tagName;
    tag.style.backgroundColor = tagColor;
    tag.style.color = getContrastColor(tagColor);
    
    const textSpan = document.createElement("span");
    const titleMatch = item.matches ? item.matches.find(m => m.key === 'title') : null;
    if (titleMatch) {
        renderHighlightedText(textSpan, item.title, titleMatch.indices);
    } else {
        textSpan.textContent = item.title;
    }
    
    li.appendChild(img);
    li.appendChild(tag);
    li.appendChild(textSpan);

    li.addEventListener("click", (e) => triggerExecute(item, e.shiftKey));
    if (i === selectedIndex) li.classList.add("active");
    
    results.appendChild(li);
  });
}

function triggerExecute(item, openInNewTab = false) {
  browser.runtime.sendMessage({ action: "EXECUTE_ITEM", item: item, openInNewTab: openInNewTab });
  closeSpotlight();
}

function closeSpotlight() {
  browser.runtime.sendMessage({ action: "REQUEST_CLOSE" });
  window.close();
}

document.addEventListener("click", (e) => {
  const container = document.getElementById("container");
  if (container && !container.contains(e.target)) {
    closeSpotlight();
  }
});

function ensureFocus() {
  setTimeout(() => { input.focus(); }, 10);
}
window.addEventListener("focus", ensureFocus);

function updateSelection() {
  const items = results.querySelectorAll("li");
  items.forEach((item, i) => {
    if (i === selectedIndex) {
      item.classList.add("active");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("active");
    }
  });
}
const input = document.querySelector("#input");
const results = document.querySelector("#results");
const modeBadge = document.querySelector("#mode-badge");
const prefixIndicator = document.querySelector("#prefix-indicator");

let currentList = [];
let selectedIndex = 0;
let currentModePrefix = "";

let settings = {
  prefixes: { 
    tab: "%t", 
    bookmark: "%b", 
    history: "%h", 
    search: "%s" 
  },
  customEngines: []
};

async function init() {
  const res = await browser.storage.sync.get(settings);
  if (res.prefixes) settings.prefixes = res.prefixes;
  if (res.customEngines) settings.customEngines = res.customEngines;
  ensureFocus();
}
init();

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
  };
}

input.addEventListener("keydown", (e) => {
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

  handleSearch();
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

  if (currentModePrefix === "") {
    input.placeholder = "Search or type a URL…";
  } else {
    input.classList.add("has-mode");
    
    let badgeText = "";
    let badgeClass = "";
    let placeholderText = "";
    const p = settings.prefixes;
    const rawPrefix = currentModePrefix.trim();

    if (rawPrefix === p.tab) {
        badgeText = "Tabs"; badgeClass = "mode-tab"; placeholderText = "Search open tabs…";
    } else if (rawPrefix === p.bookmark) {
        badgeText = "Bookmarks"; badgeClass = "mode-bookmark"; placeholderText = "Search bookmarks…";
    } else if (rawPrefix === p.history) {
        badgeText = "History"; badgeClass = "mode-history"; placeholderText = "Search history…";
    } else if (rawPrefix === p.search) {
        badgeText = "Web"; badgeClass = "mode-search"; placeholderText = "Google search…";
    } else {
        if (settings.customEngines) {
            const matched = settings.customEngines.find(eng => eng.prefix === rawPrefix);
            if (matched) {
                badgeText = matched.name;
                // 使用自訂的樣式類別，這樣也能套用綠色背景
                badgeClass = "mode-custom"; 
                placeholderText = `Search ${matched.name}...`;
            }
        }
    }

    prefixIndicator.textContent = badgeText;
    prefixIndicator.classList.add("show", badgeClass);
    input.placeholder = placeholderText;
  }
}

const handleSearch = debounce(async () => {
  const query = currentModePrefix + input.value;
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
}, 300);

function getFaviconSource(item) {
  if (item.favIconUrl) {
    return item.favIconUrl;
  }

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
    
    if (item.type === "tab") { tag.textContent = "TAB"; tag.classList.add("tag-tab"); }
    else if (item.type === "bookmark") { tag.textContent = "BMK"; tag.classList.add("tag-book"); }
    else if (item.type === "history") { tag.textContent = "HIS"; tag.classList.add("tag-hist"); }
    else if (item.type === "search") { tag.textContent = "WEB"; tag.classList.add("tag-search"); }
    // 使用 tag-custom 類別
    else if (item.type === "custom-search") { tag.textContent = "SRC"; tag.classList.add("tag-custom"); } 
    
    const text = document.createElement("span");
    text.textContent = item.title;
    
    li.appendChild(img);
    li.appendChild(tag);
    li.appendChild(text);

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
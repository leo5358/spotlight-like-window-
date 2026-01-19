import Fuse from './fuse.esm.js';

let popupWindowId = null;

let settings = {
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

// --- [優化] 全域變數：用來快取分頁資料與 Fuse 實例 ---
let tabsCache = [];
let fuseInstance = null;
// Fuse 選項設定 (靜態)
const fuseOptions = {
  includeScore: true,
  includeMatches: true,
  keys: [{ name: 'title', weight: 0.7 }, { name: 'url', weight: 0.3 }],
  threshold: 0.4,
  ignoreLocation: true
};

// 初始化設定並監聽變更
function loadSettings() {
  browser.storage.sync.get(settings).then((res) => {
    if (res.prefixes) settings.prefixes = res.prefixes;
    if (res.colors) settings.colors = res.colors;
    if (res.customEngines) settings.customEngines = res.customEngines;
  });
}
loadSettings();

// --- [優化] 索引管理函式 ---
// 重新抓取分頁並更新 Fuse 集合，不用每次都 new Fuse
async function updateTabsIndex() {
  try {
    tabsCache = await browser.tabs.query({});
    if (!fuseInstance) {
      // 第一次建立
      fuseInstance = new Fuse(tabsCache, fuseOptions);
    } else {
      // 後續更新：直接更新資料集合 (比重新 new 快)
      fuseInstance.setCollection(tabsCache);
    }
  } catch (e) {
    console.error("Failed to update tab index:", e);
  }
}

// 初始化時建立索引
updateTabsIndex();

// --- [優化] 監聽分頁事件，自動更新索引 ---
// 1. 分頁建立
browser.tabs.onCreated.addListener(updateTabsIndex);
// 2. 分頁移除
browser.tabs.onRemoved.addListener(updateTabsIndex);
// 3. 分頁更新 (只在標題或網址改變時更新，避免頻繁觸發)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
    updateTabsIndex();
  }
});


browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    if (changes.prefixes) settings.prefixes = changes.prefixes.newValue;
    if (changes.colors) settings.colors = changes.colors.newValue;
    if (changes.customEngines) settings.customEngines = changes.customEngines.newValue;
  }
});

const RESTRICTED_PROTOCOLS = ["about:", "chrome:", "edge:", "moz-extension:", "view-source:"];
const RESTRICTED_DOMAINS = ["addons.mozilla.org"];

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-spotlight") return;
  
  // 開啟前先確保索引是最新的 (防止極端情況)
  updateTabsIndex();

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || RESTRICTED_PROTOCOLS.some(p => tab.url.startsWith(p)) || RESTRICTED_DOMAINS.some(d => tab.url.includes(d))) {
    toggleSpotlightWindow();
  } else {
    toggleSpotlightOverlay(tab.id);
  }
});

async function toggleSpotlightOverlay(tabId) {
  try {
    await browser.tabs.sendMessage(tabId, { action: "TOGGLE_UI" });
  } catch (err) {
    try {
      await browser.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] });
      browser.tabs.sendMessage(tabId, { action: "TOGGLE_UI" });
    } catch (injectErr) {
      toggleSpotlightWindow();
    }
  }
}

async function toggleSpotlightWindow() {
  if (popupWindowId) {
    try { await browser.windows.remove(popupWindowId); } catch (e) { }
    popupWindowId = null;
  } else {
    const width = 700;
    const height = 600;

    let createData = {
      url: "spotlight.html",
      type: "popup",
      width: width,
      height: height
    };

    try {
      const currentWin = await browser.windows.getLastFocused();
      if (currentWin) {
        const left = Math.round(currentWin.left + (currentWin.width - width) / 2);
        const top = Math.round(currentWin.top + (currentWin.height - height) / 2);
        createData.left = left;
        createData.top = top;
      }
    } catch (e) {
      console.error("Failed to calculate center position:", e);
    }

    const win = await browser.windows.create(createData);
    popupWindowId = win.id;

    browser.windows.onRemoved.addListener((id) => { if (id === popupWindowId) popupWindowId = null; });
  }
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "REQUEST_CLOSE") {
    if (popupWindowId) {
      browser.windows.remove(popupWindowId);
      popupWindowId = null;
    } else if (sender.tab && sender.tab.id) {
      browser.tabs.sendMessage(sender.tab.id, { action: "CLOSE_UI" });
    }
  }
  if (msg.action === "SEARCH_REQUEST") {
    handleSearch(msg.query).then(results => sendResponse({ results }));
    return true;
  }
  if (msg.action === "EXECUTE_ITEM") {
    executeItem(msg.item, msg.openInNewTab, sender);
  }
});

async function handleSearch(rawQuery) {
  const queryLower = rawQuery.toLowerCase();
  let results = [];
  let mode = "default";
  let keyword = rawQuery.trim();

  const p = settings.prefixes;
  const checkPrefix = (prefix) => queryLower.startsWith(prefix.toLowerCase() + " ");

  let matchedCustomEngine = null;

  if (checkPrefix(p.tab)) {
    mode = "tab";
    keyword = rawQuery.substring(p.tab.length + 1).trim();
  } else if (checkPrefix(p.bookmark)) {
    mode = "bookmark";
    keyword = rawQuery.substring(p.bookmark.length + 1).trim();
  } else if (checkPrefix(p.history)) {
    mode = "history";
    keyword = rawQuery.substring(p.history.length + 1).trim();
  } else if (checkPrefix(p.search)) {
    mode = "search";
    keyword = rawQuery.substring(p.search.length + 1).trim();
  } else {
    if (settings.customEngines) {
      matchedCustomEngine = settings.customEngines.find(eng => checkPrefix(eng.prefix));
      if (matchedCustomEngine) {
        mode = "custom";
        keyword = rawQuery.substring(matchedCustomEngine.prefix.length + 1).trim();
      }
    }
  }

  // --- 自訂引擎搜尋 ---
  if (mode === "custom" && matchedCustomEngine) {
    if (keyword.length > 0) {
      const targetUrl = matchedCustomEngine.url.replace("%s", encodeURIComponent(keyword));
      results.push({
        type: "custom-search",
        title: `Search ${matchedCustomEngine.name} for "${keyword}"`,
        url: targetUrl,
        color: matchedCustomEngine.color || "#58D667"
        /* Privacy: Removed Google Favicon URL
         favIconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        */
      });
    }
    return results;
  }

  // --- [優化] 分頁搜尋 (使用快取的 Fuse 實例) ---
  if (mode === "default" || mode === "tab") {
    // 確保索引存在 (防呆)
    if (!fuseInstance) await updateTabsIndex();

    if (keyword.length === 0) {
      // 關鍵字為空時，直接列出快取中的分頁 (取前 15 個或全部)
      tabsCache.slice(0, 20).forEach(t => {
        results.push({
          type: "tab",
          title: t.title,
          url: t.url,
          favIconUrl: t.favIconUrl,
          id: t.id,
          windowId: t.windowId
        });
      });
    } else {
      // 使用快取的 fuseInstance 進行搜尋
      fuseInstance.search(keyword).forEach(res => {
        results.push({
          type: "tab",
          title: res.item.title,
          url: res.item.url,
          favIconUrl: res.item.favIconUrl,
          id: res.item.id,
          windowId: res.item.windowId,
          matches: res.matches
        });
      });
    }
  }

  // --- 書籤與歷史紀錄 ---
  // 註：這兩者 API 查詢速度通常夠快，且資料量過大不適合全部快取到記憶體，維持現狀即可。
  if (mode === "default" || mode === "bookmark") {
    if (keyword.length > 0) {
      const bookmarks = await browser.bookmarks.search({ query: keyword });
      bookmarks.filter(b => b.url).slice(0, 15).forEach(b => {
        results.push({ type: "bookmark", title: b.title, url: b.url });
      });
    }
  }

  if (mode === "history") {
    if (keyword.length > 0) {
      const history = await browser.history.search({ text: keyword, maxResults: 15, startTime: 0 });
      history.forEach(h => {
        results.push({ type: "history", title: h.title || h.url, url: h.url });
      });
    }
  }

  // 預設網頁搜尋
  if (keyword.length > 0) {
    results.push({ type: "search", title: `Search Web for "${keyword}"`, query: keyword });
  }

  return results;
}

async function executeItem(item, openInNewTab, sender) {
  if (item.type === "tab") {
    browser.tabs.update(item.id, { active: true });
    if (item.windowId) browser.windows.update(item.windowId, { focused: true }).catch(() => { });
  }
  else if (item.type === "bookmark" || item.type === "history" || item.type === "custom-search") {
    if (openInNewTab) browser.tabs.create({ url: item.url });
    else {
      let targetTabId = null;
      const isPopupWindow = (popupWindowId && sender.tab && sender.tab.windowId === popupWindowId);
      if (isPopupWindow) {
        const wins = await browser.tabs.query({ active: true, windowType: 'normal', lastFocusedWindow: true });
        if (wins.length > 0) targetTabId = wins[0].id;
        else { const anyWins = await browser.tabs.query({ active: true, windowType: 'normal' }); if (anyWins.length > 0) targetTabId = anyWins[0].id; }
      } else { if (sender.tab) targetTabId = sender.tab.id; }
      
      // Security: Check for javascript: URLs
      if (item.url && item.url.trim().toLowerCase().startsWith("javascript:")) {
        console.warn("Blocked execution of javascript: URL");
        return;
      }

      if (targetTabId) browser.tabs.update(targetTabId, { url: item.url });
      else browser.tabs.create({ url: item.url });
    }
  } else if (item.type === "search") {
    browser.search.search({ query: item.query, disposition: openInNewTab ? "NEW_TAB" : "CURRENT_TAB" });
  }
}
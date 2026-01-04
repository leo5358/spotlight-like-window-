import Fuse from './fuse.esm.js';

let popupWindowId = null;

let settings = {
  prefixes: {
    tab: "%t",
    bookmark: "%b",
    history: "%h",
    search: "%s"
  },
  customEngines: []
};

// 初始化設定並監聽變更
function loadSettings() {
  browser.storage.sync.get(settings).then((res) => {
    if (res.prefixes) settings.prefixes = res.prefixes;
    if (res.customEngines) settings.customEngines = res.customEngines;
  });
}
loadSettings();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    if (changes.prefixes) settings.prefixes = changes.prefixes.newValue;
    if (changes.customEngines) settings.customEngines = changes.customEngines.newValue;
  }
});

const RESTRICTED_PROTOCOLS = [ "about:", "chrome:", "edge:", "moz-extension:", "view-source:" ];
const RESTRICTED_DOMAINS = [ "addons.mozilla.org" ];

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-spotlight") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || RESTRICTED_PROTOCOLS.some(p => tab.url.startsWith(p)) || RESTRICTED_DOMAINS.some(d => tab.url.includes(d))) {
    toggleSpotlightWindow();
  } else {
    toggleSpotlightOverlay(tab.id);
  }
});

async function toggleSpotlightOverlay(tabId) {
  try {
    await browser.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] });
    browser.tabs.sendMessage(tabId, { action: "TOGGLE_UI" });
  } catch (err) {
    toggleSpotlightWindow();
  }
}

async function toggleSpotlightWindow() {
  if (popupWindowId) {
    try { await browser.windows.remove(popupWindowId); } catch (e) {}
    popupWindowId = null;
  } else {
    const win = await browser.windows.create({ url: "spotlight.html", type: "popup", width: 700, height: 600 });
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
    // 檢查自訂引擎列表
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
      let hostname = "";
      try { hostname = new URL(targetUrl).hostname; } catch(e){}

      results.push({
        type: "custom-search",
        title: `Search ${matchedCustomEngine.name} for "${keyword}"`,
        url: targetUrl,
        // 嘗試取得該網站的 Favicon
        favIconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
      });
    }
    return results;
  }

  // --- 分頁搜尋 (使用 Fuse.js) ---
  if (mode === "default" || mode === "tab") {
    const tabs = await browser.tabs.query({});
    if (keyword.length === 0) {
        tabs.forEach(t => {
             results.push({ type: "tab", title: t.title, url: t.url, id: t.id, windowId: t.windowId });
        });
    } else {
        const options = {
          includeScore: true,
          keys: [{ name: 'title', weight: 0.7 }, { name: 'url', weight: 0.3 }],
          threshold: 0.4,
          ignoreLocation: true 
        };
        const fuse = new Fuse(tabs, options);
        fuse.search(keyword).forEach(res => {
          results.push({ type: "tab", title: res.item.title, url: res.item.url, id: res.item.id, windowId: res.item.windowId });
        });
    }
  }

  // --- 書籤與歷史紀錄 ---
  if (mode === "default" || mode === "bookmark") {
    if (keyword.length > 0) {
      const bookmarks = await browser.bookmarks.search({ query: keyword });
      bookmarks.filter(b => b.url).forEach(b => {
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
      if (item.windowId) browser.windows.update(item.windowId, { focused: true }).catch(() => {});
    } 
    // 處理 custom-search (直接開連結)
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
        if (targetTabId) browser.tabs.update(targetTabId, { url: item.url });
        else browser.tabs.create({ url: item.url });
      }
    } else if (item.type === "search") {
      browser.search.search({ query: item.query, disposition: openInNewTab ? "NEW_TAB" : "CURRENT_TAB" });
    }
}
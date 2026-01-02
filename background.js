import Fuse from './fuse.esm.js'; // 記得保留這行

let popupWindowId = null;

// [新增] 全域設定變數 (預設值)
let settings = {
  prefixes: {
    tab: "%t",
    bookmark: "%b",
    history: "%h",
    search: "%s"
  }
};

// [新增] 初始化設定並監聽變更
function loadSettings() {
  browser.storage.sync.get(settings).then((res) => {
    if (res.prefixes) settings.prefixes = res.prefixes;
  });
}
loadSettings();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.prefixes) {
    settings.prefixes = changes.prefixes.newValue;
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

  // [修改] 使用 settings 變數進行判斷
  // 注意：這裡假設使用者設定的前綴最後可能帶有空白，我們需要靈活處理
  // 為了簡化，我們假設前綴與關鍵字間有空格
  
  const p = settings.prefixes;

  // 輔助函式：檢查是否以該前綴開頭 (不分大小寫)
  const checkPrefix = (prefix) => queryLower.startsWith(prefix.toLowerCase() + " ");

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

  // --- 書籤與歷史紀錄 (維持原生) ---
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

  if (keyword.length > 0) {
      results.push({ type: "search", title: `Search Web for "${keyword}"`, query: keyword });
  }

  return results;
}

// executeItem 函式維持不變
async function executeItem(item, openInNewTab, sender) {
    if (item.type === "tab") {
      browser.tabs.update(item.id, { active: true });
      if (item.windowId) browser.windows.update(item.windowId, { focused: true }).catch(() => {});
    } else if (item.type === "bookmark" || item.type === "history") {
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
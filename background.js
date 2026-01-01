import Fuse from './fuse.esm.js';

let popupWindowId = null;

const RESTRICTED_PROTOCOLS = [
  "about:",
  "chrome:",
  "edge:",
  "moz-extension:",
  "view-source:"
];

const RESTRICTED_DOMAINS = [
  "addons.mozilla.org"
];

// 監聽快捷鍵指令
browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-spotlight") return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || 
      RESTRICTED_PROTOCOLS.some(p => tab.url.startsWith(p)) || 
      RESTRICTED_DOMAINS.some(d => tab.url.includes(d))) {
    toggleSpotlightWindow();
  } else {
    toggleSpotlightOverlay(tab.id);
  }
});

async function toggleSpotlightOverlay(tabId) {
  try {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    });

    browser.tabs.sendMessage(tabId, { action: "TOGGLE_UI" });
  } catch (err) {
    console.warn("Injection failed, falling back to window:", err);
    toggleSpotlightWindow();
  }
}

async function toggleSpotlightWindow() {
  if (popupWindowId) {
    try {
      await browser.windows.remove(popupWindowId);
    } catch (e) { /* 忽略錯誤 */ }
    popupWindowId = null;
  } else {
    const win = await browser.windows.create({
      url: "spotlight.html",
      type: "popup",
      width: 700,
      height: 600
    });
    popupWindowId = win.id;

    browser.windows.onRemoved.addListener((id) => {
      if (id === popupWindowId) popupWindowId = null;
    });
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
    // 必須 return true 以支援非同步 sendResponse
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

  // 判斷搜尋模式前綴
  if (queryLower.startsWith("%t ")) {
    mode = "tab";
    keyword = rawQuery.substring(3).trim();
  } else if (queryLower.startsWith("%b ")) { 
    mode = "bookmark"; 
    keyword = rawQuery.substring(3).trim(); 
  } else if (queryLower.startsWith("%h ")) { 
    mode = "history"; 
    keyword = rawQuery.substring(3).trim(); 
  } else if (queryLower.startsWith("%s ")) { 
    mode = "search"; 
    keyword = rawQuery.substring(3).trim();
  }

  // --- 分頁搜尋 (Tabs) - 使用 Fuse.js ---
  if (mode === "default" || mode === "tab") {
    const tabs = await browser.tabs.query({});
    
    if (keyword.length === 0) {
        // 如果沒有關鍵字，列出所有分頁
        tabs.forEach(t => {
             results.push({ 
              type: "tab", 
              title: t.title, 
              url: t.url, 
              id: t.id, 
              windowId: t.windowId 
            });
        });
    } else {
        // 設定 Fuse.js 選項
        const options = {
          includeScore: true,
          // 搜尋欄位與權重：標題比網址更重要
          keys: [
            { name: 'title', weight: 0.7 },
            { name: 'url', weight: 0.3 }
          ],
          threshold: 0.4, // 模糊門檻：越低越嚴格 (0.0 完全匹配, 1.0 非常寬鬆)
          ignoreLocation: true // 忽略匹配位置 (不需要從字串開頭開始匹配)
        };

        const fuse = new Fuse(tabs, options);
        const fuseResults = fuse.search(keyword);

        // 將 Fuse 結果轉換回原本的格式
        fuseResults.forEach(res => {
          results.push({
            type: "tab",
            title: res.item.title,
            url: res.item.url,
            id: res.item.id,
            windowId: res.item.windowId
            // 如果未來需要高亮功能，可以使用 res.matches
          });
        });
    }
  }

  // --- 書籤搜尋 (Bookmarks) - 維持原生 API ---
  if (mode === "default" || mode === "bookmark") {
    if (keyword.length > 0) {
      const bookmarks = await browser.bookmarks.search({ query: keyword });

      bookmarks.filter(b => b.url).forEach(b => {
        results.push({ 
          type: "bookmark", 
          title: b.title, 
          url: b.url 
        });
      });
    }
  }
  
  // --- 歷史紀錄搜尋 (History) - 維持原生 API ---
  if (mode === "history") {
     if (keyword.length > 0) {
         const history = await browser.history.search({ 
           text: keyword, 
           maxResults: 15, 
           startTime: 0 
         });
         
         history.forEach(h => {
           results.push({ 
             type: "history", 
             title: h.title || h.url, 
             url: h.url 
           });
         });
     }
  }

  // --- 網頁搜尋 (Web Search) ---
  if (keyword.length > 0) {
      results.push({ 
        type: "search", 
        title: `Search Web for "${keyword}"`, 
        query: keyword 
      });
  }

  return results;
}


async function executeItem(item, openInNewTab, sender) {
  if (item.type === "tab") {
    browser.tabs.update(item.id, { active: true });
    if (item.windowId) {
      browser.windows.update(item.windowId, { focused: true }).catch(() => {});
    }
  } else if (item.type === "bookmark" || item.type === "history") {
    if (openInNewTab) {
      browser.tabs.create({ url: item.url });
    } else {
      let targetTabId = null;
      const isPopupWindow = (popupWindowId && sender.tab && sender.tab.windowId === popupWindowId);

      if (isPopupWindow) {
        // 如果是在 Popup 視窗中點擊，嘗試找一個正常的視窗來開啟
        const wins = await browser.tabs.query({ active: true, windowType: 'normal', lastFocusedWindow: true });
        if (wins.length > 0) {
           targetTabId = wins[0].id;
        } else {
           const anyWins = await browser.tabs.query({ active: true, windowType: 'normal' });
           if (anyWins.length > 0) targetTabId = anyWins[0].id;
        }
      } else {
        // 如果是在 Overlay 中點擊，直接使用當前分頁
        if (sender.tab) targetTabId = sender.tab.id;
      }

      if (targetTabId) {
        browser.tabs.update(targetTabId, { url: item.url });
      } else {
        browser.tabs.create({ url: item.url });
      }
    }
  } else if (item.type === "search") {
    browser.search.search({ 
      query: item.query, 
      disposition: openInNewTab ? "NEW_TAB" : "CURRENT_TAB" 
    });
  }
}
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

// TODO : fuzzy search 
function calculateFuzzyScore(text, query) {
  if (!text || !query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  

  if (t.includes(q)) {
    return 10000 - t.length; 
  }
  
  let score = 0;
  let qIdx = 0; // query index
  let tIdx = 0; // text index
  let prevMatchIdx = -1; // 上一次匹配的位置
  
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      score += 10;
      
      if (prevMatchIdx !== -1 && tIdx === prevMatchIdx + 1) {
        score += 40;
      }
      

      const isWordStart = tIdx === 0 || /[^a-zA-Z0-9]/.test(t[tIdx - 1]);
      if (isWordStart) {
        score += 60;
      }
      
      prevMatchIdx = tIdx;
      qIdx++;
    }
    tIdx++;
  }
  
  return (qIdx === q.length) ? score : 0;
}
// ------------------------------

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
    handleSearch(msg.query).then(results => sendResponse({ results }));
    return true; 
  }
  
  // [修改] 傳入 sender 與 openInNewTab
  if (msg.action === "EXECUTE_ITEM") {
    executeItem(msg.item, msg.openInNewTab, sender);
  }
});


async function handleSearch(rawQuery) {
  const queryLower = rawQuery.toLowerCase();
  
  let results = [];
  let mode = "default"; 
  let keyword = rawQuery.trim(); 

  if (queryLower.startsWith("%b ")) { 
    mode = "bookmark"; 
    keyword = rawQuery.substring(3).trim(); 
  } else if (queryLower.startsWith("%h ")) { 
    mode = "history"; 
    keyword = rawQuery.substring(3).trim(); 
  } else if (queryLower.startsWith("%s ")) { 
    mode = "search"; 
    keyword = rawQuery.substring(3).trim();
  }


  if (mode === "default") {
    const tabs = await browser.tabs.query({});
    
    if (keyword.length === 0) {
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
        const scoredTabs = tabs.map(t => {
            const titleScore = calculateFuzzyScore(t.title, keyword);
            const urlScore = calculateFuzzyScore(t.url, keyword);
            return { 
                tab: t, 
                score: Math.max(titleScore, urlScore) 
            };
        });

        scoredTabs
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .forEach(item => {
                results.push({ 
                  type: "tab", 
                  title: item.tab.title, 
                  url: item.tab.url, 
                  id: item.tab.id, 
                  windowId: item.tab.windowId 
                });
            });
    }
  }
  // ----------------------------------------------

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
  } 
  else if (item.type === "bookmark" || item.type === "history") {
    if (openInNewTab) {
      browser.tabs.create({ url: item.url });
    } else {
      let targetTabId = null;

      const isPopupWindow = (popupWindowId && sender.tab && sender.tab.windowId === popupWindowId);

      if (isPopupWindow) {

        const wins = await browser.tabs.query({ active: true, windowType: 'normal', lastFocusedWindow: true });
        if (wins.length > 0) {
           targetTabId = wins[0].id;
        } else {
           const anyWins = await browser.tabs.query({ active: true, windowType: 'normal' });
           if (anyWins.length > 0) targetTabId = anyWins[0].id;
        }
      } else {
        if (sender.tab) targetTabId = sender.tab.id;
      }

      if (targetTabId) {
        browser.tabs.update(targetTabId, { url: item.url });
      } else {
        browser.tabs.create({ url: item.url });
      }
    }
  } 
  
  else if (item.type === "search") {
    browser.search.search({ 
      query: item.query, 
      disposition: openInNewTab ? "NEW_TAB" : "CURRENT_TAB" 
    });
  }
}
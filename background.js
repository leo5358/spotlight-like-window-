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
    } catch (e) { /* 忽略錯誤 (視窗可能已被手動關閉) */ }
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
  
  if (msg.action === "EXECUTE_ITEM") {
    executeItem(msg.item);
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
    const q = keyword.toLowerCase();
    
    tabs.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)) {
        results.push({ 
          type: "tab", 
          title: t.title, 
          url: t.url, 
          id: t.id, 
          windowId: t.windowId 
        });
      }
    });
  }

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


function executeItem(item) {
  if (item.type === "tab") {
    browser.tabs.update(item.id, { active: true });
    if (item.windowId) {
      browser.windows.update(item.windowId, { focused: true }).catch(() => {});
    }
  } else if (item.type === "bookmark" || item.type === "history") {
    browser.tabs.create({ url: item.url });
  } else if (item.type === "search") {
    browser.search.search({ query: item.query, disposition: "NEW_TAB" });
  }
}
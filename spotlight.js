const input = document.querySelector("#input");
const results = document.querySelector("#results");


let cache = {
  tabs: [],
  bookmarks: []
};

let currentList = [];
let selectedIndex = 0;


async function initData() {
  const [tabs, bookmarks] = await Promise.all([
    browser.tabs.query({}),
    browser.bookmarks.search({})
  ]);

  cache.tabs = tabs;
  cache.bookmarks = bookmarks.filter(b => b.url); 
  
  handleInput();
}


async function handleInput() {
  const rawInput = input.value;
  const lowerInput = rawInput.toLowerCase().trim();
  
  
  let prefix = "";
  let query = rawInput;

  if (lowerInput.startsWith("%")) {

    const spaceIndex = lowerInput.indexOf(" ");
    if (spaceIndex !== -1) {
      prefix = lowerInput.substring(1, spaceIndex); 
      query = rawInput.substring(spaceIndex + 1);   
    } else {
     
      prefix = lowerInput.substring(1);
      query = "";
    }
  }


  currentList = [];
  

  if (query.length === 0 && prefix.length > 0 && !rawInput.includes(" ")) {
     showModeHint(prefix);
     return;
  }

  switch (prefix) {
    case "b": // Bookmarks
      searchBookmarks(query);
      break;
    case "h": // History
      await searchHistory(query);
      break;
    case "s": // Web Search
      searchWeb(query);
      break;
    default:  // Default (Tabs + Fallback)
      searchTabs(query);
      break;
  }

  renderList();
}

// search functions

// search bookmarks
function searchBookmarks(query) {
  const q = query.toLowerCase();
  const matched = cache.bookmarks.filter(b => 
    b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
  );
  
  matched.slice(0, 10).forEach(b => {
    currentList.push({ type: "bookmark", title: b.title, url: b.url });
  });
}

// serach history 
async function searchHistory(query) {
  if (!query) return; 

  const historyItems = await browser.history.search({
    text: query,
    maxResults: 10,
    startTime: 0 
  });

  historyItems.forEach(h => {
    currentList.push({ type: "history", title: h.title || h.url, url: h.url });
  });
}

// search web 
function searchWeb(query) {
  if (!query) return;
  currentList.push({ 
    type: "search", 
    title: `🔍 Search Web for: "${query}"`, 
    query: query 
  });
}

// default: serach  web + tabs
function searchTabs(query) {
  const q = query.toLowerCase();
  
  // 1. 找分頁
  const matchedTabs = cache.tabs.filter(t => 
    t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
  );

  matchedTabs.slice(0, 5).forEach(t => {
    currentList.push({ type: "tab", title: t.title, id: t.id, url: t.url });
  });


  if (query.length > 0) {
    currentList.push({ 
      type: "search", 
      title: `Search Web for: "${query}"`, 
      query: query 
    });
  }
}

// render

function showModeHint(prefix) {
  results.innerHTML = "";
  const modes = {
    "b": "Search Bookmarks",
    "h": "Search History",
    "s": "Web Search"
  };
  
  const text = modes[prefix] ? `Enter Space to ${modes[prefix]}...` : "Unknown Mode";
  const li = document.createElement("li");
  li.textContent = text;
  li.style.color = "#aaa";
  li.style.fontStyle = "italic";
  results.appendChild(li);
}

function renderList() {
  results.innerHTML = "";
  selectedIndex = 0;

  if (currentList.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No results found.";
    li.style.color = "#666";
    results.appendChild(li);
    return;
  }

  currentList.forEach((item, i) => {
    const li = document.createElement("li");
    
    //prefixing
    let prefixTag = "";
    if (item.type === "tab") prefixTag = "[Tab] ";
    else if (item.type === "bookmark") prefixTag = "[Book] ";
    else if (item.type === "history") prefixTag = "[Hist] ";
    
    li.textContent = prefixTag + item.title;
    
    if (i === selectedIndex) li.classList.add("active");
    
    li.addEventListener("click", () => executeItem(item));
    results.appendChild(li);
  });
}


//execute
function executeItem(item) {
  if (item.type === "tab") {
    browser.tabs.update(item.id, { active: true });
  } else if (item.type === "bookmark" || item.type === "history") {
    browser.tabs.create({ url: item.url });
  } else if (item.type === "search") {
    browser.search.search({ query: item.query, disposition: "NEW_TAB" });
  }
  window.close();
}


//event listeners
input.addEventListener("input", handleInput);

document.addEventListener("keydown", (e) => {
  const items = results.querySelectorAll("li");
  if (currentList.length === 0) {
    if (e.key === "Escape") window.close();
    return;
  }

  if (e.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % currentList.length;
    updateSelection(items);
  } else if (e.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + currentList.length) % currentList.length;
    updateSelection(items);
  } else if (e.key === "Enter") {
    executeItem(currentList[selectedIndex]);
  } else if (e.key === "Escape") {
    window.close();
  }
});

function updateSelection(items) {
  items.forEach((item, i) => {
    if (i === selectedIndex) item.classList.add("active");
    else item.classList.remove("active");
  });
}


initData();
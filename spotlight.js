const input = document.querySelector("#input");
const results = document.querySelector("#results");
const modeBadge = document.querySelector("#mode-badge"); 

let currentList = [];
let selectedIndex = 0;

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}


const handleInput = debounce(async () => {
  const query = input.value;
  selectedIndex = 0;
  
  updateModeBadge(query);

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

input.addEventListener("input", handleInput);


function updateModeBadge(rawQuery) {
  const q = rawQuery.toLowerCase();
  
  modeBadge.className = "";
  modeBadge.textContent = "";

  // [修改] 增加 Tab Mode 判斷
  if (q.startsWith("%t ")) {
    modeBadge.textContent = "Tab Mode";
    modeBadge.classList.add("show", "mode-tab");
  } else if (q.startsWith("%b ")) {
    modeBadge.textContent = "Bookmark Mode";
    modeBadge.classList.add("show", "mode-bookmark");
  } else if (q.startsWith("%h ")) {
    modeBadge.textContent = "History Mode";
    modeBadge.classList.add("show", "mode-history");
  } else if (q.startsWith("%s ")) {
    modeBadge.textContent = "Web Search";
    modeBadge.classList.add("show", "mode-search");
  }
}

function renderList(list) {
  results.innerHTML = "";
  if (list.length === 0) return;

  list.forEach((item, i) => {
    const li = document.createElement("li");
    
    const tag = document.createElement("span");
    tag.className = "tag";
    if (item.type === "tab") { tag.textContent = "TAB"; tag.classList.add("tag-tab"); }
    else if (item.type === "bookmark") { tag.textContent = "BMK"; tag.classList.add("tag-book"); }
    else if (item.type === "history") { tag.textContent = "HIS"; tag.classList.add("tag-hist"); }
    else if (item.type === "search") { tag.textContent = "WEB"; tag.classList.add("tag-search"); }
    
    const text = document.createElement("span");
    text.textContent = item.title;
    
    li.appendChild(tag);
    li.appendChild(text);

    li.addEventListener("click", (e) => triggerExecute(item, e.shiftKey));
    if (i === selectedIndex) li.classList.add("active");
    
    results.appendChild(li);
  });
}

function triggerExecute(item, openInNewTab = false) {
  browser.runtime.sendMessage({ 
    action: "EXECUTE_ITEM", 
    item: item,
    openInNewTab: openInNewTab 
  });
  closeSpotlight();
}

function closeSpotlight() {
  browser.runtime.sendMessage({ action: "REQUEST_CLOSE" });
  window.close();
}

document.addEventListener("keydown", (e) => {
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

input.focus();